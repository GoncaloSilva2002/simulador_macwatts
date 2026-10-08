const template = require("../../public/flyer/flyer-data.example.json");
const { getAdminPrices } = require("./supabaseAdminPriceService");
const PANEL_ROWS = [2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 26];
const BATTERY_BY_PANELS = { 2: 0, 4: 5, 6: 5, 8: 5, 10: 10, 12: 10, 14: 15, 16: 15, 20: 20, 22: 20, 26: 25 };
async function getFlyerData() { const data = JSON.parse(JSON.stringify(template)); const rows = await getAdminPrices(); for (const product of data.products) { const gama = product.title.replace(/^Gama\s+/i, "").trim(); if (rows.some((row) => row.gama === gama)) product.rows = PANEL_ROWS.map((panels) => buildPanelRow(panels, gama, rows)); } return data; }
function buildPanelRow(panels, gama, rows) { const batteryKwh = batteryKwhForPanels(panels); return [String(panels), formatKwp(panels), batteryKwh ? String(batteryKwh) : "--", ...phasePrices(panels, gama, "Monofásico", rows), ...phasePrices(panels, gama, "Trifásico", rows)]; }
function phasePrices(panels, gama, phase, rows) { if ((phase === "Monofásico" && panels > 20) || (phase === "Trifásico" && panels < 4)) return ["--", "--", "--"]; const config = rows.find((row) => row.category.includes("Pain") && row.gama === gama && row.label.startsWith(`${panels} pain`) && row.label.includes(phase)); const batteryKwh = batteryKwhForPanels(panels); const battery = rows.find((row) => row.category === "Bateria" && row.gama === gama && row.label.startsWith(`${batteryKwh} kWh`)); const backup = rows.find((row) => row.category === "Backup" && row.gama === gama && row.panels === panels && row.phase === phase); const noExtras = panels === 2 || (phase === "Trifásico" && panels === 4); return [formatPrice(config?.price), noExtras ? "--" : formatPrice(battery?.price), noExtras ? "--" : formatPrice(backup?.price)]; }
function batteryKwhForPanels(panels) { return BATTERY_BY_PANELS[panels] || 0; }
function formatKwp(panels) { return String((panels * 0.53).toFixed(1)).replace(".", ","); }
function formatPrice(value) { return Number(value) > 0 ? `${Math.round(Number(value)).toLocaleString("pt-PT").replace(/[\u00a0\u202f]/g, " ")} €` : "--"; }
module.exports = { getFlyerData };
