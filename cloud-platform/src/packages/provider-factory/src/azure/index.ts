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
} from "@cloud-platform/shared";

function unsupported(component: string): never {
  throw new Error(`Azure adapter for ${component} is not implemented. Extend src/packages/provider-factory/src/azure/`);
}

export const azureAdapters: IProviderAdapters = {
  network: { create: () => unsupported("network") },
  loadBalancer: { create: () => unsupported("loadBalancer") },
  containerService: { create: () => unsupported("containerService") },
  database: { create: () => unsupported("database") },
  secrets: { create: () => unsupported("secrets") },
  monitoring: { create: () => unsupported("monitoring") },
  firewall: { create: () => unsupported("firewall") },
  dns: { create: () => unsupported("dns") },
  cdn: { create: () => unsupported("cdn") },
  frontendHosting: { create: () => unsupported("frontendHosting (Static Web Apps)") },
};
