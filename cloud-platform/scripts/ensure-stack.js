#!/usr/bin/env node
/**
 * Comprueba el stack en todos los paquetes; si ya existe en alguno, pregunta UNA vez si mantenerlo.
 * Uso: node ensure-stack.js <stackName> <frontendDir> <backendDir> <infraPermsDir>
 */
const { execSync } = require("child_process");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

const [stackName, frontendDir, backendDir, infraPermsDir] = process.argv.slice(2);
if (!stackName || !frontendDir || !backendDir || !infraPermsDir) {
  console.error("Uso: node ensure-stack.js <stackName> <frontendDir> <backendDir> <infraPermsDir>");
  process.exit(2);
}

const ROOT = path.resolve(process.cwd());
const packages = [
  { dir: path.resolve(ROOT, frontendDir), label: "frontend-infra" },
  { dir: path.resolve(ROOT, backendDir), label: "backend-infra" },
  { dir: path.resolve(ROOT, infraPermsDir), label: "infra-permissions" },
];

for (const p of packages) {
  if (!fs.existsSync(p.dir)) {
    console.error("No existe el directorio:", p.dir);
    process.exit(2);
  }
}

// Si ya hay un stack elegido (p. ej. prod), usarlo como referencia en lugar del argumento (dev).
const stackFile = path.join(ROOT, ".pulumi-selected-stack");
let currentStack = stackName;
if (fs.existsSync(stackFile)) {
  const content = fs.readFileSync(stackFile, "utf8").trim();
  if (content) currentStack = content;
}

function run(cmd, cwd, silent) {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
  } catch (e) {
    if (silent) return null;
    throw e;
  }
}

function stackExistsIn(cwd, name) {
  try {
    execSync(`pulumi stack select ${name}`, { cwd, encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function listStacksIn(cwd) {
  try {
    const out = execSync("pulumi stack ls --json", { cwd, encoding: "utf8", stdio: "pipe" });
    const raw = JSON.parse(out);
    let list = Array.isArray(raw) ? raw : (raw && raw.stacks) ? raw.stacks : [];
    if (!Array.isArray(list)) list = [];
    return list.map((s) => (typeof s === "string" ? s : s && (s.name || s.stackName || s))).filter(Boolean);
  } catch {
    try {
      const out = execSync("pulumi stack ls", { cwd, encoding: "utf8", stdio: "pipe" });
      const lines = out.split(/\n/).slice(1);
      return lines.map((l) => l.split(/\s+/)[0]).filter(Boolean);
    } catch {
      return [];
    }
  }
}

function listStacksFromYaml(cwd) {
  const names = [];
  try {
    const files = fs.readdirSync(cwd);
    for (const f of files) {
      const m = f.match(/^Pulumi\.([^.]+)\.yaml$/);
      if (m) names.push(m[1]);
    }
  } catch (_) {}
  return names;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || "").trim().toLowerCase().replace(/\r/g, ""));
    });
  });
}

function wantsToKeep(answer) {
  const first = (answer || "s").slice(0, 1);
  return first === "s" || first === "y" || answer === "si" || answer === "yes";
}

async function main() {
  const existing = packages.filter((p) => stackExistsIn(p.dir, currentStack));
  const missing = packages.filter((p) => !stackExistsIn(p.dir, currentStack));

  for (const p of missing) {
    run(`pulumi stack init ${currentStack}`, p.dir);
    run(`pulumi stack select ${currentStack}`, p.dir);
    console.log(`Stack "${currentStack}" creado en ${p.label}.`);
  }

  if (existing.length === 0) {
    fs.writeFileSync(stackFile, currentStack, "utf8");
    process.exit(0);
  }

  console.log(`\nEl stack "${currentStack}" ya existe en: ${existing.map((p) => p.label).join(", ")}.`);
  const keep = await ask("¿Mantenerlo? (s/n): ");
  if (wantsToKeep(keep)) {
    for (const p of existing) {
      run(`pulumi stack select ${currentStack}`, p.dir, true);
    }
    fs.writeFileSync(stackFile, currentStack, "utf8");
    console.log("Se mantiene el stack en todos los paquetes.");
    process.exit(0);
  }

  console.log("\nOpciones:");
  console.log("  1) Listar stacks y elegir uno (si no existe en algún paquete, se crea ahí)");
  console.log("  2) Cancelar");
  const opt = (await ask("Elige (1 o 2): ")).trim();
  if (opt === "2") {
    console.log("Cancelado. Para otro stack: make setup STACK=<nombre>");
    process.exit(0);
  }
  if (opt !== "1") {
    console.log("Opción no válida. Cancelado.");
    process.exit(0);
  }

  const allNames = new Set();
  for (const p of packages) {
    listStacksIn(p.dir).forEach((name) => allNames.add(name));
    listStacksFromYaml(p.dir).forEach((name) => allNames.add(name));
  }
  const stacks = [...allNames].sort();
  if (stacks.length === 0) {
    console.log("No hay stacks en ningún paquete. Crea uno con: make setup STACK=dev");
    process.exit(0);
  }
  console.log("Stacks disponibles (frontend, backend, infra-permissions):", stacks.join(", "));
  const chosen = (await ask("Nombre del stack a usar (o Enter para cancelar): ")).trim();
  if (!chosen) {
    console.log("Cancelado.");
    process.exit(0);
  }
  if (!stacks.includes(chosen)) {
    console.log(`"${chosen}" no está en la lista. Stacks: ${stacks.join(", ")}`);
    process.exit(0);
  }

  for (const p of packages) {
    try {
      execSync(`pulumi stack select ${chosen}`, { cwd: p.dir, encoding: "utf8", stdio: "pipe" });
    } catch (_) {
      run(`pulumi stack init ${chosen}`, p.dir);
      run(`pulumi stack select ${chosen}`, p.dir);
      console.log(`Stack "${chosen}" creado en ${p.label}.`);
    }
  }
  for (const p of packages) {
    run(`pulumi stack select ${chosen}`, p.dir, true);
  }
  fs.writeFileSync(path.join(ROOT, ".pulumi-selected-stack"), chosen, "utf8");
  console.log(`Stack cambiado a "${chosen}". El setup aplicará la config a este stack.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
