import * as aws from "@pulumi/aws";
import type {
  FirewallComponentArgs,
  FirewallComponentOutputs,
} from "@cloud-platform/shared";

/**
 * Web ACL con scope CLOUDFRONT para asociar a la distribución de CloudFront (Amplify).
 * Restricciones de costo: sin logging, sin Bot Control; solo CommonRuleSet, IpReputation y rate limit.
 * Mantiene por debajo de ~$16/mes.
 */
/** Límite de requests por IP; se evalúa en RATE_LIMIT_WINDOW_SEC. */
const RATE_LIMIT_MAX_REQUESTS = 1000;
/** Ventana de evaluación del rate limit (segundos). AWS permite 60, 120, 300, 600. */
const RATE_LIMIT_WINDOW_SEC = 60;

function visibilityConfig(metricName: string) {
  return {
    cloudwatchMetricsEnabled: true,
    metricName,
    sampledRequestsEnabled: true,
  };
}

export function createAwsFirewall(args: FirewallComponentArgs): FirewallComponentOutputs {
  const tags = { ...args.tags, Name: args.name };
  const scope = args.scope === "global" ? "CLOUDFRONT" : "REGIONAL";

  const waf = new aws.wafv2.WebAcl(args.name, {
    name: args.name,
    scope,
    defaultAction: { allow: {} },
    rules: [
      {
        name: `${args.name}-common-ruleset`,
        priority: 1,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesCommonRuleSet",
          },
        },
        visibilityConfig: visibilityConfig(`${args.name}-CommonRuleSet`),
      },
      {
        name: `${args.name}-ip-reputation`,
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
        visibilityConfig: visibilityConfig(`${args.name}-IpReputation`),
      },
      {
        name: `${args.name}-rate-limit`,
        priority: 3,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: RATE_LIMIT_MAX_REQUESTS,
            aggregateKeyType: "IP",
            evaluationWindowSec: RATE_LIMIT_WINDOW_SEC,
          },
        },
        visibilityConfig: visibilityConfig(`${args.name}-RateLimit`),
      },
    ],
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: args.name,
      sampledRequestsEnabled: true,
    },
    tags: { ...tags, Name: args.name },
  });

  return {
    firewallId: waf.id,
    firewallArn: waf.arn,
  };
}
