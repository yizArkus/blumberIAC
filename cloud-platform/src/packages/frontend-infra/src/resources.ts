/**
 * Definición declarativa de recursos del frontend.
 * Hosting: Amplify (AWS) / Static Web Apps (Azure) / Firebase Hosting (GCP).
 */
import type { ResourceDescriptor } from "@cloud-platform/shared";

export interface FrontendResourcesOptions {
  domain: string;
  repoUrl?: string;
  branch?: string;
  framework?: string;
  /** Enable Route53 hosted zone (requires route53:*). Default false so deploy works with only Amplify permissions. */
  enableDns?: boolean;
  /** Enable WAF Web ACL (requires wafv2:*). Default false so deploy works with only Amplify permissions. */
  enableWaf?: boolean;
}

export function getFrontendResources(
  stackName: string,
  options: FrontendResourcesOptions
): ResourceDescriptor[] {
  const { domain, repoUrl, branch, framework, enableDns, enableWaf } = options;
  const resources: ResourceDescriptor[] = [
    {
      type: "frontendHosting",
      key: "frontendHosting",
      name: `frontend-${stackName}`,
      repoUrl,
      branch,
      framework,
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
