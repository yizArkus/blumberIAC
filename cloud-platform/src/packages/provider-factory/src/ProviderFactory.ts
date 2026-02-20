import type { CloudProvider } from "@cloud-platform/shared";
import type { IProviderAdapters } from "./types";
import { awsAdapters } from "./aws";
import { azureAdapters } from "./azure";
import { gcpAdapters } from "./gcp";

/**
 * Returns the set of component adapters for the given cloud provider.
 * Provider is typically set via stack config: pulumi config set cloud:provider aws
 */
export function getProvider(provider: CloudProvider): IProviderAdapters {
  switch (provider) {
    case "aws":
      return awsAdapters;
    case "azure":
      return azureAdapters;
    case "gcp":
      return gcpAdapters;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
