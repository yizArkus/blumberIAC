import * as aws from "@pulumi/aws";
import type {
  MonitoringComponentArgs,
  MonitoringComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsMonitoring(args: MonitoringComponentArgs): MonitoringComponentOutputs {
  const tags = { ...args.tags, Name: args.name };
  const retention = args.logRetentionDays ?? 7;

  const logGroup = new aws.cloudwatch.LogGroup(args.name, {
    name: `/cloud-platform/${args.name}`,
    retentionInDays: retention,
    tags: { ...tags, Name: args.name },
  });

  return {
    logGroupId: logGroup.name,
    metricsNamespace: logGroup.name.apply((n) => `CloudPlatform/${n}`),
  };
}
