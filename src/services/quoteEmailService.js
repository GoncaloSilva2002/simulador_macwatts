const nodemailer = require("nodemailer");

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

async function sendQuoteEmail(request) {
  const resendEnabled = envBool("RESEND_ENABLED", true);
  const resendApiKey = process.env.RESEND_API_KEY || "";

  if (resendEnabled && resendApiKey) {
    await sendQuoteViaResend(request, resendApiKey);
    return true;
  }

  const smtpHost = process.env.MAIL_HOST || "";
  const smtpUsername = process.env.MAIL_USERNAME || "";
  const smtpPassword = process.env.MAIL_PASSWORD || "";
  const skipWhenSmtpMissing = envBool("MAIL_SKIP_WHEN_SMTP_MISSING", false);

  if (!smtpHost) {
    if (skipWhenSmtpMissing) {
      console.warn("SMTP nao configurado; envio de email ignorado (modo teste).");
      return false;
    }
    throw new ConfigurationError("SMTP nao configurado. Define MAIL_HOST, MAIL_PORT, MAIL_USERNAME e MAIL_PASSWORD.");
  }
  if (!smtpUsername || !smtpPassword) {
    if (skipWhenSmtpMissing) {
      console.warn("Credenciais SMTP ausentes; envio de email ignorado (modo teste).");
      return false;
    }
    throw new ConfigurationError("Credenciais SMTP ausentes. Define MAIL_USERNAME e MAIL_PASSWORD.");
  }

  await sendQuoteViaSmtp(request, {
    host: smtpHost,
    port: Number(process.env.MAIL_PORT || 587),
    user: smtpUsername,
    pass: smtpPassword
  });
  return true;
}

async function sendQuoteViaResend(request, resendApiKey) {
  const mapSnapshot = await resolveMapSnapshot(request);
  const attachments = buildAttachments(request, mapSnapshot, "resend");
  const payload = {
    from: process.env.RESEND_FROM || process.env.MAIL_FROM || "onboarding@resend.dev",
    to: [companyEmail()],
    subject: "Novo Pedido de Orcamento Solar",
    text: buildCompanyBody(request)
  };

  if (attachments.length) {
    payload.attachments = attachments;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Resend error: HTTP ${response.status} - ${await response.text()}`);
  }
}

async function sendQuoteViaSmtp(request, smtp) {
  const mapSnapshot = await resolveMapSnapshot(request);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || smtp.user || "no-reply@localhost",
    to: companyEmail(),
    subject: "Novo Pedido de Orcamento Solar",
    text: buildCompanyBody(request),
    attachments: buildAttachments(request, mapSnapshot, "smtp")
  });
}

function buildAttachments(request, mapSnapshot, mode) {
  const primary = attachmentFromBase64(
    request.invoiceAttachmentBase64,
    request.invoiceAttachmentName,
    request.invoiceAttachmentMime,
    mode,
    "fatura-luz"
  );
  const alt = attachmentFromBase64(
    request.invoiceAttachmentBase64Alt,
    request.invoiceAttachmentNameAlt,
    request.invoiceAttachmentMimeAlt,
    mode,
    "fatura-luz"
  );
  const map = attachmentFromBase64(
    mapSnapshot.base64,
    mapSnapshot.name,
    mapSnapshot.mime,
    mode,
    "mapa-telhado"
  );

  const attachments = [];
  if (primary) attachments.push(primary);
  if (alt && !isSameAttachment(primary, alt)) attachments.push(alt);
  if (map) attachments.push(map);
  return attachments;
}

function attachmentFromBase64(base64Raw, nameRaw, mimeRaw, mode, fallbackName) {
  const content = extractBase64Content(base64Raw);
  if (!content) return null;

  const mime = resolveMime(mimeRaw, base64Raw);
  let filename = String(nameRaw || fallbackName || "anexo").trim();
  if (!filename.includes(".") && mime) {
    filename += mimeToExtension(mime);
  }

  if (mode === "resend") {
    const attachment = { filename, content };
    if (mime) attachment.content_type = mime;
    return attachment;
  }

  const attachment = {
    filename,
    content: Buffer.from(content, "base64")
  };
  if (mime) attachment.contentType = mime;
  return attachment;
}

async function resolveMapSnapshot(request) {
  let base64 = request.mapSnapshotBase64 || null;
  let name = trimOrNull(request.mapSnapshotName);
  let mime = trimOrNull(request.mapSnapshotMime);

  if (!base64 && request.mapSnapshotUrl) {
    try {
      const remote = await fetchRemoteMapSnapshot(withStaticMapsKey(request.mapSnapshotUrl));
      base64 = remote.base64;
      name = name || remote.name;
      mime = mime || remote.mime;
    } catch (error) {
      console.warn("Falha ao obter mapa estatico:", error.message);
    }
  }

  return {
    base64,
    name: name || "mapa-telhado",
    mime
  };
}

async function fetchRemoteMapSnapshot(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "macwatts-backend-node"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const mime = trimOrNull((response.headers.get("content-type") || "").split(";")[0]);
  const bytes = Buffer.from(await response.arrayBuffer());
  const base64Content = bytes.toString("base64");
  return {
    base64: mime ? `data:${mime};base64,${base64Content}` : base64Content,
    name: `mapa-telhado${mimeToExtension(mime)}`,
    mime
  };
}

function withStaticMapsKey(url) {
  const staticMapsKey = process.env.APP_MAPS_STATIC_KEY || process.env.APP_MAPS_BROWSER_KEY || "";
  if (!url || !staticMapsKey) return url;

  const parsed = new URL(url);
  parsed.searchParams.set("key", staticMapsKey);
  return parsed.toString();
}

function buildCompanyBody(request) {
  const lines = ["Segue o pedido de orcamento solar.", ""];
  lines.push(`Cliente: ${safe(request.clientName)}`);
  lines.push(`Email do cliente: ${safe(request.clientEmail)}`);

  if (safe(request.clientPhone)) lines.push(`Telemovel: ${safe(request.clientPhone)}`);
  if (safe(request.clientNif)) lines.push(`NIF: ${safe(request.clientNif)}`);
  if (safe(request.addressSummary)) lines.push(`Morada: ${safe(request.addressSummary)}`);

  if (request.latitude != null && request.longitude != null) {
    lines.push(`Coordenadas: lat ${formatCoord(request.latitude)}, lon ${formatCoord(request.longitude)}`);
  }

  if (safe(request.questionnaireSummary)) {
    lines.push("", "Questionario:", safe(request.questionnaireSummary));
  }

  return lines.join("\n");
}

function isSameAttachment(primary, alt) {
  if (!primary || !alt) return false;
  const primaryContent = primary.content && Buffer.isBuffer(primary.content)
    ? primary.content.toString("base64")
    : primary.content;
  const altContent = alt.content && Buffer.isBuffer(alt.content)
    ? alt.content.toString("base64")
    : alt.content;
  if (primaryContent && altContent && primaryContent === altContent) return true;
  return primary.filename && alt.filename && primary.filename.toLowerCase() === alt.filename.toLowerCase();
}

function extractBase64Content(base64Raw) {
  if (!base64Raw || typeof base64Raw !== "string") return null;
  const commaIndex = base64Raw.indexOf(",");
  const content = commaIndex >= 0 ? base64Raw.slice(commaIndex + 1) : base64Raw;
  return content.trim() || null;
}

function resolveMime(mime, base64) {
  if (mime) return String(mime).trim();
  if (!base64 || typeof base64 !== "string") return null;
  const match = base64.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function mimeToExtension(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "application/pdf") return ".pdf";
  return "";
}

function envBool(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["true", "1", "yes", "sim"].includes(String(value).toLowerCase());
}

function companyEmail() {
  return (process.env.APP_COMPANY_EMAIL || "macwattstestes@gmail.com").trim();
}

function trimOrNull(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function safe(value) {
  return value == null ? "" : String(value).trim();
}

function formatCoord(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : "";
}

module.exports = { sendQuoteEmail };
