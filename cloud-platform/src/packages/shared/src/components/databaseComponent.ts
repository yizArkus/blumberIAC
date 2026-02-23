/**
 * Database component - provider agnostic interface.
 * RDS / Azure SQL / Cloud SQL equivalent.
 */

import type { Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface DatabaseComponentArgs {
  name: string;
  instanceSize: string;
  storageGb: number;
  provider: CloudProvider;
  region: string;
  subnetIds: import("@pulumi/pulumi").Input<string>[] | import("@pulumi/pulumi").Input<string[]>;
  tags?: Record<string, string>;
  /** Motor: postgres, mysql, etc. Default postgres */
  engine?: string;
  /** Versión del motor. Default 15 para postgres */
  engineVersion?: string;
  /** Usuario de la DB. Default admin */
  username?: string;
  /** Password (use Pulumi secret). Recommended: pulumi config set --secret database:password "..." */
  password?: import("@pulumi/pulumi").Input<string>;
  /** Tipo de almacenamiento (AWS: gp3, gp2). Default gp3 */
  storageType?: string;
  /** Nombre lógico de la base de datos. Default derivado de name */
  dbName?: string;
  /** Si la instancia es accesible desde internet. Default false */
  publiclyAccessible?: boolean;
  /** Si omitir snapshot final al destruir. Default true en dev */
  skipFinalSnapshot?: boolean;
}

export interface DatabaseComponentOutputs {
  host: Output<string>;
  port: Output<number>;
  endpoint: Output<string>;
}

export interface IDatabaseComponentAdapter {
  create(args: DatabaseComponentArgs): DatabaseComponentOutputs;
}
