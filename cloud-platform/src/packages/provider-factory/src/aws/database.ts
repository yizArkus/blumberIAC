import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  DatabaseComponentArgs,
  DatabaseComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsDatabase(args: DatabaseComponentArgs): DatabaseComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const subnetGroup = new aws.rds.SubnetGroup(`${args.name}-sg`, {
    subnetIds: pulumi.output(args.subnetIds),
    tags: { ...tags, Name: `${args.name}-sg` },
  });

  const engine = args.engine ?? "postgres";
  const engineVersion = args.engineVersion ?? "15";
  const username = args.username ?? "admin";
  const password = args.password ?? pulumi.secret("changeme-in-production");
  const dbName = args.dbName ?? args.name.replace(/-/g, "_");
  const storageType = args.storageType ?? "gp3";
  const publiclyAccessible = args.publiclyAccessible ?? false;
  const skipFinalSnapshot = args.skipFinalSnapshot ?? true;

  const db = new aws.rds.Instance(args.name, {
    allocatedStorage: args.storageGb,
    storageType,
    engine,
    engineVersion,
    instanceClass: args.instanceSize,
    dbName,
    username,
    password,
    dbSubnetGroupName: subnetGroup.name,
    publiclyAccessible,
    skipFinalSnapshot,
    tags: { ...tags, Name: args.name },
  });

  const endpoint = pulumi.interpolate`${db.address}:${db.port}`;

  return {
    host: db.address,
    port: db.port,
    endpoint,
  };
}
