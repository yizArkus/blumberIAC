/**
 * Provider-agnostic types. No cloud SDK imports.
 */

export type CloudProvider = "aws" | "azure" | "gcp";

/** Tamaños abstractos: cada config (aws/azure/gcp) los traduce al tipo del provider */
export type InstanceSizeTier = "micro" | "small" | "medium";
export type DbSizeTier = "micro" | "small" | "medium";

/**
 * Configuración de stack agnóstica al provider.
 * Solo usa tiers (micro/small/medium); NUNCA tipos concretos (t3.micro, etc.).
 */
export interface StackConfigBase {
  environment: "dev" | "staging" | "prod";
  instanceSizeTier: InstanceSizeTier;
  dbSizeTier: DbSizeTier;
  minCapacity: number;
  maxCapacity: number;
  budgetLimit: number;
  region: string;
}

/**
 * Config resuelta con tamaños del provider (instanceSize/dbSize concretos por cloud).
 */
export interface StackConfig extends StackConfigBase {
  instanceSize: string;
  dbSize: string;
}

export const DEFAULT_BUDGET_LIMIT_USD = 150;
