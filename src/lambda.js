const { sendQuoteEmail } = require("./services/quoteEmailService");
const { saveSimulation } = require("./services/supabaseSimulationService");
const { getAdminPrices, updateAdminPrice, updateAdminInverter } = require("./services/supabaseAdminPriceService");
const { getAdminProposals, getAdminProposal, saveAdminProposal } = require("./services/supabaseProposalService");
const { getChargerPrices, getAdminChargerPrices, updateChargerPrice } = require("./services/supabaseChargerPriceService");
const { getFlyerData } = require("./services/flyerService");
const { renderQuoteHtml } = require("./services/quotePdfService");

const LAMBDA_VERSION = "lambda-direct-v4";

exports.handler = async (event) => {
  try {
    return await handle(event || {});
  } catch (error) {
    console.error("Erro fatal na Lambda:", error);
    return response(500, `Falha fatal na Lambda (${LAMBDA_VERSION}): ${rootMessage(error)}`);
  }
};

async function handle(event) {
  const method = event.requestContext && event.requestContext.http
    ? event.requestContext.http.method
    : event.httpMethod;
  const path = event.rawPath || event.path || "/";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Password"
      },
      body: ""
    };
  }

  if (method === "GET" && (path === "/" || path === "/healthz")) {
    return response(200, `ok ${LAMBDA_VERSION}`);
  }

  if (path === "/api/admin/prices" && method !== "POST" && !isAdminPriceRequest(event)) {
    return response(401, "Não autorizado.");
  }
  if (method === "GET" && path === "/api/admin/prices") {
    return jsonResponse(200, await getAdminPrices());
  }

  if (method === "GET" && path === "/api/flyer") {
    return jsonResponse(200, await getFlyerData());
  }
  if (method === "GET" && path === "/api/charger-prices") {
    return jsonResponse(200, await getChargerPrices());
  }
  if (method === "PATCH" && path === "/api/admin/prices") {
    const request = parseBody(event);
    await updateAdminPrice(request.table, request.id, request.price);
    return jsonResponse(200, { ok: true });
  }
  if (method === "POST" && path === "/api/admin/prices") {
    const request = parseBody(event);
    if (!process.env.ADMIN_PRICES_PASSWORD || request.password !== process.env.ADMIN_PRICES_PASSWORD) return response(401, "Não autorizado.");
    if (request.action === "list") return jsonResponse(200, await getAdminPrices());
    if (request.field === "inverter") { await updateAdminInverter(request.id, request.value); return jsonResponse(200, { ok: true }); }
    await updateAdminPrice(request.table, request.id, request.price);
    return jsonResponse(200, { ok: true });
  }
  if (method === "POST" && path === "/api/admin/charger-prices") {
    const request = parseBody(event);
    if (!process.env.ADMIN_PRICES_PASSWORD || request.password !== process.env.ADMIN_PRICES_PASSWORD) return response(401, "Não autorizado.");
    if (request.action === "list") return jsonResponse(200, await getAdminChargerPrices());
    await updateChargerPrice(request.id, request.price);
    return jsonResponse(200, { ok: true });
  }

  if (method === "POST" && path === "/api/admin/proposals") {
    const request = parseBody(event);
    if (!process.env.ADMIN_PRICES_PASSWORD || request.password !== process.env.ADMIN_PRICES_PASSWORD) return response(401, "Não autorizado.");
    if (request.action === "list") return jsonResponse(200, await getAdminProposals());
    if (request.action === "get") return jsonResponse(200, await getAdminProposal(request.id));
    if (request.action === "save") return jsonResponse(200, await saveAdminProposal(request.proposal || {}));
    return response(400, "Ação de proposta inválida.");
  }

  if (method === "POST" && path === "/api/quote/html") {
    const request = parseBody(event);
    return htmlResponse(200, await renderQuoteHtml(request));
  }

  if (method !== "POST" || !path.endsWith("/api/quote/email")) {
    return response(404, "Not Found");
  }

  let request;
  try {
    request = parseBody(event);
  } catch (error) {
    return response(400, "JSON invalido no pedido.");
  }

  const clientName = String(request.clientName || "").trim();
  const clientEmail = String(request.clientEmail || "").trim();
  const clientNif = String(request.clientNif || "").trim();

  if (!clientName || !clientEmail) {
    return response(400, "Campos obrigatorios: clientName, clientEmail.");
  }
  if (!clientNif) {
    return response(400, "Campo obrigatorio: clientNif.");
  }
  if (!/^\d{9}$/.test(clientNif)) {
    return response(400, "Campo invalido: clientNif deve ter 9 digitos.");
  }

  request.clientName = clientName;
  request.clientEmail = clientEmail;
  request.clientNif = clientNif;

  try {
    try {
      await saveSimulation(request);
    } catch (error) {
      // Temporariamente ignoramos falhas de persistência enquanto a tabela
      // cliente não estiver disponível no Supabase. O envio da proposta deve
      // continuar a funcionar independentemente da gravação.
      console.warn("Simulação não guardada no Supabase:", rootMessage(error));
    }
    let savedProposal = null;
    try {
      savedProposal = await saveAdminProposal(request);
    } catch (error) {
      console.warn("Proposta nÃ£o guardada no Supabase:", rootMessage(error));
    }
    const sent = await sendQuoteEmailBestEffort(request);
    if (sent && savedProposal?.id) {
      try {
        await saveAdminProposal({ ...request, id: savedProposal.id, status: "enviada" });
      } catch (error) {
        console.warn("Estado da proposta nao atualizado para enviada:", rootMessage(error));
      }
    }
    return response(200, sent
      ? "Pedido processado e email enviado com sucesso para a empresa."
      : "Pedido processado. O email para a empresa nao foi enviado.");
  } catch (error) {
    const message = rootMessage(error);
    if (error.name === "ValidationError" || error.name === "ConfigurationError") {
      console.warn("Pedido de orcamento rejeitado:", message);
      return response(400, message);
    }
    console.error("Falha inesperada ao processar o pedido de orcamento:", error);
    return response(500, `Falha no processamento: ${message}`);
  }
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Password",
      "Content-Type": "text/plain; charset=utf-8"
    },
    body
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Password", "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function htmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Password",
      "Content-Type": "text/html; charset=utf-8"
    },
    body
  };
}

function isAdminPriceRequest(event) {
  const headers = event.headers || {};
  const supplied = headers["x-admin-password"] || headers["X-Admin-Password"] || "";
  return Boolean(process.env.ADMIN_PRICES_PASSWORD && supplied === process.env.ADMIN_PRICES_PASSWORD);
}

function rootMessage(error) {
  let current = error;
  while (current && current.cause) {
    current = current.cause;
  }
  return (current && current.message) || error.message || "erro desconhecido";
}

async function sendQuoteEmailBestEffort(request) {
  try {
    return await sendQuoteEmail(request);
  } catch (error) {
    console.warn("Pedido guardado, mas falhou o envio do email para a empresa:", rootMessage(error));
    return false;
  }
}
