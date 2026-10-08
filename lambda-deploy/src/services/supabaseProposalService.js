const ALLOWED_PANELS = [2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 26];
const ALLOWED_BATTERIES = [0, 5, 10, 15, 20, 25];
const PANEL_KWP = 0.53;

async function getAdminProposals() {
  const rows = await request(
    "propostas",
    "select=id,cliente_nome,cliente_email,morada,tipo_fase,gama,num_paineis,potencia_kwp,bateria_kwh,preco_manual,modo_preco,estado,created_at,updated_at&order=updated_at.desc"
  );
  return rows.map(toSummary);
}

async function getAdminProposal(id) {
  const numericId = validId(id);
  const rows = await request(
    "propostas",
    `select=*&id=eq.${encodeURIComponent(numericId)}&limit=1`
  );
  if (!rows[0]) throw new Error("Proposta não encontrada.");
  return toProposal(rows[0]);
}

async function saveAdminProposal(input) {
  const normalized = normalizeProposal(input || {});
  const id = input && input.id != null && input.id !== "" ? validId(input.id) : null;
  let rows;

  if (id) {
    rows = await request(
      "propostas",
      `id=eq.${encodeURIComponent(id)}`,
      "PATCH",
      normalized,
      "return=representation"
    );
    if (!Array.isArray(rows) || !rows[0]) throw new Error("Proposta não encontrada.");
  } else {
    rows = await request("propostas", "", "POST", normalized, "return=representation");
  }

  if (Array.isArray(rows) && rows[0]) return toProposal(rows[0]);
  return getAdminProposal(id || await findLastProposalId(normalized.cliente_nome));
}

async function markAdminProposalSent(id) {
  const numericId = validId(id);
  const rows = await request(
    "propostas",
    `id=eq.${encodeURIComponent(numericId)}`,
    "PATCH",
    { estado: "enviada" },
    "return=representation"
  );
  if (!Array.isArray(rows) || !rows[0]) throw new Error("Proposta não encontrada para atualizar o estado.");
  return toProposal(rows[0]);
}

function normalizeProposal(input) {
  const source = input.request || input.quoteRequest || input;
  const sourceQuestionnaire = source.questionnaire || input.questionnaire || {};
  const panels = Number(input.panelsNeeded ?? sourceQuestionnaire.panelsNeeded);
  const battery = Number(input.batteryCapacityKwh ?? sourceQuestionnaire.batteryCapacityKwh ?? 0);

  if (!ALLOWED_PANELS.includes(panels)) {
    throw new Error(`Quantidade de painéis inválida. Valores permitidos: ${ALLOWED_PANELS.join(", ")}.`);
  }
  if (!ALLOWED_BATTERIES.includes(battery)) {
    throw new Error(`Capacidade de bateria inválida. Valores permitidos: ${ALLOWED_BATTERIES.join(", ")} kWh.`);
  }

  const clientName = String(input.clientName ?? source.clientName ?? "").trim();
  if (!clientName) throw new Error("O nome do cliente é obrigatório.");

  const phaseType = normalizePhase(input.phaseType ?? sourceQuestionnaire.phaseType);
  const gama = String(input.gama ?? sourceQuestionnaire.gama ?? "Base").trim() || "Base";
  const priceMode = input.priceMode === "manual" ? "manual" : "automatico";
  const manualPrice = input.manualPrice == null || input.manualPrice === "" ? null : numberOrNull(input.manualPrice);
  if (priceMode === "manual" && manualPrice == null) throw new Error("Indica o preço manual da proposta.");
  const panelsFitKwp = Number((panels * PANEL_KWP).toFixed(2));
  const requestData = sanitizeRequest({
    ...source,
    clientName,
    clientEmail: String(input.clientEmail ?? source.clientEmail ?? "").trim(),
    clientPhone: String(input.clientPhone ?? source.clientPhone ?? "").trim(),
    clientNif: String(input.clientNif ?? source.clientNif ?? "").replace(/\D/g, ""),
    addressSummary: String(input.addressSummary ?? source.addressSummary ?? input.morada ?? "").trim(),
    questionnaire: {
      ...sourceQuestionnaire,
      panelsNeeded: panels,
      panelsFitKwp,
      panelPowerKw: PANEL_KWP,
      hasBattery: battery > 0,
      batteryCapacityKwh: battery,
      phaseType,
      gama,
      priceMode,
      manualPrice
    }
  });

  return {
    cliente_nome: clientName,
    cliente_email: requestData.clientEmail || null,
    cliente_telemovel: requestData.clientPhone || null,
    cliente_nif: requestData.clientNif || null,
    morada: requestData.addressSummary || null,
    tipo_fase: phaseType,
    gama,
    num_paineis: panels,
    potencia_kwp: panelsFitKwp,
    bateria_kwh: battery,
    preco_manual: manualPrice,
    modo_preco: priceMode,
    estado: normalizeStatus(input.status),
    dados: { request: requestData }
  };
}

function toSummary(row) {
  return {
    id: row.id,
    clientName: row.cliente_nome,
    clientEmail: row.cliente_email || "",
    addressSummary: row.morada || "",
    phaseType: row.tipo_fase,
    gama: row.gama,
    panelsNeeded: Number(row.num_paineis),
    panelsFitKwp: Number(row.potencia_kwp),
    batteryCapacityKwh: Number(row.bateria_kwh),
    manualPrice: row.preco_manual == null ? null : Number(row.preco_manual),
    priceMode: row.modo_preco,
    status: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toProposal(row) {
  const storedRequest = row.dados && row.dados.request ? row.dados.request : {};
  return {
    ...toSummary(row),
    clientPhone: row.cliente_telemovel || storedRequest.clientPhone || "",
    clientNif: row.cliente_nif || storedRequest.clientNif || "",
    request: {
      ...storedRequest,
      clientName: row.cliente_nome,
      clientEmail: row.cliente_email || storedRequest.clientEmail || "",
      clientPhone: row.cliente_telemovel || storedRequest.clientPhone || "",
      clientNif: row.cliente_nif || storedRequest.clientNif || "",
      addressSummary: row.morada || storedRequest.addressSummary || "",
      questionnaire: {
        ...(storedRequest.questionnaire || {}),
        panelsNeeded: Number(row.num_paineis),
        panelsFitKwp: Number(row.potencia_kwp),
        hasBattery: Number(row.bateria_kwh) > 0,
        batteryCapacityKwh: Number(row.bateria_kwh),
        phaseType: row.tipo_fase,
        gama: row.gama
      }
    }
  };
}

function normalizePhase(value) {
  const normalized = String(value || "Monofásico").toLocaleLowerCase();
  return normalized.includes("tri") ? "Trifásico" : "Monofásico";
}

function normalizeStatus(value) {
  const status = String(value || "rascunho").toLocaleLowerCase();
  return ["rascunho", "enviada", "aceite", "arquivada"].includes(status) ? status : "rascunho";
}

function sanitizeRequest(request) {
  const copy = JSON.parse(JSON.stringify(request || {}));
  const removableKeys = [
    "invoiceAttachmentBase64",
    "invoiceAttachmentBase64Alt",
    "mapSnapshotBase64",
    "roofImageBase64"
  ];
  removableKeys.forEach((key) => delete copy[key]);
  if (copy.questionnaire) removableKeys.forEach((key) => delete copy.questionnaire[key]);
  return copy;
}

function validId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Identificador de proposta inválido.");
  return id;
}

function numberOrNull(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error("Preço manual inválido.");
  return number;
}

async function findLastProposalId(clientName) {
  const rows = await request("propostas", `select=id&cliente_nome=eq.${encodeURIComponent(clientName)}&order=created_at.desc&limit=1`);
  if (!rows[0]) throw new Error("A proposta foi guardada, mas não foi possível recuperá-la.");
  return rows[0].id;
}

async function request(table, search = "", method = "GET", body, prefer = "return=minimal") {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  const response = await fetch(`${url}/rest/v1/${table}${search ? `?${search}` : ""}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  if (method === "GET" || prefer.includes("representation")) return response.json();
  return [];
}

module.exports = { getAdminProposals, getAdminProposal, saveAdminProposal, markAdminProposalSent, normalizeProposal };
