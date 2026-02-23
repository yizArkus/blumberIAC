#!/usr/bin/env node
/**
 * Applies Pulumi config to the selected stack. Prompts user for provider and region.
 * Usage: node apply-stack-config.js <defaultStack> <frontendDir> <backendDir> <infraPermsDir> [frontendRepoUrl] [frontendBranch]
 */
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const [defaultStack, frontendDir, backendDir, infraPermsDir, frontendRepoUrl = "", frontendBranch = "main"] = process.argv.slice(2);
if (!defaultStack || !frontendDir || !backendDir || !infraPermsDir) {
  console.error("Usage: node apply-stack-config.js <defaultStack> <frontendDir> <backendDir> <infraPermsDir> [frontendRepoUrl] [frontendBranch]");
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
  let savedOrg = "";
  let savedApp = "";
  let savedRepoUrl = frontendRepoUrl || "";
  let savedBranch = frontendBranch || "main";
  let savedDeployPrincipalArn = "";
  let savedFrontendAppRoot = "";
  if (fs.existsSync(setupFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(setupFile, "utf8"));
      if (saved.cloudProvider) cloudProvider = saved.cloudProvider;
      if (saved.cloudRegion) cloudRegion = saved.cloudRegion;
      if (saved.org) savedOrg = saved.org;
      if (saved.app) savedApp = saved.app;
      if (saved.frontendRepoUrl != null) savedRepoUrl = saved.frontendRepoUrl;
      if (saved.frontendBranch) savedBranch = saved.frontendBranch;
      if (saved.frontendAppRoot != null) savedFrontendAppRoot = saved.frontendAppRoot;
      if (saved.deployPrincipalArn) savedDeployPrincipalArn = saved.deployPrincipalArn;
    } catch (_) {}
  }

  console.log("\n--- Naming (org-app-stack-logicalName-hash) ---");
  const orgAnswer = await ask(`Org (e.g. my-org) [${savedOrg || "my-org"}]: `);
  const appAnswer = await ask(`App (e.g. my-app) [${savedApp || "my-app"}]: `);
  const finalOrg = orgAnswer || savedOrg || "my-org";
  const finalApp = appAnswer || savedApp || "my-app";

  console.log("\n--- Provider and region (applied to frontend, backend and infra-permissions) ---");
  console.log("The region you choose is saved in the stack config (Pulumi.<stack>.yaml) and the code reads it from there.");
  const providerAnswer = await ask(`Cloud provider (e.g. aws) [${cloudProvider}]: `);
  const regionAnswer = await ask(`Region (e.g. us-east-1, us-west-2, eu-west-1) [${cloudRegion}]: `);
  cloudProvider = providerAnswer || cloudProvider;
  cloudRegion = regionAnswer || cloudRegion;

  console.log("\n--- GitHub repo (frontend / Amplify) ---");
  const repoPrompt = savedRepoUrl
    ? `Repo URL (e.g. https://github.com/user/repo) [${savedRepoUrl}]: `
    : "Repo URL (e.g. https://github.com/user/repo; empty = no repo, connect later in console) []: ";
  const repoAnswer = await ask(repoPrompt);
  const branchAnswer = await ask(`Branch (e.g. main) [${savedBranch}]: `);
  const appRootLabel = savedFrontendAppRoot === "" ? "root (no monorepo)" : savedFrontendAppRoot;
  const appRootAnswer = await ask(`Path to frontend in repo (Enter = root; monorepo = e.g. front-end) [${appRootLabel}]: `);
  const tokenAnswer = await ask("GitHub token (optional; stored as secret in Pulumi; empty = do not save): ");

  const finalRepoUrl = repoAnswer !== "" ? repoAnswer : savedRepoUrl;
  const finalBranch = branchAnswer || savedBranch;
  const finalAppRoot = (appRootAnswer === "." || appRootAnswer.toLowerCase() === "root") ? "" : (appRootAnswer || savedFrontendAppRoot);

  console.log("\n--- Deploy permissions (infra-permissions) ---");
  if (cloudProvider !== "aws") {
    console.log("(Only AWS uses deployPrincipalArn; for Azure/GCP infra-permissions is not implemented yet.)");
  } else {
    console.log("Who can assume the 'infra-deployer' role to deploy? (your IAM user or a CI role)");
  }
  const principalPrompt = savedDeployPrincipalArn
    ? `Principal ARN (e.g. arn:aws:iam::123456789012:user/my-user) [${savedDeployPrincipalArn}]: `
    : "Principal ARN (e.g. arn:aws:iam::123456789012:user/my-user) []: ";
  const deployPrincipalAnswer = await ask(principalPrompt);
  const finalDeployPrincipalArn = deployPrincipalAnswer || savedDeployPrincipalArn;
  if (cloudProvider === "aws" && !finalDeployPrincipalArn) {
    console.error("deployPrincipalArn is required for AWS. Example: arn:aws:iam::123456789012:user/your-user");
    process.exit(2);
  }

  fs.writeFileSync(
    setupFile,
    JSON.stringify(
      {
        org: finalOrg,
        app: finalApp,
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
    `Will use: org=${finalOrg}, app=${finalApp}, provider=${cloudProvider}, region=${cloudRegion}, repo=${finalRepoUrl || "(none)"}, branch=${finalBranch}, appRoot=${finalAppRoot || "(root)"}, deployPrincipal=${finalDeployPrincipalArn}\n`
  );

  // Generate amplify.yml only for AWS (Amplify); Azure Static Web Apps uses its own config.
  if (cloudProvider === "aws") {
  const repoRoot = process.env.REPO_ROOT ? path.resolve(process.env.REPO_ROOT) : path.join(ROOT, "..");
  const amplifyYmlPath = path.join(repoRoot, "amplify.yml");
  const amplifyYmlContent = finalAppRoot
    ? `# Generated by make setup (monorepo: appRoot=${finalAppRoot}). Edit if you change the path.
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
    : `# Generated by make setup (no monorepo: frontend at root). Edit if you change the structure.
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
    console.log(`amplify.yml written to ${amplifyYmlPath} (appRoot=${finalAppRoot || "root"}).\n`);
  } catch (e) {
    console.warn(`Could not write amplify.yml to ${amplifyYmlPath}:`, e.message);
  }
  }

  // Frontend
  run(`pulumi stack select ${stack}`, FRONTEND);
  run(`pulumi config set org ${finalOrg}`, FRONTEND);
  run(`pulumi config set app ${finalApp}`, FRONTEND);
  run(`pulumi config set cloudProvider ${cloudProvider}`, FRONTEND);
  run(`pulumi config set cloudRegion ${cloudRegion}`, FRONTEND);
  // Same region for AWS provider (code uses cloudRegion; provider uses aws:region).
  if (cloudProvider === "aws") run(`pulumi config set aws:region ${cloudRegion}`, FRONTEND);
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
  run(`pulumi config set org ${finalOrg}`, BACKEND);
  run(`pulumi config set app ${finalApp}`, BACKEND);
  run(`pulumi config set cloudProvider ${cloudProvider}`, BACKEND);
  run(`pulumi config set cloudRegion ${cloudRegion}`, BACKEND);
  if (cloudProvider === "aws") run(`pulumi config set aws:region ${cloudRegion}`, BACKEND);
  run(`pulumi config set --secret database:password "${DB_PASSWORD}"`, BACKEND);

  // Infra-permissions
  run(`pulumi stack select ${stack}`, INFRA_PERMS);
  run(`pulumi config set org ${finalOrg}`, INFRA_PERMS);
  run(`pulumi config set app ${finalApp}`, INFRA_PERMS);
  run(`pulumi config set cloudProvider ${cloudProvider}`, INFRA_PERMS);
  run(`pulumi config set cloudRegion ${cloudRegion}`, INFRA_PERMS);
  if (cloudProvider === "aws") run(`pulumi config set aws:region ${cloudRegion}`, INFRA_PERMS);
  if (cloudProvider === "aws" && finalDeployPrincipalArn) {
    run(`pulumi config set deployPrincipalArn "${finalDeployPrincipalArn.replace(/"/g, '\\"')}"`, INFRA_PERMS);
  }

  if (fs.existsSync(RUNTIME_PERMS)) {
    try {
      run(`pulumi stack select ${stack}`, RUNTIME_PERMS);
    } catch (_) {
      run(`pulumi stack init ${stack}`, RUNTIME_PERMS);
      run(`pulumi stack select ${stack}`, RUNTIME_PERMS);
    }
    run(`pulumi config set org ${finalOrg}`, RUNTIME_PERMS);
    run(`pulumi config set app ${finalApp}`, RUNTIME_PERMS);
    run(`pulumi config set cloudProvider ${cloudProvider}`, RUNTIME_PERMS);
    run(`pulumi config set cloudRegion ${cloudRegion}`, RUNTIME_PERMS);
    if (cloudProvider === "aws") run(`pulumi config set aws:region ${cloudRegion}`, RUNTIME_PERMS);
  }

  console.log(`Setup done. Stack: ${stack}, provider: ${cloudProvider}, region: ${cloudRegion}. Next: make deploy-permissions STACK=${stack}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});