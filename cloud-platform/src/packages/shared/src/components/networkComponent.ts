/**
 * Network component - provider agnostic interface.
 * VPC / VNet / VPC equivalent with public/private subnets.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface NetworkComponentArgs {
  name: string;
  cidrBlock: string;
  publicSubnetCidrs: string[];
  privateSubnetCidrs: string[];
  provider: CloudProvider;
  region: string;
  tags?: Record<string, string>;
}

export interface NetworkComponentOutputs {
  vpcId: Output<string>;
  publicSubnetIds: Output<string[]>;
  privateSubnetIds: Output<string[]>;
  natGatewayId?: Output<string>;
}

export interface INetworkComponentAdapter {
  create(args: NetworkComponentArgs): NetworkComponentOutputs;
}
