#!/usr/bin/env node
/**
 * Aplica la config de Pulumi al stack elegido. Pide al usuario proveedor y región de forma consciente.
 * Uso: node apply-stack-config.js <defaultStack> <frontendDir> <backendDir> <infraPermsDir> [frontendRepoUrl] [frontendBranch]
 */
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const [defaultStack, frontendDir, backendDir, infraPermsDir, frontendRepoUrl = "", frontendBranch = "main"] = process.argv.slice(2);
if (!defaultStack || !frontendDir || !backendDir || !infraPermsDir) {
  console.error("Uso: node apply-stack-config.js <defaultStack> <frontendDir> <backendDir> <infraPermsDir> [frontendRepoUrl] [frontendBranch]");
  process.exit(2);
}

const ROOT = path.resolve(process.cwd());
const stackFile = path.join(ROOT, ".pulumi-selected-stack");
const setupFile = path.join(ROOT, ".pulumi-setup.json");
let stack = defaultStack;
if (fs.existsSync(stackFile)) {
  stack = fs.readFileSync(stackFile, "utf8").trim() || defaultStack;
}

const FRONTEND = path.resolve(ROOT, frontendDir);
const BACKEND = path.resolve(ROOT, backendDir);
const INFRA_PERMS = path.resolve(ROOT, infraPermsDir);
const RUNTIME_PERMS = path.join(ROOT, "src", "packages", "runtime-permissions");
const DB_PASSWORD = process.env.DB_PASSWORD || "changeme";

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || "").trim().replace(/\r/g, ""));
    });
  });
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, encoding: "utf8", stdio: "inherit" });
}

async function main() {
  let cloudProvider = "aws";
  let cloudRegion = "us-east-1";
  let savedRepoUrl = frontendRepoUrl || "";
  let savedBranch = frontendBranch || "main";
  let savedDeployPrincipalArn = "";
  let savedFrontendAppRoot = "";
  if (fs.existsSync(setupFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(setupFile, "utf8"));
      if (saved.cloudProvider) cloudProvider = saved.cloudProvider;
      if (saved.cloudRegion) cloudRegion = saved.cloudRegion;
      if (saved.frontendRepoUrl != null) savedRepoUrl = saved.frontendRepoUrl;
      if (saved.frontendBranch) savedBranch = saved.frontendBranch;
      if (saved.frontendAppRoot != null) savedFrontendAppRoot = saved.frontendAppRoot;
      if (saved.deployPrincipalArn) savedDeployPrincipalArn = saved.deployPrincipalArn;
    } catch (_) {}
  }

  console.log("\n--- Proveedor y región (se aplican a frontend, backend e infra-permissions) ---");
  const providerAnswer = await ask(`Cloud provider (ej. aws) [${cloudProvider}]: `);
  const regionAnswer = await ask(`Región (ej. us-east-1, eu-west-1) [${cloudRegion}]: `);
  cloudProvider = providerAnswer || cloudProvider;
  cloudRegion = regionAnswer || cloudRegion;

  console.log("\n--- Repositorio GitHub (frontend / Amplify) ---");
  const repoPrompt = savedRepoUrl
    ? `URL del repo (ej. https://github.com/usuario/repo) [${savedRepoUrl}]: `
    : "URL del repo (ej. https://github.com/usuario/repo; vacío = sin repo, conectar después en consola) []: ";
  const repoAnswer = await ask(repoPrompt);
  const branchAnswer = await ask(`Rama (ej. main) [${savedBranch}]: `);
  const appRootLabel = savedFrontendAppRoot === "" ? "raíz (no monorepo)" : savedFrontendAppRoot;
  const appRootAnswer = await ask(`Ruta al frontend en el repo (Enter = raíz; monorepo = ej. front-end) [${appRootLabel}]: `);
  const tokenAnswer = await ask("Token de GitHub (opcional; se guarda como secreto en Pulumi; vacío = no guardar): ");

  const finalRepoUrl = repoAnswer !== "" ? repoAnswer : savedRepoUrl;
  const finalBranch = branchAnswer || savedBranch;
  const finalAppRoot = (appRootAnswer === "." || appRootAnswer.toLowerCase() === "root") ? "" : (appRootAnswer || savedFrontendAppRoot);

  console.log("\n--- Permisos de deploy (infra-permissions) ---");
  if (cloudProvider !== "aws") {
    console.log("(Solo AWS usa deployPrincipalArn; para Azure/GCP infra-permissions no está implementado aún.)");
  } else {
    console.log("¿Quién puede asumir el rol 'infra-deployer' para desplegar? (tu usuario IAM o un rol de CI)");
  }
  const principalPrompt = savedDeployPrincipalArn
    ? `ARN del principal (ej. arn:aws:iam::123456789012:user/mi-usuario) [${savedDeployPrincipalArn}]: `
    : "ARN del principal (ej. arn:aws:iam::123456789012:user/mi-usuario) []: ";
  const deployPrincipalAnswer = await ask(principalPrompt);
  const finalDeployPrincipalArn = deployPrincipalAnswer || savedDeployPrincipalArn;
  if (cloudProvider === "aws" && !finalDeployPrincipalArn) {
    console.error("deployPrincipalArn es obligatorio para AWS. Ejemplo: arn:aws:iam::123456789012:user/tu-usuario");
    process.exit(2);
  }

  fs.writeFileSync(
    setupFile,
    JSON.stringify(
      {
        cloudProvider,
        cloudRegion,
        frontendRepoUrl: finalRepoUrl,
        frontendBranch: finalBranch,
        frontendAppRoot: finalAppRoot,
        deployPrincipalArn: finalDeployPrincipalArn,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(
    `Se usará: provider=${cloudProvider}, region=${cloudRegion}, repo=${finalRepoUrl || "(ninguno)"}, branch=${finalBranch}, appRoot=${finalAppRoot || "(raíz)"}, deployPrincipal=${finalDeployPrincipalArn}\n`
  );

  // Generar amplify.yml solo para AWS (Amplify); Azure Static Web Apps usa su propia config.
  if (cloudProvider === "aws") {
  const repoRoot = process.env.REPO_ROOT ? path.resolve(process.env.REPO_ROOT) : path.join(ROOT, "..");
  const amplifyYmlPath = path.join(repoRoot, "amplify.yml");
  const amplifyYmlContent = finalAppRoot
    ? `# Generado por make setup (monorepo: appRoot=${finalAppRoot}). Edita si cambias la ruta.
version: 1
applications:
  - appRoot: ${finalAppRoot}
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
`
    : `# Generado por make setup (no monorepo: frontend en la raíz). Edita si cambias la estructura.
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
`;
  try {
    fs.writeFileSync(amplifyYmlPath, amplifyYmlContent, "utf8");
    console.log(`amplify.yml generado en ${amplifyYmlPath} (appRoot=${finalAppRoot || "raíz"}).\n`);
  } catch (e) {
    console.warn(`No se pudo escribir amplify.yml en ${amplifyYmlPath}:`, e.message);
  }
  }

  // Frontend
  run(`pulumi stack select ${stack}`, FRONTEND);
  run(`pulumi config set cloudProvider ${cloudProvider}`, FRONTEND);
  run(`pulumi config set cloudRegion ${cloudRegion}`, FRONTEND);
  run("pulumi config set domain example.com", FRONTEND);
  run("pulumi config set budgetLimit 150", FRONTEND);
  if (finalRepoUrl) run(`pulumi config set frontendRepoUrl ${finalRepoUrl}`, FRONTEND);
  run(`pulumi config set frontendBranch ${finalBranch}`, FRONTEND);
  run(`pulumi config set frontendAppRoot ${finalAppRoot}`, FRONTEND);
  if (tokenAnswer) {
    spawnSync("pulumi", ["config", "set", "--secret", "githubToken"], {
      cwd: FRONTEND,
      input: tokenAnswer,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    });
  }

  // Backend
  run(`pulumi stack select ${stack}`, BACKEND);
  run(`pulumi config set cloudProvider ${cloudProvider}`, BACKEND);
  run(`pulumi config set cloudRegion ${cloudRegion}`, BACKEND);
  run(`pulumi config set --secret database:password "${DB_PASSWORD}"`, BACKEND);

  // Infra-permissions
  run(`pulumi stack select ${stack}`, INFRA_PERMS);
  run(`pulumi config set cloudProvider ${cloudProvider}`, INFRA_PERMS);
  run(`pulumi config set cloudRegion ${cloudRegion}`, INFRA_PERMS);
  if (cloudProvider === "aws" && finalDeployPrincipalArn) {
    run(`pulumi config set deployPrincipalArn "${finalDeployPrincipalArn.replace(/"/g, '\\"')}"`, INFRA_PERMS);
  }

  if (fs.existsSync(RUNTIME_PERMS)) {
    run(`pulumi stack select ${stack}`, RUNTIME_PERMS);
    run(`pulumi config set cloudProvider ${cloudProvider}`, RUNTIME_PERMS);
    run(`pulumi config set cloudRegion ${cloudRegion}`, RUNTIME_PERMS);
  }

  console.log(`Setup listo. Stack: ${stack}, provider: ${cloudProvider}, region: ${cloudRegion}. Siguiente: make deploy-permissions STACK=${stack}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});