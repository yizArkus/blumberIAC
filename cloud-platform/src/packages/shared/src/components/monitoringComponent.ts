/**
 * Monitoring component - provider agnostic interface.
 * CloudWatch / Monitor / Cloud Monitoring equivalent.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface MonitoringComponentArgs {
  name: string;
  provider: CloudProvider;
  region: string;
  logRetentionDays?: number;
  tags?: Record<string, string>;
}

export interface MonitoringComponentOutputs {
  logGroupId: Output<string>;
  metricsNamespace?: Output<string>;
}

export interface IMonitoringComponentAdapter {
  create(args: MonitoringComponentArgs): MonitoringComponentOutputs;
}
