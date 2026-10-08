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
run("node", ["--check", path.join(root, "src", "services", "quotePdfService.js")]);
run("node", ["--check", path.join(root, "src", "services", "supabasePriceService.js")]);
run("node", ["--check", path.join(root, "src", "services", "supabaseProposalService.js")]);

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(publicDir, distDir, { recursive: true });
fs.copyFileSync(path.join(publicDir, "geocoding.html"), path.join(distDir, "index.html"));
fs.mkdirSync(path.join(distDir, "admin-precos"), { recursive: true });
fs.copyFileSync(path.join(publicDir, "admin-precos.html"), path.join(distDir, "admin-precos", "index.html"));

const defaultApiBaseUrl = "https://ikuf62mxjq5flcx2yud25t2tra0wejfh.lambda-url.eu-west-3.on.aws";
const apiBaseUrl = (process.env.API_BASE_URL || defaultApiBaseUrl).trim().replace(/\/+$/, "");
const config = `const localMacwattsHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)\n  || window.location.protocol === "file:";\n\nwindow.MACWATTS_CONFIG = {\n  apiBaseUrl: localMacwattsHost ? "http://localhost:8080" : ${JSON.stringify(apiBaseUrl)}\n};\n`;
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
