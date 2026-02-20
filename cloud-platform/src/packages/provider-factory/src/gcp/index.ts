import type { IProviderAdapters } from "../types";

function unsupported(component: string): never {
  throw new Error(`GCP adapter for ${component} is not implemented. Extend src/packages/provider-factory/src/gcp/`);
}

export const gcpAdapters: IProviderAdapters = {
  network: { create: () => unsupported("network") },
  loadBalancer: { create: () => unsupported("loadBalancer") },
  containerService: { create: () => unsupported("containerService") },
  database: { create: () => unsupported("database") },
  secrets: { create: () => unsupported("secrets") },
  monitoring: { create: () => unsupported("monitoring") },
  firewall: { create: () => unsupported("firewall") },
  dns: { create: () => unsupported("dns") },
  cdn: { create: () => unsupported("cdn") },
  frontendHosting: { create: () => unsupported("frontendHosting (Firebase Hosting)") },
};
