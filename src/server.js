const express = require("express");
const path = require("path");
require("dotenv").config();

const { sendQuoteEmail } = require("./services/quoteEmailService");
const { saveSimulation } = require("./services/supabaseSimulationService");

const app = express();
const port = Number(process.env.PORT || 8080);
const staticDir = path.join(__dirname, "..", "public");

app.use(express.json({ limit: process.env.JSON_LIMIT || "35mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || "35mb" }));
app.use(express.static(staticDir));

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.post("/api/quote/email", async (req, res) => {
  const request = req.body || {};
  const clientName = String(request.clientName || "").trim();
  const clientEmail = String(request.clientEmail || "").trim();
  const clientNif = String(request.clientNif || "").trim();

  if (!clientName || !clientEmail) {
    return res.status(400).send("Campos obrigatorios: clientName, clientEmail.");
  }
  if (!clientNif) {
    return res.status(400).send("Campo obrigatorio: clientNif.");
  }
  if (!/^\d{9}$/.test(clientNif)) {
    return res.status(400).send("Campo invalido: clientNif deve ter 9 digitos.");
  }

  request.clientName = clientName;
  request.clientEmail = clientEmail;
  request.clientNif = clientNif;

  try {
    await saveSimulation(request);
    const sent = await sendQuoteEmail(request);
    if (sent) {
      return res.send("Email enviado com sucesso para a empresa.");
    }
    return res.send("SMTP nao configurado: fluxo concluido em modo teste.");
  } catch (error) {
    const message = rootMessage(error);
    if (error.name === "ValidationError" || error.name === "ConfigurationError") {
      console.warn("Pedido de orcamento rejeitado:", message);
      return res.status(400).send(message);
    }
    console.error("Falha inesperada ao processar o pedido de orcamento:", error);
    return res.status(500).send(`Falha no processamento: ${message}`);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor Node.js iniciado em http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`A porta ${port} ja esta em uso. Fecha o outro servidor ou muda a variavel PORT.`);
    process.exit(1);
  }
  throw error;
});

function rootMessage(error) {
  let current = error;
  while (current && current.cause) {
    current = current.cause;
  }
  return (current && current.message) || error.message || "erro desconhecido";
}
