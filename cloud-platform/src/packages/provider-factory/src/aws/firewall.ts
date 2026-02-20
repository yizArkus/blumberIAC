import * as aws from "@pulumi/aws";
import type {
  FirewallComponentArgs,
  FirewallComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsFirewall(args: FirewallComponentArgs): FirewallComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const waf = new aws.wafv2.WebAcl(args.name, {
    name: args.name,
    scope: args.scope === "global" ? "CLOUDFRONT" : "REGIONAL",
    defaultAction: { allow: {} },
    rules: [],
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: args.name,
      sampledRequestsEnabled: true,
    },
    tags: { ...tags, Name: args.name },
  });

  return {
    firewallId: waf.id,
  };
}
