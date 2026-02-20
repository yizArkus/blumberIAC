/**
 * Frontend hosting component - provider-agnostic interface.
 * Equivalents:
 * - AWS: Amplify (hosting + CDN + CI/CD desde repo, auth opcional)
 * - Azure: Static Web Apps (hosting + CDN + CI/CD, Azure Functions, auth)
 * - GCP: Firebase Hosting (hosting + CDN + CI/CD, Cloud Functions, Firebase Auth)
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface FrontendHostingComponentArgs {
  name: string;
  provider: CloudProvider;
  region: string;
  tags?: Record<string, string>;
  /** Repo Git para CI/CD (GitHub, etc.). Opcional: despliegue manual. */
  repoUrl?: string;
  /** Rama por defecto (ej. "main"). */
  branch?: string;
  /** Framework para hints de build (React, Vue, Angular). */
  framework?: string;
}

export interface FrontendHostingComponentOutputs {
  /** URL pública del frontend (Amplify / Static Web Apps / Firebase). */
  appUrl: Output<string>;
  /** Id de la app en el proveedor (para refs o consola). */
  appId: Output<string>;
}

export interface IFrontendHostingComponentAdapter {
  create(args: FrontendHostingComponentArgs): FrontendHostingComponentOutputs;
}
