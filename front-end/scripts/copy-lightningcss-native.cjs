const fs = require("fs");
const path = require("path");

const nm = path.join(__dirname, "..", "node_modules");
const destDir = path.join(nm, "lightningcss");
if (!fs.existsSync(destDir)) process.exit(0);

for (const name of fs.readdirSync(nm)) {
  if (!name.startsWith("lightningcss-")) continue;
  const dir = path.join(nm, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".node")) continue;
    fs.copyFileSync(path.join(dir, file), path.join(destDir, file));
  }
}
