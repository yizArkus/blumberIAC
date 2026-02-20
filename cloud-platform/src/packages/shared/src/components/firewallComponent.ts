/**
 * Firewall / WAF component - provider agnostic interface.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface FirewallComponentArgs {
  name: string;
  provider: CloudProvider;
  region: string;
  scope: "global" | "regional";
  tags?: Record<string, string>;
}

export interface FirewallComponentOutputs {
  firewallId: Output<string>;
}

export interface IFirewallComponentAdapter {
  create(args: FirewallComponentArgs): FirewallComponentOutputs;
}
