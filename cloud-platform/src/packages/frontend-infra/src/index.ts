import * as pulumi from "@pulumi/pulumi";
import { createResources } from "@cloud-platform/provider-factory";
import type { CloudProvider } from "@cloud-platform/shared";
import { getFrontendResources } from "./resources";

const config = new pulumi.Config();

function requireNumber(key: string): number {
  const v = config.getNumber(key);
  if (v === undefined) {
    throw new Error(`Config requerida faltante: "${key}". Declárala en Pulumi.<stack>.yaml o: pulumi config set ${key} <valor>`);
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
const enableDns = config.getBoolean("enableDns") ?? false;
const enableWaf = config.getBoolean("enableWaf") ?? false;

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
  enableDns,
  enableWaf,
});

const ctx = createResources(provider, resources, {
  provider,
  region,
  tags,
});

const frontendHosting = ctx.frontendHosting as { appUrl: pulumi.Output<string>; appId: pulumi.Output<string> };

export const frontendAppUrl = frontendHosting.appUrl;
export const frontendAppId = frontendHosting.appId;
export const providerOut = provider;
export const regionOut = region;
export const budgetLimitOut = budgetLimit;

export const dnsZoneId = enableDns ? (ctx.dns as { zoneId: pulumi.Output<string> }).zoneId : undefined;
export const dnsNameServers = enableDns ? (ctx.dns as { nameServers: pulumi.Output<string[]> }).nameServers : undefined;
export const firewallId = enableWaf ? (ctx.firewall as { firewallId: pulumi.Output<string> }).firewallId : undefined;
