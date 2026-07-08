const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

run("node", ["--check", path.join(root, "src", "app.js")]);
run("node", ["--check", path.join(root, "src", "server.js")]);
run("node", ["--check", path.join(root, "src", "lambda.js")]);
run("node", ["--check", path.join(root, "src", "services", "quoteEmailService.js")]);
run("node", ["--check", path.join(root, "src", "services", "supabaseSimulationService.js")]);

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(publicDir, distDir, { recursive: true });
fs.copyFileSync(path.join(publicDir, "geocoding.html"), path.join(distDir, "index.html"));

const apiBaseUrl = (process.env.API_BASE_URL || "").trim().replace(/\/+$/, "");
const config = `window.MACWATTS_CONFIG = ${JSON.stringify({ apiBaseUrl }, null, 2)};\n`;
fs.writeFileSync(path.join(distDir, "config.js"), config, "utf8");

console.log(`Amplify build concluido em ${distDir}`);
if (apiBaseUrl) {
  console.log(`API_BASE_URL configurado: ${apiBaseUrl}`);
} else {
  console.log("API_BASE_URL vazio: o frontend vai usar /api/quote/email no mesmo dominio.");
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
