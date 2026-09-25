require("dotenv").config();

const { createApp } = require("./app");

const app = createApp();
const port = Number(process.env.PORT || 8080);

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
