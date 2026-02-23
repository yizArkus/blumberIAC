/**
 * Declarative frontend resource definitions.
 * Hosting: Amplify (AWS) / Static Web Apps (Azure) / Firebase Hosting (GCP).
 */
import * as pulumi from "@pulumi/pulumi";
import { nameTag } from "@cloud-platform/shared";
import type { ResourceDescriptor } from "@cloud-platform/shared";

export interface FrontendResourcesOptions {
  domain: string;
  repoUrl?: string;
  branch?: string;
  framework?: string;
  /** GitHub (or other) token to connect the repo; required if repoUrl is set (Amplify). */
  accessToken?: pulumi.Output<string>;
  /** Path to frontend in repo (monorepo). E.g. "front-end" so npm ci/build run there and package-lock.json exists. */
  appRoot?: string;
  /** Enable Route53 hosted zone (requires route53:*). Default false so deploy works with only Amplify permissions. */
  enableDns?: boolean;
  /** Enable WAF Web ACL (requires wafv2:*). Default false so deploy works with only Amplify permissions. */
  enableWaf?: boolean;
}

export function getFrontendResources(
  stackName: string,
  options: FrontendResourcesOptions
): ResourceDescriptor[] {
  const { domain, repoUrl, branch, framework, accessToken, appRoot, enableDns, enableWaf } = options;
  const resources: ResourceDescriptor[] = [
    {
      type: "frontendHosting",
      key: "frontendHosting",
      name: nameTag("frontend"),
      repoUrl,
      branch,
      framework,
      accessToken,
      appRoot,
    },
  ];
  if (enableDns) {
    resources.push({
      type: "dns",
      key: "dns",
      name: nameTag("frontend-dns"),
      domain,
    });
  }
  if (enableWaf) {
    resources.push({
      type: "firewall",
      key: "firewall",
      name: nameTag("frontend-waf"),
      scope: "global",
    });
  }
  return resources;
}
