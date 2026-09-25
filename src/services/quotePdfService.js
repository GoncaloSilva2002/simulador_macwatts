const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { getPrices, getInverter, getQuotePricing } = require("./supabasePriceService");

const navy = rgb(0.035, 0.09, 0.16);

async function createQuotePdf(request) {
  const q = { ...(request.questionnaire || {}) };
  try {
    const pricing = await getQuotePricing({ panels: q.panelsNeeded, batteryKwh: q.batteryCapacityKwh || 0, backupKw: q.backupKw || (q.hasBattery ? 3 : 0), lightType: q.phaseType || "Monofásico", gama: q.gama || "Base" });
    if (pricing) Object.assign(q, { basePrice: pricing.basePrice, inverter: pricing.inverter, pricing });
  } catch (error) { console.warn("Precos/configuracao do Supabase indisponiveis:", error.message); }
  if (!q.inverter) {
    try { q.inverter = await getInverter(q.panelsNeeded); } catch (error) { console.warn("Inversor do Supabase indisponivel:", error.message); }
  }
  const hasBattery = q.hasBattery === true || q.hasBattery === "true" || q.hasBattery === "sim";
  const htmlTemplate = path.join(__dirname, "..", "..", "public", "proposta-template.html");
  const htmlSource = fs.existsSync(htmlTemplate) ? fs.readFileSync(htmlTemplate, "utf8") : "";
  // O primeiro PNG do HTML é o logótipo, não uma página de fundo. O PDF usa
  // os modelos PDF completos existentes na pasta public.
  const templateMatch = null;
  if (htmlSource && htmlSource.includes("contenteditable")) {
    let htmlRequest = { ...request, questionnaire: q };
    const mapUrl = q.mapSnapshotUrl || request.mapSnapshotUrl;
    if (!(q.mapSnapshotBase64 || request.mapSnapshotBase64) && mapUrl) {
      try {
        const response = await fetch(mapUrl);
        if (response.ok) {
          const mime = (response.headers.get("content-type") || "image/png").split(";")[0];
          const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
          htmlRequest = { ...request, questionnaire: { ...q, mapSnapshotBase64: `data:${mime};base64,${base64}` } };
        }
      } catch (error) {
        console.warn("Nao foi possivel descarregar a imagem de satelite:", error.message);
      }
    }
    return Buffer.from(await renderQuoteHtml(htmlRequest), "utf8");
  }
  // O HTML entregue pelo utilizador é uma composição estática. Usamos a imagem
  // original como fundo e desenhamos apenas os campos variáveis por cima.
  if (templateMatch) {
    const pdf = await PDFDocument.create();
    const background = await pdf.embedPng(Buffer.from(templateMatch[1], "base64"));
    const page = pdf.addPage([background.width * 0.5, background.height * 0.5]);
    page.drawImage(background, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    return createQuoteFromTemplate(pdf, page, request, q, hasBattery);
  }
  const files = hasBattery
    ? ["baseline-com-bateria.pdf", "base-formulario.pdf", "base.pdf"]
    : ["baseline-sem-bateria.pdf", "base-formulario.pdf", "base.pdf"];
  const file = files.map((name) => path.join(__dirname, "..", "..", "public", name)).find(fs.existsSync);
  const pdf = file ? await PDFDocument.load(fs.readFileSync(file)) : await PDFDocument.create();
  const page = pdf.getPages()[0] || pdf.addPage([960, 540]);
  // Mantém o orçamento, logótipo e rodapé, removendo o espaço branco lateral.
  // Enquadramento final: orçamento centrado na página, sem margens laterais excessivas.
  // Margens laterais iguais em torno do orçamento, com fundo cinza-claro.
  const pageBackground = rgb(0.957, 0.965, 0.973);
  const isPortrait = page.getHeight() > page.getWidth();
  if (!isPortrait) {
    page.drawRectangle({ x: 255, y: 0, width: 43, height: 540, color: pageBackground });
    page.drawRectangle({ x: 658, y: 0, width: 43, height: 540, color: pageBackground });
    page.setCropBox(255, 0, 446, 540);
  } else {
    page.setCropBox(0, 0, page.getWidth(), page.getHeight());
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const roof = request.roof || {};
  const value = (v) => String(v == null || v === "" ? "-" : v);
  const money = (v) => `${formatMoney(v, 2)} €`;
  const productionMonthly = Number(q.annualProduction || q.production || ((q.panelMonthlyKwh || 0) * (q.panelsNeeded || 0)) || 0);
  const consumptionMonthly = Number(q.monthlyKwhEstimate || q.consumption || q.annualConsumption || 0);
  const production = productionMonthly * 12;
  const consumption = consumptionMonthly * 12;
  const independencePct = Number.isFinite(Number(q.independencePct))
    ? Math.max(0, Math.min(100, Number(q.independencePct)))
    : (consumption > 0 ? Math.max(0, Math.min(100, (Math.min(production, consumption) / consumption) * 100)) : 0);
  const monthlySavings = Number(q.electricitySavings || 0);
  const annualSavings = monthlySavings * 12;
  const savings30Years = monthlySavings * 360;
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
  setField("poupanca_anual", money(annualSavings));
  setField("poupanca_30_anos", money(savings30Years));
  form.flatten();
  const drawField = (x, y, content, size = 7) => page.drawText(value(content), { x, y, size, font: regular, color: navy });
  if (isPortrait) {
    const productionKwh = Math.round(productionMonthly);
    const consumptionKwh = Math.round(consumptionMonthly);
    const leftRows = [
      ["Para a Habitação", Number(q.graphHomePct ?? independencePct), productionKwh * Number(q.graphHomePct ?? independencePct) / 100, rgb(0.62, 0.84, 0.38)],
      ["Para a Rede", Number(q.graphGridProductionPct ?? (100 - independencePct)), productionKwh * Number(q.graphGridProductionPct ?? (100 - independencePct)) / 100, rgb(0.20, 0.55, 0.16)]
    ];
    if (hasBattery) leftRows.splice(1, 0, ["Para a Bateria", Number(q.graphBatteryProductionPct ?? 0), productionKwh * Number(q.graphBatteryProductionPct ?? 0) / 100, rgb(0.58, 0.06, 0.12)]);
    const rightRows = [
      ["Do Sistema Fotovoltaico", Number(q.graphSystemPct ?? independencePct), consumptionKwh * Number(q.graphSystemPct ?? independencePct) / 100, rgb(0.10, 0.68, 0.86)],
      ["Da Rede", Number(q.graphNetworkPct ?? (100 - independencePct)), consumptionKwh * Number(q.graphNetworkPct ?? (100 - independencePct)) / 100, rgb(0.97, 0.72, 0.08)]
    ];
    if (hasBattery) rightRows.splice(1, 0, ["Da Bateria", Number(q.graphBatteryPct ?? 0), consumptionKwh * Number(q.graphBatteryPct ?? 0) / 100, rgb(0.58, 0.06, 0.12)]);
    const drawGraph = (rows, labelX, barX, topY, legacyTopY) => {
      // Aceita também a chamada antiga com um título como primeiro argumento.
      if (typeof rows === "string") {
        rows = labelX;
        labelX = barX;
        barX = topY;
        topY = legacyTopY;
      }
      rows.forEach(([label, pct, kwh, color], index) => {
        const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
        const y = topY - index * 22;
        page.drawText(label, { x: labelX, y: y + 3, size: 6, font: regular, color: navy });
        page.drawRectangle({ x: barX, y, width: 115, height: 12, color: rgb(0.86, 0.89, 0.87) });
        page.drawRectangle({ x: barX, y, width: 115 * safePct / 100, height: 12, color });
        page.drawText(`${Math.round(safePct)}%`, { x: barX + 80, y: y + 3, size: 6, font: bold, color: navy });
      });
    };
    drawGraph("Destino da produção mensal", leftRows, 300, 400, 380);
    drawGraph("Origem do consumo mensal", rightRows, 300, 400, 300);
    drawField(418, 734, request.clientName, 9);
    drawField(409, 700, new Date().toLocaleDateString("pt-PT"), 9);
    const installationLayout = hasBattery
      ? { address: [96, 681], panels: [129, 661], power: [105, 639], inverter: [98, 618] }
      : { address: [96, 677], panels: [129, 655], power: [105, 633], inverter: [98, 611] };
    drawField(...installationLayout.address, roof.address || request.addressSummary, 10);
    drawField(...installationLayout.panels, q.panelsNeeded || 0, 10);
    drawField(...installationLayout.power, `${Number(q.panelsFitKwp || 0).toFixed(1)} kWp`, 10);
    drawField(...installationLayout.inverter, q.inverter || "1 x Hibrido Monofasico 3 kW", 10);
    if (hasBattery) {
      // Coordenada exclusiva do modelo com bateria.
      drawField(189, 597, `${Number(q.batteryCapacityKwh || 0).toFixed(0)} kWh`, 10);
    }
    drawField(122, 526, money(price), 10);
    drawField(130, 367, `${production.toFixed(0)} kWh`, 10);
    drawField(130, 280, `${consumption.toFixed(0)} kWh`, 10);
    page.drawText(`${Math.round(independencePct)}`, {
      x: 181,
      y: 231,
      size: 18,
      font: bold,
      color: navy
    });
    const savingsLayout = hasBattery
      ? { monthly: [206, 143], annual: [194, 122], lifetime: [263, 100] }
      : { monthly: [206, 166], annual: [194, 146], lifetime: [263, 124] };
    drawField(...savingsLayout.monthly, money(q.electricitySavings), 10);
    drawField(...savingsLayout.annual, money(annualSavings), 10);
    drawField(...savingsLayout.lifetime, money(savings30Years), 10);
  }
  // Substitui os valores que vêm impressos no PDF-modelo.
  const snapshot = (request.questionnaire || {}).mapSnapshotBase64 || request.mapSnapshotBase64;
  if (snapshot) {
    try {
      const match = String(snapshot).match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/);
      const raw = match ? Buffer.from(match[2], "base64") : Buffer.from(snapshot, "base64");
      const image = match && match[1] === "image/png" ? await pdf.embedPng(raw) : await pdf.embedJpg(raw);
      const scale = isPortrait
        ? Math.min(165 / image.width, 105 / image.height)
        : Math.min(120 / image.width, 50 / image.height);
      page.drawImage(image, {
        x: isPortrait ? 380 : 530,
        y: isPortrait ? 580 : 380,
        width: image.width * scale,
        height: image.height * scale
      });
    } catch (error) {
      console.warn("Nao foi possivel inserir a imagem do telhado:", error.message);
    }
  }
  return Buffer.from(await pdf.save());
}


async function createQuoteFromTemplate(pdf, page, request, q, hasBattery) {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.035, 0.09, 0.16);
  const roof = request.roof || {};
  const value = (v) => String(v == null || v === "" ? "-" : v);
  const money = (v) => `${formatMoney(v, 2)} €`;
  const monthlyProduction = Number(q.annualProduction || q.production || ((q.panelMonthlyKwh || 0) * (q.panelsNeeded || 0)) || 0);
  const monthlyConsumption = Number(q.monthlyKwhEstimate || q.consumption || q.annualConsumption || 0);
  const production = monthlyProduction * 12;
  const consumption = monthlyConsumption * 12;
  const savings = Number(q.electricitySavings || 0);
  const annualSavings = savings * 12;
  const lifetimeSavings = savings * 360;
  const independence = Number.isFinite(Number(q.independencePct)) ? Number(q.independencePct) : (consumption ? Math.min(100, production / consumption * 100) : 0);
  const draw = (x, y, text, size = 10, font = regular) => page.drawText(value(text), { x, y, size, font, color: navy });
  draw(418, 734, request.clientName, 9);
  draw(409, 700, new Date().toLocaleDateString("pt-PT"), 9);
  draw(96, 677, roof.address || request.addressSummary, 10);
  draw(129, 655, q.panelsNeeded || 0, 10);
  draw(105, 633, `${Number(q.panelsFitKwp || 0).toFixed(1)} kWp`, 10);
  draw(98, 611, q.inverter || "1 x Hibrido Monofasico 3 kW", 10);
  if (hasBattery) draw(189, 597, `${Number(q.batteryCapacityKwh || 0).toFixed(0)} kWh`, 10);
  draw(122, 526, money(q.basePrice || q.totalPrice || q.priceLight || request.basePrice), 10);
  draw(130, 367, `${production.toFixed(0)} kWh`, 10);
  draw(130, 280, `${consumption.toFixed(0)} kWh`, 10);
  draw(181, 231, Math.round(independence), 18, bold);
  draw(206, hasBattery ? 143 : 166, money(savings), 10);
  draw(194, hasBattery ? 122 : 146, money(annualSavings), 10);
  draw(263, hasBattery ? 100 : 124, money(lifetimeSavings), 10);
  return Buffer.from(await pdf.save());
}

function formatMoney(value, decimals) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return decimals ? "0,00" : "0";
  const fixed = amount.toFixed(decimals).replace(".", ",");
  const [integer, fraction] = fixed.split(",");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction == null ? grouped : `${grouped},${fraction}`;
}

module.exports = { createQuotePdf };

async function renderQuoteHtml(request) {
  const templatePath = path.join(__dirname, "..", "..", "public", "proposta-template.html");
  let html = fs.readFileSync(templatePath, "utf8");
  const money = (v) => `${formatMoney(v, 0)} €`;
  const q = { ...(request.questionnaire || {}) };
  try {
    const hasBatteryForPricing = q.hasBattery === true || q.hasBattery === "true" || q.hasBattery === "sim";
    const pricing = await getQuotePricing({ panels: q.panelsNeeded, batteryKwh: q.batteryCapacityKwh || 0, backupKw: q.backupKw || (hasBatteryForPricing ? 3 : 0), lightType: q.phaseType || "Monofásico", gama: q.gama || "Base" });
    if (pricing) Object.assign(q, { basePrice: pricing.basePrice, inverter: pricing.inverter, pricing });
  } catch (error) { console.warn("Precos/configuracao do Supabase indisponiveis:", error.message); }
  if (!q.inverter) {
    try { q.inverter = await getInverter(q.panelsNeeded); } catch (error) { console.warn("Inversor do Supabase indisponivel:", error.message); }
  }
  const replacePrice = (pattern, price) => {
    if (Number.isFinite(Number(price))) html = html.replace(pattern, (match, prefix, suffix) => `${prefix}${money(price)} <small class="vat">(c/IVA)</small>${suffix}`);
  };
  const pricingInput = { panels: q.panelsNeeded, batteryKwh: q.batteryCapacityKwh || 0, backupKw: q.backupKw || 0, lightType: q.phaseType || "Monofásico" };
  try {
    const [base, standard, premium] = await Promise.all([
      getQuotePricing({ ...pricingInput, gama: "Base" }),
      getQuotePricing({ ...pricingInput, gama: "Premium" }),
      getQuotePricing({ ...pricingInput, gama: "Premium All-Black" })
    ]);
    replacePrice(/(<span[^>]*>Gama Base<\/span><b[^>]*>)[\s\S]*?(<\/b>)/i, base?.basePrice);
    replacePrice(/(<span[^>]*>Gama Premium<\/span><b[^>]*>)[\s\S]*?(<\/b>)/i, standard?.basePrice);
    replacePrice(/(<span[^>]*>Gama Premium All-Black<\/span><b[^>]*>)[\s\S]*?(<\/b>)/i, premium?.basePrice);
  } catch (error) { console.warn("Lista de precos do Supabase indisponivel:", error.message); }
  const roof = request.roof || {};
  const hasBattery = q.hasBattery === true || q.hasBattery === "true" || q.hasBattery === "sim";
  if (!hasBattery) {
    html = html.replace(/<div class="price"><span[^>]*>Sistema de backup[\s\S]*?<\/div>\s*/i, "");
  } else {
    const backupPrice = q.pricing && Number.isFinite(Number(q.pricing.backupPrice)) ? q.pricing.backupPrice : null;
    if (backupPrice != null) {
      html = html.replace(/(<div class="price"><span[^>]*>Sistema de backup[\s\S]*?<b[^>]*>)[\s\S]*?(<\/b>)/i, `$1${money(backupPrice)} <small class="vat">(c/IVA)</small>$2`);
    }
    html = html.replace(/(<div class="price"><span[^>]*>Sistema de backup[\s\S]*?<b[^>]*>)([\s\S]*?)(<\/b>)/i, (match, prefix, value, suffix) => {
      if (/class=["'][^"']*vat/i.test(value)) return match;
      return `${prefix}${value} <small class="vat">(c/IVA)</small>${suffix}`;
    });
  }
  const clientTitle = String(request.clientName || "Cliente").replace(/[<>&\"']/g, "").trim() || "Cliente";
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>Proposta - ${clientTitle}</title>`);
  const production = Number(q.annualProduction || q.production || ((q.panelMonthlyKwh || 0) * (q.panelsNeeded || 0)) || 0) * 12;
  const consumption = Number(q.monthlyKwhEstimate || q.consumption || q.annualConsumption || 0) * 12;
  const monthly = Number(q.electricitySavings || 0);
  const independence = Number.isFinite(Number(q.independencePct))
    ? Math.max(0, Math.min(100, Number(q.independencePct)))
    : (consumption ? Math.max(0, Math.min(100, production / consumption * 100)) : 0);
  const replacements = [
    ["Ricardo Domingos", request.clientName],
    ["Corte AntÃ³nio Martins, 8900-067<br>Vila Nova de Cacela", roof.address || request.addressSummary],
    ["8 painÃ©is", `${q.panelsNeeded || 0} painéis`],
    ["4,24 kWp", `${Number(q.panelsFitKwp || 0).toFixed(2)} kWp`],
    ["15 kWh", `${Number(q.batteryCapacityKwh || 0).toFixed(0)} kWh`],
    ["11 439 â‚¬", money(q.basePrice || q.totalPrice || q.priceLight || request.basePrice)],
    ["12 788 kWh", `${production.toFixed(0)} kWh`],
    ["16 200 kWh", `${consumption.toFixed(0)} kWh`],
    ["197 â‚¬", money(monthly)],
    ["2 368 â‚¬", money(monthly * 12)],
    ["71 044 â‚¬", money(monthly * 360)]
  ];
  for (const [from, to] of replacements) {
    if (to != null && String(to).trim()) html = html.split(from).join(String(to));
  }
  const replaceEditable = (pattern, to) => {
    html = html.replace(pattern, (match, prefix, suffix) => `${prefix}${String(to || "-")}${suffix}`);
  };
  replaceEditable(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, request.clientName);
  const proposalDate = new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  const mapSnapshot = q.mapSnapshotBase64 || request.mapSnapshotBase64 || q.mapSnapshotUrl || request.mapSnapshotUrl || "";
  const safeMapSource = String(mapSnapshot).trim();
  const mapImage = /^(data:image\/[\w.+-]+;base64,[\s\S]+|https?:\/\/[^\s"<>]+)$/.test(safeMapSource)
    ? `<img class="map-snapshot" alt="Imagem de satélite da instalação" src="${safeMapSource}" style="display:block;width:340px;height:170px;object-fit:cover;margin:0;border-radius:8px;border:1px solid #dfe5e9">`
    : "";
  html = html.replace(/(<div class="version"[^>]*><b>[^<]*<\/b><br>)[^<]*(<\/div>)/, `$1${proposalDate}${mapImage}$2`);
  replaceEditable(/(<small>Morada<\/small><b[^>]*>)[\s\S]*?(<\/b>)/, roof.address || request.addressSummary);
  replaceEditable(/(<small>Pain[^<]*<\/small><b[^>]*>)[\s\S]*?(<\/b>)/, `${q.panelsNeeded || 0} painéis`);
  replaceEditable(/(<small>Pot[^<]*<\/small><b[^>]*>)[\s\S]*?(<\/b>)/, `${Number(q.panelsFitKwp || 0).toFixed(2)} kWp`);
  replaceEditable(/(<small>Inversor<\/small><b[^>]*>)[\s\S]*?(<\/b>)/, q.inverter || "1 × Híbrido monofásico 3,7 kWn");
  replaceEditable(/(<small>Cap[^<]*<\/small><b[^>]*>)[\s\S]*?(<\/b>)/, `${Number(q.batteryCapacityKwh || 0).toFixed(0)} kWh`);
  const metricValues = [
    `${Math.round(independence)}%`,
    money(monthly),
    money(monthly * 12),
    money(monthly * 360)
  ];
  let metricIndex = 0;
  html = html.replace(/(<div class="metric"><strong[^>]*>)[\s\S]*?(<\/strong>)/g, (match, prefix, suffix) => {
    const replacement = metricValues[metricIndex++];
    return replacement == null ? match : `${prefix}${replacement}${suffix}`;
  });
  const graphValues = {
    homeValue: q.graphHomePct ?? independence,
    toBatteryValue: q.graphBatteryProductionPct ?? 0,
    toGridValue: q.graphGridProductionPct ?? Math.max(0, 100 - Number(q.graphHomePct ?? independence) - Number(q.graphBatteryProductionPct ?? 0)),
    solarValue: q.graphSystemPct ?? independence,
    batteryValue: q.graphBatteryPct ?? 0,
    gridValue: q.graphNetworkPct ?? Math.max(0, 100 - Number(q.graphSystemPct ?? independence) - Number(q.graphBatteryPct ?? 0))
  };
  for (const [id, raw] of Object.entries(graphValues)) {
    const pct = Math.max(0, Math.min(100, Number(raw) || 0));
    html = html.replace(new RegExp(`(id="${id}"[^>]*>)[\\s\\S]*?(<\\/b>)`), `$1${Math.round(pct)}%$2`);
    const barId = { homeValue: "barHome", toBatteryValue: "barToBattery", toGridValue: "barToGrid", solarValue: "barSolar", batteryValue: "barBattery", gridValue: "barGrid" }[id];
    html = html.replace(new RegExp(`(id="${barId}"[^>]*width:)\\s*[0-9.]+%`), `$1${pct}%`);
  }
  if (!hasBattery) {
    const removeGraphRow = (marker) => {
      const markerAt = html.indexOf(marker);
      if (markerAt < 0) return;
      const start = html.lastIndexOf("<div style=\"display:grid", markerAt);
      const next = html.indexOf("\n  <div style=\"display:grid", markerAt);
      const end = next >= 0 ? next : html.indexOf("\n</div>", markerAt);
      if (start >= 0 && end > start) html = html.slice(0, start) + html.slice(end);
    };
    removeGraphRow('id="barToBattery"');
    removeGraphRow('id="barBattery"');
    const batteryLabel = html.indexOf("<small>Cap");
    if (batteryLabel >= 0) {
      const itemStart = html.lastIndexOf('<div class="item">', batteryLabel);
      const itemEnd = html.indexOf("</div></div>", batteryLabel);
      if (itemStart >= 0 && itemEnd > itemStart) html = html.slice(0, itemStart) + html.slice(itemEnd + "</div></div>".length);
    }
  }
  return html;
}

module.exports.renderQuoteHtml = renderQuoteHtml;
