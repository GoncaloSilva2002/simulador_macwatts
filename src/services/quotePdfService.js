const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const navy = rgb(0.035, 0.09, 0.16);

async function createQuotePdf(request) {
  const files = ["amostra-apos-alteracoes-12.pdf", "amostra-apos-alteracoes.pdf"];
  const file = files.map((name) => path.join(__dirname, "..", "..", "public", name)).find(fs.existsSync);
  const pdf = file ? await PDFDocument.load(fs.readFileSync(file)) : await PDFDocument.create();
  const page = pdf.getPages()[0] || pdf.addPage([960, 540]);
  // Recorta as margens brancas do modelo e deixa apenas o painel do orçamento.
  page.setCropBox(285, 0, 380, 540);
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
  const coverValue = (x, y, w, h, content, size = 9) => {
    page.drawRectangle({ x, y: y - 2, width: w, height: h, color: rgb(0.82, 0.93, 0.98) });
    page.drawText(value(content), { x, y, size, font: regular, color: navy });
  };
  // Substitui os valores que vêm impressos no PDF-modelo.
  coverValue(350, 458, 145, 14, request.clientName, 8);
  coverValue(350, 442, 145, 14, roof.address || request.addressSummary, 7);
  coverValue(350, 411, 80, 14, q.panelsNeeded || 0, 8);
  coverValue(350, 395, 95, 14, `${Number(q.panelsFitKwp || 0).toFixed(1)} kWp`, 8);
  coverValue(350, 379, 145, 14, q.inverter || "1 x Hibrido Monofasico 3 kW", 7);
  coverValue(350, 305, 130, 14, money(price), 8);
  coverValue(350, 245, 115, 14, `${production.toFixed(0)} kWh`, 8);
  coverValue(350, 183, 115, 14, `${consumption.toFixed(0)} kWh`, 8);
  coverValue(350, 112, 130, 14, money(q.electricitySavings), 8);
  coverValue(350, 96, 130, 14, money(q.annualSavings || q.electricitySavings), 8);
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
  page.drawText(new Date().toLocaleDateString("pt-PT"), { x: width - 125, y: height - 35, size: 9, font: regular, color: navy });
  return Buffer.from(await pdf.save());
}

module.exports = { createQuotePdf };
