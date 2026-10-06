require("dotenv").config();

const { createApp } = require("./app");

const app = createApp();
const port = Number(process.env.PORT || 8080);

// Sem host explícito, o Node aceita localhost em IPv4/IPv6 e continua
// acessível no container/serviço de produção quando IPv6 não está disponível.
const server = app.listen(port, () => {
  console.log(`Servidor Node.js iniciado em http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`A porta ${port} ja esta em uso. Fecha o outro servidor ou muda a variavel PORT.`);
    process.exit(1);
  }
  throw error;
});
