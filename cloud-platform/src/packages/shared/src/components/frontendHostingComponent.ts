/**
 * Frontend hosting component - provider-agnostic interface.
 * Equivalents:
 * - AWS: Amplify (hosting + CDN + CI/CD from repo, auth optional)
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
  /** Git repo for CI/CD (GitHub, etc.). Optional: manual deploy. */
  repoUrl?: string;
  /** Default branch (e.g. "main"). */
  branch?: string;
  /** Framework for build hints (React, Vue, Angular). */
  framework?: string;
  /** Access token (GitHub PAT, etc.); required if repoUrl is set (Amplify requires it). */
  accessToken?: string | Output<string>;
  /** Path to frontend inside repo (monorepo). E.g. "front-end" so npm ci/build run there. */
  appRoot?: string;
}

export interface FrontendHostingComponentOutputs {
  /** Public frontend URL (Amplify / Static Web Apps / Firebase). */
  appUrl: Output<string>;
  /** App id in the provider (for refs or console). */
  appId: Output<string>;
  /** App ARN (e.g. for associating WAF in Amplify: AssociateWebACL). */
  appArn?: Output<string>;
}

export interface IFrontendHostingComponentAdapter {
  create(args: FrontendHostingComponentArgs): FrontendHostingComponentOutputs;
}
