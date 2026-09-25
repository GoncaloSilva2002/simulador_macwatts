class ConfigurationError extends Error {
  constructor(message) { super(message); this.name = "ConfigurationError"; }
}

async function getPrices() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = publicKey();
  const table = String(process.env.SUPABASE_PRICES_TABLE || "precos").trim();
  if (!url || !key) throw new ConfigurationError("Supabase nao configurado para carregar os precos.");
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Nao foi possivel carregar os precos no Supabase: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(normalizePrice).filter((item) => item.name && (Number.isFinite(item.price) || item.inverter)) : [];
}

function normalizePrice(row) {
  const name = row.nome ?? row.name ?? row.gama ?? row.designacao ?? row.descricao;
  const rawPrice = row.preco ?? row.price ?? row.valor ?? row.amount;
  const price = Number(String(rawPrice ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  const inverter = row.inversor ?? row.inverter ?? row.modelo_inversor ?? row.modeloInversor;
  return { name: name == null ? "" : String(name).trim(), price, inverter: inverter == null ? "" : String(inverter).trim() };
}

async function getInverter(panels) {
  const panelCount = Number(panels);
  const filter = Number.isInteger(panelCount) && panelCount > 0 ? `&num_paineis=eq.${panelCount}` : "";
  const rows = await query("configuracao", `select=inversor&order=num_paineis.asc&limit=1${filter}`);
  const value = rows[0]?.inversor;
  return value == null ? "" : `${Number(value).toFixed(2)} kW`;
}

async function getQuotePricing({ panels, batteryKwh = 0, backupKw = 0, lightType = "Monofásico", gama = "Standard" }) {
  const panelCount = Number(panels);
  if (!Number.isInteger(panelCount) || panelCount <= 0) return null;
  const batteryCapacity = Number(batteryKwh) || 0;
  const backupPower = Number(backupKw) || 0;
  const [configs, gamas, batteries, batteryPrices, backups, backupPrices] = await Promise.all([
    query("configuracao", "select=*&num_paineis=eq." + encodeURIComponent(panelCount)),
    query("gama", "select=*"),
    query("bateria", "select=*&potencia=eq." + encodeURIComponent(batteryCapacity)),
    query("preco_bateria", "select=*&id_gama=eq." + await relatedId("gama", gama)),
    query("backup", "select=*&potencia=eq." + encodeURIComponent(backupPower)),
    query("preco_backup", "select=*&id_gama=eq." + await relatedId("gama", gama))
  ]);
  const config = configs.find((item) => Number(item.id_tipo_luz) === (String(lightType).toLowerCase().includes("tri") ? 2 : 1)) || configs[0];
  const gamaRow = gamas.find((item) => normalizeName(item.nome) === normalizeName(gama));
  if (!config || !gamaRow) return null;
  const configPrice = await query("preco_configuracao", `select=*&id_configuracao=eq.${config.id}&id_gama=eq.${gamaRow.id}`);
  const battery = batteries[0];
  const backup = backups[0];
  const batteryPrice = battery ? batteryPrices.find((item) => Number(item.id_bateria) === Number(battery.id)) : null;
  const backupPrice = backup ? backupPrices.find((item) => Number(item.id_backup) === Number(backup.id)) : null;
  return {
    gama: gamaRow.nome,
    basePrice: Number(configPrice[0]?.preco || 0) + Number(batteryPrice?.preco || 0) + Number(backupPrice?.preco || 0),
    inverter: config.inversor == null ? "" : `${Number(config.inversor).toFixed(2)} kW`,
    panels: Number(config.num_paineis),
    batteryPrice: Number(batteryPrice?.preco || 0),
    backupPrice: Number(backupPrice?.preco || 0)
  };
}

async function relatedId(table, name) {
  const rows = await query(table, "select=id,nome");
  return rows.find((item) => normalizeName(item.nome) === normalizeName(name))?.id || 0;
}

function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

async function getRawRows() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = publicKey();
  const table = String(process.env.SUPABASE_PRICES_TABLE || "precos").trim();
  if (!url || !key) throw new ConfigurationError("Supabase nao configurado para carregar os precos.");
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Nao foi possivel carregar os precos no Supabase: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function query(table, queryString) {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = publicKey();
  if (!url || !key) throw new ConfigurationError("Supabase nao configurado para carregar os precos.");
  const response = await fetch(`${url}/rest/v1/${table}?${queryString}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Nao foi possivel consultar ${table} no Supabase: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function publicKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
}

module.exports = { getPrices, getInverter, getQuotePricing };
