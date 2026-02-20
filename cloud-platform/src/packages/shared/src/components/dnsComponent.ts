/**
 * DNS component - provider agnostic interface.
 * Route53 / Azure DNS / Cloud DNS equivalent.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface DnsComponentArgs {
  name: string;
  domain: string;
  provider: CloudProvider;
  region: string;
  targetValue?: string;
  tags?: Record<string, string>;
}

export interface DnsComponentOutputs {
  zoneId: Output<string>;
  nameServers: Output<string[]>;
}

export interface IDnsComponentAdapter {
  create(args: DnsComponentArgs): DnsComponentOutputs;
}
