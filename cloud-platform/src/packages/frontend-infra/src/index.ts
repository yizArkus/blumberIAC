import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { createResources } from "@cloud-platform/provider-factory";
import type { CloudProvider } from "@cloud-platform/shared";
import { getFrontendResources } from "./resources";

const config = new pulumi.Config();

function requireNumber(key: string): number {
  const v = config.getNumber(key);
  if (v === undefined) {
    throw new Error(`Missing required config: "${key}". Declare it in Pulumi.<stack>.yaml or: pulumi config set ${key} <value>`);
  }
  return v;
}

function requireBoolean(key: string): boolean {
  const v = config.getBoolean(key);
  if (v === undefined) {
    throw new Error(`Missing required config: "${key}". Declare it in Pulumi.<stack>.yaml or: pulumi config set ${key} true|false`);
  }
  return v;
}

const provider = config.require("cloudProvider") as CloudProvider;
const region = config.require("cloudRegion");
const budgetLimit = requireNumber("budgetLimit");
const domain = config.require("domain");
const stackName = pulumi.getStack();
const repoUrl = config.get("frontendRepoUrl");
const branch = config.get("frontendBranch");
const framework = config.get("frontendFramework");
const githubToken = config.getSecret("githubToken");
const appRootRaw = config.require("frontendAppRoot");
const appRoot = appRootRaw === "" ? undefined : appRootRaw;
const enableDns = requireBoolean("enableDns");
/** WAF is never created in dev/staging; in other stacks (e.g. prod) use config. */
const enableWaf =
  stackName === "dev" || stackName === "staging" ? false : requireBoolean("enableWaf");
/** If true, WAF is not associated to the Amplify app (use when you will associate the Web ACL manually). */
const skipWafAssociation = config.getBoolean("skipWafAssociation") ?? false;

if (repoUrl && !githubToken) {
  pulumi.log.error(
    `Stack "${stackName}": frontendRepoUrl is set but githubToken is missing. ` +
      "Token is per stack. Run: cd src/packages/frontend-infra && pulumi stack select " +
      stackName +
      " && echo YOUR_TOKEN | pulumi config set --secret githubToken -"
  );
  throw new Error(
    `Missing githubToken for stack "${stackName}". Configure with: pulumi config set --secret githubToken <token> (in frontend-infra)`
  );
}

const tags = {
  Project: "cloud-platform",
  Stack: stackName,
  Component: "frontend-infra",
};

const resources = getFrontendResources(stackName, {
  domain,
  repoUrl,
  branch,
  framework,
  accessToken: githubToken,
  appRoot,
  enableDns,
  enableWaf,
});

const ctx = createResources(provider, resources, {
  provider,
  region,
  tags,
});

const frontendHosting = ctx.frontendHosting as {
  appUrl: pulumi.Output<string>;
  appId: pulumi.Output<string>;
  appArn?: pulumi.Output<string>;
};

export const frontendAppUrl = frontendHosting.appUrl;
export const frontendAppId = frontendHosting.appId;
export const providerOut = provider;
export const regionOut = region;
export const budgetLimitOut = budgetLimit;

export const dnsZoneId = enableDns ? (ctx.dns as { zoneId: pulumi.Output<string> }).zoneId : undefined;
export const dnsNameServers = enableDns ? (ctx.dns as { nameServers: pulumi.Output<string[]> }).nameServers : undefined;
const firewallOut = enableWaf ? (ctx.firewall as { firewallId: pulumi.Output<string>; firewallArn?: pulumi.Output<string> }) : undefined;
export const firewallId = firewallOut?.firewallId;
export const firewallArn = firewallOut?.firewallArn;

// WAF association to Amplify app (WebAclAssociation does not support update, only replace)
const wafGlobalRegion = "us-east-1";
const wafProvider = provider === "aws" ? new aws.Provider("waf-global", { region: wafGlobalRegion }) : undefined;

if (enableWaf && firewallOut?.firewallArn && !skipWafAssociation && provider === "aws" && frontendHosting.appArn && wafProvider) {
  new aws.wafv2.WebAclAssociation("waf-to-amplify", {
    resourceArn: frontendHosting.appArn,
    webAclArn: firewallOut.firewallArn,
  }, {
    provider: wafProvider,
    replaceOnChanges: ["resourceArn", "webAclArn"],
  });
}
