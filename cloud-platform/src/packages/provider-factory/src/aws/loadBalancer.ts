import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  LoadBalancerComponentArgs,
  LoadBalancerComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsLoadBalancer(args: LoadBalancerComponentArgs): LoadBalancerComponentOutputs {
  const tags = { ...args.tags, Name: args.name };
  const subnetIds = pulumi.output(args.subnetIds);

  const lb = new aws.lb.LoadBalancer(args.name, {
    loadBalancerType: "application",
    subnets: subnetIds,
    internal: !args.isPublic,
    tags: { ...tags, Name: args.name },
  });

  const url = pulumi.interpolate`http${args.isPublic ? "s" : ""}://${lb.dnsName}`;

  return {
    loadBalancerId: lb.id,
    dnsName: lb.dnsName,
    url,
  };
}
