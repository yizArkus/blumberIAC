import * as aws from "@pulumi/aws";
import type {
  FirewallComponentArgs,
  FirewallComponentOutputs,
} from "@cloud-platform/shared";

/**
 * Web ACL with CLOUDFRONT scope to associate to the Amplify app.
 * Cost constraints: no logging, no Bot Control; only CommonRuleSet, IpReputation and rate limit.
 * Keeps cost below ~$16/month.
 *
 * CLOUDFRONT-scoped Web ACLs can only be created in us-east-1 (AWS requirement).
 * We use an explicit provider in us-east-1 when scope is global.
 */
/** Max requests per IP; evaluated over RATE_LIMIT_WINDOW_SEC. */
const RATE_LIMIT_MAX_REQUESTS = 1000;
/** Rate limit evaluation window (seconds). AWS allows 60, 120, 300, 600. */
const RATE_LIMIT_WINDOW_SEC = 60;

/** Required region for WAF with CLOUDFRONT scope. */
const WAF_GLOBAL_REGION = "us-east-1";

function visibilityConfig(metricName: string) {
  return {
    cloudwatchMetricsEnabled: true,
    metricName,
    sampledRequestsEnabled: true,
  };
}

export function createAwsFirewall(args: FirewallComponentArgs): FirewallComponentOutputs {
  // Avoid names with newlines/spaces that corrupt Pulumi state (e.g. an-blumberg-prod-frontend-waf-eb6f\n)
  const name = (args.name ?? "").replace(/\s+/g, " ").trim() || "frontend-waf";
  const tags = { ...args.tags, Name: name };
  const scope = args.scope === "global" ? "CLOUDFRONT" : "REGIONAL";

  const useGlobalProvider = scope === "CLOUDFRONT";
  const wafProvider = useGlobalProvider ? new aws.Provider("waf-us-east-1", { region: WAF_GLOBAL_REGION }) : undefined;

  const waf = new aws.wafv2.WebAcl(name, {
    name,
    scope,
    defaultAction: { allow: {} },
    rules: [
      {
        name: `${name}-common-ruleset`,
        priority: 1,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesCommonRuleSet",
          },
        },
        visibilityConfig: visibilityConfig(`${name}-CommonRuleSet`),
      },
      {
        name: `${name}-ip-reputation`,
        priority: 2,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesAmazonIpReputationList",
            ruleActionOverrides: [
              { name: "AWSManagedRPDoSList", actionToUse: { block: {} } },
              { name: "AWSManagedIPDDoSList", actionToUse: { block: {} } },
            ],
          },
        },
        visibilityConfig: visibilityConfig(`${name}-IpReputation`),
      },
      {
        name: `${name}-rate-limit`,
        priority: 3,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: RATE_LIMIT_MAX_REQUESTS,
            aggregateKeyType: "IP",
            evaluationWindowSec: RATE_LIMIT_WINDOW_SEC,
          },
        },
        visibilityConfig: visibilityConfig(`${name}-RateLimit`),
      },
    ],
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: name,
      sampledRequestsEnabled: true,
    },
    tags: { ...tags, Name: name },
  }, wafProvider ? { provider: wafProvider } : undefined);

  return {
    firewallId: waf.id,
    firewallArn: waf.arn,
  };
}
