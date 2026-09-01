const { sendQuoteEmail } = require("./services/quoteEmailService");
const { saveSimulation } = require("./services/supabaseSimulationService");

const LAMBDA_VERSION = "lambda-direct-v2";

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
    return response(204, "");
  }

  if (method === "GET" && (path === "/" || path === "/healthz")) {
    return response(200, `ok ${LAMBDA_VERSION}`);
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
    await saveSimulation(request);
    const sent = await sendQuoteEmail(request);
    return response(200, sent
      ? "Email enviado com sucesso para a empresa."
      : "SMTP nao configurado: fluxo concluido em modo teste.");
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
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Content-Type": "text/plain; charset=utf-8"
    },
    body
  };
}

function rootMessage(error) {
  let current = error;
  while (current && current.cause) {
    current = current.cause;
  }
  return (current && current.message) || error.message || "erro desconhecido";
}
