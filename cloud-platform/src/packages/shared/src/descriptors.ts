/**
 * Generic resource descriptors for declarative infrastructure.
 * Refs allow wiring one resource's outputs as another's inputs.
 */

import type { CloudProvider } from "./types";

/** Reference to another resource's output. E.g. { ref: "network.privateSubnetIds" } */
export interface Ref {
  ref: string;
}

export function isRef(x: unknown): x is Ref {
  return typeof x === "object" && x !== null && "ref" in x && typeof (x as Ref).ref === "string";
}

/** Base for all descriptors: resource name and key for refs */
export interface BaseDescriptor {
  /** Resource name (used in Pulumi and tags) */
  name: string;
  /** Key for references from other resources. If not set, name is used */
  key?: string;
  tags?: Record<string, string>;
}

export interface NetworkDescriptor extends BaseDescriptor {
  type: "network";
  cidrBlock: string;
  publicSubnetCidrs: string[];
  privateSubnetCidrs: string[];
}

export interface LoadBalancerDescriptor extends BaseDescriptor {
  type: "loadBalancer";
  isPublic: boolean;
  subnetIds: string[] | Ref;
}

export interface ContainerServiceDescriptor extends BaseDescriptor {
  type: "containerService";
  cpu: number;
  memory: number;
  image: string;
  vpcId: string | Ref;
  subnetIds: string[] | Ref;
  minCapacity: number;
  maxCapacity: number;
  port?: number;
}

export interface DatabaseDescriptor extends BaseDescriptor {
  type: "database";
  instanceSize: string;
  storageGb: number;
  subnetIds: string[] | Ref;
  engine?: string;
  engineVersion?: string;
  username?: string;
  /** Password (can be Output<string> from config.getSecret). */
  password?: string | import("@pulumi/pulumi").Input<string>;
  storageType?: string;
  dbName?: string;
  publiclyAccessible?: boolean;
  skipFinalSnapshot?: boolean;
}

export interface SecretsDescriptor extends BaseDescriptor {
  type: "secrets";
}

export interface MonitoringDescriptor extends BaseDescriptor {
  type: "monitoring";
  logRetentionDays?: number;
}

export interface CdnDescriptor extends BaseDescriptor {
  type: "cdn";
  originUrlOrId: string | Ref;
}

export interface DnsDescriptor extends BaseDescriptor {
  type: "dns";
  domain: string;
}

export interface FirewallDescriptor extends BaseDescriptor {
  type: "firewall";
  scope: "global" | "regional";
}

/** Amplify / Static Web Apps / Firebase Hosting */
export interface FrontendHostingDescriptor extends BaseDescriptor {
  type: "frontendHosting";
  repoUrl?: string;
  branch?: string;
  framework?: string;
  /** Access token (GitHub, etc.) to connect the repo; required if repoUrl is set. */
  accessToken?: string | import("@pulumi/pulumi").Input<string>;
  /** Path to frontend in repo (monorepo). E.g. "front-end". */
  appRoot?: string;
}

export type ResourceDescriptor =
  | NetworkDescriptor
  | LoadBalancerDescriptor
  | ContainerServiceDescriptor
  | DatabaseDescriptor
  | SecretsDescriptor
  | MonitoringDescriptor
  | CdnDescriptor
  | DnsDescriptor
  | FirewallDescriptor
  | FrontendHostingDescriptor;

/** Base context injected into all resources (provider, region, tags) */
export interface BaseContext {
  provider: CloudProvider;
  region: string;
  tags: Record<string, string>;
}
