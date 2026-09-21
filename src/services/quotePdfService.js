const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const navy = rgb(0.035, 0.09, 0.16);

async function createQuotePdf(request) {
  const files = ["base.pdf", "amostra-apos-alteracoes-12.pdf", "amostra-apos-alteracoes.pdf", "base-formulario.pdf"];
  const file = files.map((name) => path.join(__dirname, "..", "..", "public", name)).find(fs.existsSync);
  const pdf = file ? await PDFDocument.load(fs.readFileSync(file)) : await PDFDocument.create();
  const page = pdf.getPages()[0] || pdf.addPage([960, 540]);
  // Mantém o orçamento, logótipo e rodapé, removendo o espaço branco lateral.
  // Enquadramento final: orçamento centrado na página, sem margens laterais excessivas.
  page.setCropBox(255, 0, 530, 540);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const q = request.questionnaire || {};
  const roof = request.roof || {};
  const value = (v) => String(v == null || v === "" ? "-" : v);
  const money = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} EUR`;
  const production = Number(q.annualProduction || q.production || ((q.panelMonthlyKwh || 0) * (q.panelsNeeded || 0)) || 0);
  const consumption = Number(q.monthlyKwhEstimate || q.consumption || q.annualConsumption || 0);
  const price = q.basePrice || q.totalPrice || q.priceLight || request.basePrice || 0;
  const form = pdf.getForm();
  const setField = (name, content) => {
    try { form.getTextField(name).setText(value(content)); } catch (error) { /* modelo sem este campo */ }
  };
  setField("cliente", request.clientName);
  setField("data", new Date().toLocaleDateString("pt-PT"));
  setField("morada", roof.address || request.addressSummary);
  setField("numero_paineis", q.panelsNeeded || 0);
  setField("potencia", `${Number(q.panelsFitKwp || 0).toFixed(1)} kWp`);
  setField("inversor", q.inverter || "1 x Hibrido Monofasico 3 kW");
  setField("preco", money(price));
  setField("producao", `${production.toFixed(0)} kWh`);
  setField("consumo", `${consumption.toFixed(0)} kWh`);
  setField("poupanca_mensal", money(q.electricitySavings));
  setField("poupanca_anual", money(q.annualSavings || q.electricitySavings));
  setField("poupanca_30_anos", money(q.savings30Years));
  form.flatten();
  const drawField = (x, y, content, size = 7) => page.drawText(value(content), { x, y, size, font: regular, color: navy });
  drawField(555, 457, request.clientName);
  drawField(550, 436, new Date().toLocaleDateString("pt-PT"));
  drawField(355, 436, roof.address || request.addressSummary, 7);
  drawField(375, 423, q.panelsNeeded || 0);
  drawField(358, 409, `${Number(q.panelsFitKwp || 0).toFixed(1)} kWp`);
  drawField(356, 395, q.inverter || "1 x Hibrido Monofasico 3 kW", 7);
  drawField(370, 339, money(price));
  drawField(370, 233, `${production.toFixed(0)} kWh`);
  drawField(370, 176, `${consumption.toFixed(0)} kWh`);
  drawField(426, 90, money(q.electricitySavings));
  drawField(420, 76, money(q.annualSavings || q.electricitySavings));
  drawField(463, 62, money(q.savings30Years));
  // Substitui os valores que vêm impressos no PDF-modelo.
  const snapshot = (request.questionnaire || {}).mapSnapshotBase64 || request.mapSnapshotBase64;
  if (snapshot) {
    try {
      const match = String(snapshot).match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/);
      const raw = match ? Buffer.from(match[2], "base64") : Buffer.from(snapshot, "base64");
      const image = match && match[1] === "image/png" ? await pdf.embedPng(raw) : await pdf.embedJpg(raw);
      const scale = Math.min(120 / image.width, 50 / image.height);
      page.drawImage(image, { x: 530, y: 380, width: image.width * scale, height: image.height * scale });
    } catch (error) {
      console.warn("Nao foi possivel inserir a imagem do telhado:", error.message);
    }
  }
  page.drawText(new Date().toLocaleDateString("pt-PT"), { x: width - 125, y: height - 35, size: 7, font: regular, color: navy });
  return Buffer.from(await pdf.save());
}

module.exports = { createQuotePdf };
