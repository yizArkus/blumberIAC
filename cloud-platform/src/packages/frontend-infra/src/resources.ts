/**
 * Definición declarativa de recursos del frontend.
 * Hosting: Amplify (AWS) / Static Web Apps (Azure) / Firebase Hosting (GCP).
 */
import * as pulumi from "@pulumi/pulumi";
import type { ResourceDescriptor } from "@cloud-platform/shared";

export interface FrontendResourcesOptions {
  domain: string;
  repoUrl?: string;
  branch?: string;
  framework?: string;
  /** Token GitHub (u otro) para conectar el repo; requerido si repoUrl está definido (Amplify). */
  accessToken?: pulumi.Output<string>;
  /** Ruta al frontend en el repo (monorepo). Ej: "front-end" para que npm ci/build corran ahí y haya package-lock.json. */
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
      name: `frontend-${stackName}`,
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
      name: `frontend-dns-${stackName}`,
      domain,
    });
  }
  if (enableWaf) {
    resources.push({
      type: "firewall",
      key: "firewall",
      name: `frontend-waf-${stackName}`,
      scope: "global",
    });
  }
  return resources;
}
