class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

async function saveSimulation(quote) {
  const supabaseUrl = removeTrailingSlash(process.env.SUPABASE_URL || "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ConfigurationError("Supabase nao configurado. Define SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  const clientNif = String(quote.clientNif || "").trim();
  const clienteId = await findClienteId(supabaseUrl, serviceRoleKey, clientNif);
  const questionnaire = quote.questionnaire || null;
  const roof = quote.roof || null;

  const simulation = {
    id_cliente: clienteId,
    nif: clientNif,
    nome: quote.clientName || null,
    email: quote.clientEmail || null,
    num_tele: quote.clientPhone || null,
    morada: quote.addressSummary || null,
    latitude: numberOrNull(quote.latitude),
    longitude: numberOrNull(quote.longitude),
    area_telhado: decimal(roof, "areaSqm"),
    tipo_telhado: text(questionnaire, "roofType"),
    tipo_imovel: text(questionnaire, "propertyType"),
    consumo_mensal: decimal(questionnaire, "monthlyKwhEstimate"),
    potencia_solar: decimal(questionnaire, "panelsFitKwp"),
    potencia_contratada: decimal(questionnaire, "powerTerm"),
    quant_paineis: integer(questionnaire, "panelsNeeded"),
    bateria: bool(questionnaire, "hasBattery"),
    dados_questeonario: questionnaire
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/pedido_solar`, {
    method: "POST",
    headers: baseHeaders(serviceRoleKey, {
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify(simulation)
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel guardar a simulacao no Supabase: ${await response.text()}`);
  }
}

async function findClienteId(supabaseUrl, serviceRoleKey, nif) {
  const encodedNif = encodeURIComponent(String(nif || "").trim());
  const response = await fetch(`${supabaseUrl}/rest/v1/cliente?nif=eq.${encodedNif}&select=id&limit=1`, {
    headers: baseHeaders(serviceRoleKey)
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel procurar o cliente no Supabase: ${await response.text()}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0 || rows[0].id == null) {
    return null;
  }
  return rows[0].id;
}

function baseHeaders(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "User-Agent": "macwatts-server-node/1.0",
    ...extra
  };
}

function removeTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function text(node, field) {
  return node && node[field] != null ? String(node[field]) : null;
}

function decimal(node, field) {
  const value = node && node[field];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(node, field) {
  const value = node && node[field];
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function bool(node, field) {
  const value = node && node[field];
  return typeof value === "boolean" ? value : null;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { saveSimulation };
