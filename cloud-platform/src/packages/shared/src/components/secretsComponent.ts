/**
 * Secrets component - provider agnostic interface.
 * Secrets Manager / Key Vault / Secret Manager equivalent.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface SecretsComponentArgs {
  name: string;
  provider: CloudProvider;
  region: string;
  tags?: Record<string, string>;
}

export interface SecretsComponentOutputs {
  secretsStoreId: Output<string>;
  arnOrUri: Output<string>;
}

export interface ISecretsComponentAdapter {
  create(args: SecretsComponentArgs): SecretsComponentOutputs;
}
