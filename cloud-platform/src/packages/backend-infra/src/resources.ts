/**
 * Declarative backend resource definitions.
 * Order matters: resources can reference outputs of previous ones with { ref: "key.prop" }.
 */
import type { Output } from "@pulumi/pulumi";
import { nameTag } from "@cloud-platform/shared";
import type { ResourceDescriptor } from "@cloud-platform/shared";

export interface BackendResourcesConfig {
  dbSize: string;
  minCapacity: number;
  maxCapacity: number;
  containerImage: string;
  /** Database options (all required in Pulumi config database:*) */
  database: {
    engine: string;
    engineVersion: string;
    username: string;
    /** Password (config.requireSecret("database:password")) */
    password: string | Output<string>;
    storageGb: number;
    storageType: string;
    dbName: string;
    publiclyAccessible: boolean;
    skipFinalSnapshot: boolean;
  };
}

export function getBackendResources(stackName: string, config: BackendResourcesConfig): ResourceDescriptor[] {
  const db = config.database;
  return [
    {
      type: "network",
      key: "network",
      name: nameTag("backend-network"),
      cidrBlock: "10.1.0.0/16",
      publicSubnetCidrs: ["10.1.1.0/24", "10.1.2.0/24"],
      privateSubnetCidrs: ["10.1.10.0/24", "10.1.11.0/24"],
    },
    {
      type: "loadBalancer",
      key: "loadBalancer",
      name: nameTag("backend-lb"),
      isPublic: true,
      subnetIds: { ref: "network.publicSubnetIds" },
    },
    {
      type: "containerService",
      key: "containerService",
      name: nameTag("backend-svc"),
      cpu: 0.25,
      memory: 512,
      image: config.containerImage,
      vpcId: { ref: "network.vpcId" },
      subnetIds: { ref: "network.privateSubnetIds" },
      minCapacity: config.minCapacity,
      maxCapacity: config.maxCapacity,
      port: 80,
    },
    {
      type: "database",
      key: "database",
      name: nameTag("backend-db"),
      instanceSize: config.dbSize,
      storageGb: db.storageGb,
      subnetIds: { ref: "network.privateSubnetIds" },
      engine: db.engine,
      engineVersion: db.engineVersion,
      username: db.username,
      password: db.password,
      storageType: db.storageType,
      dbName: db.dbName,
      publiclyAccessible: db.publiclyAccessible,
      skipFinalSnapshot: db.skipFinalSnapshot,
    },
    {
      type: "secrets",
      key: "secrets",
      name: nameTag("backend-secrets"),
    },
    {
      type: "monitoring",
      key: "monitoring",
      name: nameTag("backend-monitoring"),
      logRetentionDays: 7,
    },
  ];
}
