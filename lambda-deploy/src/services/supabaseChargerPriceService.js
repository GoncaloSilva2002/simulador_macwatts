const TABLE = "precos_carregadores";
const PUBLIC_QUERY = "select=id,codigo,secao,nome,equipamento,ligacao,gestao,potencia,preco_sem_iva,ordem,ativo&ativo=eq.true&order=ordem.asc,codigo.asc";
const ADMIN_QUERY = "select=id,codigo,secao,nome,equipamento,ligacao,gestao,potencia,preco_sem_iva,ordem,ativo&order=ordem.asc,codigo.asc";

async function getChargerPrices() {
  return request(PUBLIC_QUERY, "GET");
}

async function getAdminChargerPrices() {
  const rows = await request(ADMIN_QUERY, "GET");
  return rows.map((row) => ({
    id: row.id,
    table: TABLE,
    category: "Carregadores",
    label: row.nome || row.codigo,
    gama: sectionLabel(row.secao),
    price: Number(row.preco_sem_iva || 0),
    chargerCode: row.codigo,
    active: row.ativo !== false
  }));
}

async function updateChargerPrice(id, price) {
  const numericId = Number(id);
  const numericPrice = Number(price);
  if (!Number.isInteger(numericId) || !Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("Preço de carregador inválido.");
  }
  await request(`id=eq.${encodeURIComponent(numericId)}`, "PATCH", { preco_sem_iva: numericPrice });
}

function sectionLabel(section) {
  return {
    monofasico: "Monofásicos",
    trifasico: "Trifásicos",
    instalacao: "Instalação",
    portatil: "Portátil"
  }[section] || section || "Carregadores";
}

async function request(search, method, body) {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  const response = await fetch(`${url}/rest/v1/${TABLE}?${search}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  if (method === "GET") return response.json();
}

module.exports = { getChargerPrices, getAdminChargerPrices, updateChargerPrice };
