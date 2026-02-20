/**
 * Descriptores de recursos genéricos para crear infraestructura de forma declarativa.
 * Las referencias (Ref) permiten enlazar salidas de un recurso como entrada de otro.
 */

import type { CloudProvider } from "./types";

/** Referencia a la salida de otro recurso. Ej: { ref: "network.privateSubnetIds" } */
export interface Ref {
  ref: string;
}

export function isRef(x: unknown): x is Ref {
  return typeof x === "object" && x !== null && "ref" in x && typeof (x as Ref).ref === "string";
}

/** Base para todos los descriptores: nombre del recurso y clave para refs */
export interface BaseDescriptor {
  /** Nombre del recurso (usado en Pulumi y tags) */
  name: string;
  /** Clave para referencias desde otros recursos. Si no se define, se usa name */
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
  /** Contraseña (puede ser Output<string> de config.getSecret). */
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

/** Contexto base inyectado en todos los recursos (provider, region, tags) */
export interface BaseContext {
  provider: CloudProvider;
  region: string;
  tags: Record<string, string>;
}
