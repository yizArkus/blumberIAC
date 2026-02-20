import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  DnsComponentArgs,
  DnsComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsDns(args: DnsComponentArgs): DnsComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const zone = new aws.route53.Zone(args.name, {
    name: args.domain,
    tags: { ...tags, Name: args.name },
  });

  const nameServers = zone.nameServers;

  return {
    zoneId: zone.zoneId,
    nameServers: nameServers,
  };
}
