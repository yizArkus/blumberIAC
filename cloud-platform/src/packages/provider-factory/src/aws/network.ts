import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  NetworkComponentArgs,
  NetworkComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsNetwork(args: NetworkComponentArgs): NetworkComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const vpc = new aws.ec2.Vpc(args.name, {
    cidrBlock: args.cidrBlock,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags,
  });

  const igw = new aws.ec2.InternetGateway(`${args.name}-igw`, {
    vpcId: vpc.id,
    tags: { ...tags, Name: `${args.name}-igw` },
  });

  const publicSubnets = args.publicSubnetCidrs.map((cidr, i) =>
    new aws.ec2.Subnet(`${args.name}-public-${i}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: aws.getAvailabilityZones({ state: "available" }).then((az) => az.names[i % az.names.length]),
      mapPublicIpOnLaunch: true,
      tags: { ...tags, Name: `${args.name}-public-${i}` },
    })
  );

  const privateSubnets = args.privateSubnetCidrs.map((cidr, i) =>
    new aws.ec2.Subnet(`${args.name}-private-${i}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: aws.getAvailabilityZones({ state: "available" }).then((az) => az.names[i % az.names.length]),
      tags: { ...tags, Name: `${args.name}-private-${i}` },
    })
  );

  const publicRouteTable = new aws.ec2.RouteTable(`${args.name}-public-rt`, {
    vpcId: vpc.id,
    routes: [
      { cidrBlock: "0.0.0.0/0", gatewayId: igw.id },
    ],
    tags: { ...tags, Name: `${args.name}-public-rt` },
  });

  publicSubnets.forEach((subnet, i) => {
    new aws.ec2.RouteTableAssociation(`${args.name}-public-rta-${i}`, {
      subnetId: subnet.id,
      routeTableId: publicRouteTable.id,
    });
  });

  const eip = new aws.ec2.Eip(`${args.name}-nat-eip`, {
    domain: "vpc",
    tags: { ...tags, Name: `${args.name}-nat-eip` },
  });

  const natGateway = new aws.ec2.NatGateway(`${args.name}-nat`, {
    allocationId: eip.id,
    subnetId: publicSubnets[0].id,
    tags: { ...tags, Name: `${args.name}-nat` },
  });

  const privateRouteTable = new aws.ec2.RouteTable(`${args.name}-private-rt`, {
    vpcId: vpc.id,
    routes: [
      { cidrBlock: "0.0.0.0/0", natGatewayId: natGateway.id },
    ],
    tags: { ...tags, Name: `${args.name}-private-rt` },
  });

  privateSubnets.forEach((subnet, i) => {
    new aws.ec2.RouteTableAssociation(`${args.name}-private-rta-${i}`, {
      subnetId: subnet.id,
      routeTableId: privateRouteTable.id,
    });
  });

  return {
    vpcId: vpc.id,
    publicSubnetIds: pulumi.all(publicSubnets.map((s) => s.id)),
    privateSubnetIds: pulumi.all(privateSubnets.map((s) => s.id)),
    natGatewayId: natGateway.id,
  };
}
