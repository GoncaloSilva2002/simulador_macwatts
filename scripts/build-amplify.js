const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(publicDir, distDir, { recursive: true });

fs.copyFileSync(
  path.join(publicDir, "geocoding.html"),
  path.join(distDir, "index.html")
);

const adminRouteDir = path.join(distDir, "admin-precos");
fs.mkdirSync(adminRouteDir, { recursive: true });
fs.copyFileSync(
  path.join(publicDir, "admin-precos.html"),
  path.join(adminRouteDir, "index.html")
);

console.log(`Amplify build concluído em ${distDir}`);
