import type { IProviderAdapters } from "../types";
import type {
  NetworkComponentArgs,
  LoadBalancerComponentArgs,
  ContainerServiceComponentArgs,
  DatabaseComponentArgs,
  SecretsComponentArgs,
  MonitoringComponentArgs,
  FirewallComponentArgs,
  DnsComponentArgs,
  CdnComponentArgs,
  FrontendHostingComponentArgs,
} from "@cloud-platform/shared";
import { createAwsNetwork } from "./network";
import { createAwsLoadBalancer } from "./loadBalancer";
import { createAwsContainerService } from "./containerService";
import { createAwsDatabase } from "./database";
import { createAwsSecrets } from "./secrets";
import { createAwsMonitoring } from "./monitoring";
import { createAwsFirewall } from "./firewall";
import { createAwsDns } from "./dns";
import { createAwsCdn } from "./cdn";
import { createAwsFrontendHosting } from "./frontendHosting";

export const awsAdapters: IProviderAdapters = {
  network: { create: (args) => createAwsNetwork(args) },
  loadBalancer: { create: (args) => createAwsLoadBalancer(args) },
  containerService: { create: (args) => createAwsContainerService(args) },
  database: { create: (args) => createAwsDatabase(args) },
  secrets: { create: (args) => createAwsSecrets(args) },
  monitoring: { create: (args) => createAwsMonitoring(args) },
  firewall: { create: (args) => createAwsFirewall(args) },
  dns: { create: (args) => createAwsDns(args) },
  cdn: { create: (args: CdnComponentArgs) => createAwsCdn(args) },
  frontendHosting: { create: (args: FrontendHostingComponentArgs) => createAwsFrontendHosting(args) },
};
