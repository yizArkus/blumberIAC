/**
 * Container service component - provider agnostic interface.
 * ECS / ACI / Cloud Run equivalent.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface ContainerServiceComponentArgs {
  name: string;
  cpu: number;
  memory: number;
  image: string;
  provider: CloudProvider;
  region: string;
  vpcId: import("@pulumi/pulumi").Input<string>;
  subnetIds: import("@pulumi/pulumi").Input<string>[] | import("@pulumi/pulumi").Input<string[]>;
  minCapacity: number;
  maxCapacity: number;
  port?: number;
  tags?: Record<string, string>;
}

export interface ContainerServiceComponentOutputs {
  serviceId: Output<string>;
  endpoint: Output<string>;
}

export interface IContainerServiceComponentAdapter {
  create(args: ContainerServiceComponentArgs): ContainerServiceComponentOutputs;
}
