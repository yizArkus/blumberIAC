/**
 * Load balancer component - provider agnostic interface.
 */

import type { Input, Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface LoadBalancerComponentArgs {
  name: string;
  provider: CloudProvider;
  region: string;
  isPublic: boolean;
  subnetIds: Input<string>[] | Input<string[]>;
  tags?: Record<string, string>;
}

export interface LoadBalancerComponentOutputs {
  loadBalancerId: Output<string>;
  dnsName: Output<string>;
  url: Output<string>;
}

export interface ILoadBalancerComponentAdapter {
  create(args: LoadBalancerComponentArgs): LoadBalancerComponentOutputs;
}
