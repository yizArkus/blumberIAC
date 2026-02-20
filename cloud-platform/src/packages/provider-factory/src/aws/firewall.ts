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
const RATE_LIMIT_PER_FIVE_MIN = 1000;

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
            limit: RATE_LIMIT_PER_FIVE_MIN,
            aggregateKeyType: "IP",
            evaluationWindowSec: 300,
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
