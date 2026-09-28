const TABLES = new Set(["preco_configuracao", "preco_bateria", "preco_backup"]);

async function getAdminPrices() {
  const [gammas, configs, configPrices, batteries, batteryPrices, backups, backupPrices] = await Promise.all([
    query("gama", "select=id,nome&order=id"),
    query("configuracao", "select=id,num_paineis,id_tipo_luz,inversor&order=num_paineis"),
    query("preco_configuracao", "select=id,preco,id_configuracao,id_gama&order=id"),
    query("bateria", "select=id,potencia&order=potencia"),
    query("preco_bateria", "select=id,preco,id_bateria,id_gama&order=id"),
    query("backup", "select=id,potencia&order=potencia"),
    query("preco_backup", "select=id,preco,id_backup,id_gama&order=id")
  ]);

  const gamaById = new Map(gammas.map((row) => [Number(row.id), row.nome]));
  const configById = new Map(configs.map((row) => [Number(row.id), row]));
  const batteryById = new Map(batteries.map((row) => [Number(row.id), row]));
  const backupById = new Map(backups.map((row) => [Number(row.id), row]));

  return [
    ...configPrices.map((row) => ({ id: row.id, table: "preco_configuracao", category: "Painéis / configuração", label: configLabel(configById.get(Number(row.id_configuracao))), gama: gamaById.get(Number(row.id_gama)) || row.id_gama, price: Number(row.preco || 0) })),
    ...batteryPrices.map((row) => ({ id: row.id, table: "preco_bateria", category: "Bateria", label: `${batteryById.get(Number(row.id_bateria))?.potencia ?? row.id_bateria} kWh`, gama: gamaById.get(Number(row.id_gama)) || row.id_gama, price: Number(row.preco || 0) })),
    ...backupPrices.map((row) => ({ id: row.id, table: "preco_backup", category: "Backup", label: `${backupById.get(Number(row.id_backup))?.potencia ?? row.id_backup} kW`, gama: gamaById.get(Number(row.id_gama)) || row.id_gama, price: Number(row.preco || 0) }))
  ];
}

async function updateAdminPrice(table, id, price) {
  if (!TABLES.has(table)) throw new Error("Tabela de preços inválida.");
  const numericId = Number(id);
  const numericPrice = Number(price);
  if (!Number.isInteger(numericId) || !Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("Preço inválido.");
  }
  await request(table, `id=eq.${encodeURIComponent(numericId)}`, "PATCH", { preco: numericPrice });
}

function configLabel(row) {
  if (!row) return "Configuração";
  const phase = Number(row.id_tipo_luz) === 2 ? "Trifásico" : "Monofásico";
  return `${row.num_paineis} painéis · ${phase}`;
}

async function query(table, search) {
  return request(table, search, "GET");
}

async function request(table, search, method, body) {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  const response = await fetch(`${url}/rest/v1/${table}?${search}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  if (method === "GET") return response.json();
}

module.exports = { getAdminPrices, updateAdminPrice };
