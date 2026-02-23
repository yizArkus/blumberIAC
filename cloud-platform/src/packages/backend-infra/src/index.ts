import * as pulumi from "@pulumi/pulumi";
import { createResources } from "@cloud-platform/provider-factory";
import type { CloudProvider } from "@cloud-platform/shared";
import { getBackendResources, type BackendResourcesConfig } from "./resources";

const config = new pulumi.Config();

function requireNumber(key: string): number {
  const v = config.getNumber(key);
  if (v === undefined) {
    throw new Error(`Missing required config: "${key}". Declare it in Pulumi.<stack>.yaml or: pulumi config set ${key} <value>`);
  }
  return v;
}

const provider = config.require("cloudProvider") as CloudProvider;
const region = config.require("cloudRegion");
const instanceSize = config.require("instanceSize");
const dbSize = config.require("dbSize");
const minCapacity = requireNumber("minCapacity");
const maxCapacity = requireNumber("maxCapacity");
const budgetLimit = requireNumber("budgetLimit");
const containerImage = config.require("containerImage");
const stackName = pulumi.getStack();

const databaseConfig = {
  engine: config.require("database:engine"),
  engineVersion: config.require("database:engineVersion"),
  username: config.require("database:username"),
  password: config.requireSecret("database:password"),
  storageGb: requireNumber("database:storageGb"),
  storageType: config.require("database:storageType"),
  dbName: config.require("database:dbName"),
  publiclyAccessible: config.requireBoolean("database:publiclyAccessible"),
  skipFinalSnapshot: config.requireBoolean("database:skipFinalSnapshot"),
};

const tags = {
  Project: "cloud-platform",
  Stack: stackName,
  Component: "backend-infra",
};

const resources = getBackendResources(stackName, {
  dbSize,
  minCapacity,
  maxCapacity,
  containerImage,
  database: databaseConfig,
});

const ctx = createResources(provider, resources, {
  provider,
  region,
  tags,
});

const network = ctx.network as { vpcId: pulumi.Output<string>; publicSubnetIds: pulumi.Output<string[]>; privateSubnetIds: pulumi.Output<string[]> };
const loadBalancer = ctx.loadBalancer as { url: pulumi.Output<string>; dnsName: pulumi.Output<string> };
const containerService = ctx.containerService as { endpoint: pulumi.Output<string> };
const database = ctx.database as { endpoint: pulumi.Output<string>; host: pulumi.Output<string>; port: pulumi.Output<number> };
const secrets = ctx.secrets as { arnOrUri: pulumi.Output<string> };
const monitoring = ctx.monitoring as { logGroupId: pulumi.Output<string> };

export const networkVpcId = network.vpcId;
export const loadBalancerUrl = loadBalancer.url;
export const loadBalancerDnsName = loadBalancer.dnsName;
export const containerServiceEndpoint = containerService.endpoint;
export const databaseEndpoint = database.endpoint;
export const databaseHost = database.host;
export const databasePort = database.port;
export const secretsStoreArn = secrets.arnOrUri;
export const logGroupId = monitoring.logGroupId;
export const providerOut = provider;
export const regionOut = region;
export const budgetLimitOut = budgetLimit;
