import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  ContainerServiceComponentArgs,
  ContainerServiceComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsContainerService(args: ContainerServiceComponentArgs): ContainerServiceComponentOutputs {
  const tags = { ...args.tags, Name: args.name };
  const port = args.port ?? 80;

  const vpcId = pulumi.output(args.vpcId);
  const sg = new aws.ec2.SecurityGroup(`${args.name}-sg`, {
    vpcId,
    description: `Allow inbound for ${args.name}`,
    ingress: [
      { protocol: "tcp", fromPort: port, toPort: port, cidrBlocks: ["0.0.0.0/0"], description: "Allow LB" },
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    tags: { ...tags, Name: `${args.name}-sg` },
  });

  const cluster = new aws.ecs.Cluster(args.name, {
    tags: { ...tags, Name: args.name },
  });

  const executionRole = new aws.iam.Role(`${args.name}-exec`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
    tags: { ...tags, Name: `${args.name}-exec` },
  });

  new aws.iam.RolePolicyAttachment(`${args.name}-exec-policy`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  });

  const taskDef = new aws.ecs.TaskDefinition(
    args.name,
    {
      family: args.name,
      cpu: String(args.cpu * 1024),
      memory: String(args.memory),
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: executionRole.arn,
      containerDefinitions: pulumi
        .all([cluster.arn])
        .apply(([clusterArn]) =>
          JSON.stringify([
            {
              name: args.name,
              image: args.image,
              portMappings: [{ containerPort: port, protocol: "tcp" }],
              logConfiguration: {
                logDriver: "awslogs",
                options: {
                  "awslogs-group": `/ecs/${args.name}`,
                  "awslogs-region": args.region,
                },
              },
            },
          ])
        ),
      tags: { ...tags, Name: args.name },
    },
    { dependsOn: [cluster] }
  );

  const service = new aws.ecs.Service(args.name, {
    cluster: cluster.arn,
    taskDefinition: taskDef.arn,
    desiredCount: args.minCapacity,
    launchType: "FARGATE",
    networkConfiguration: {
      subnets: pulumi.output(args.subnetIds),
      assignPublicIp: false,
      securityGroups: [sg.id],
    },
    tags: { ...tags, Name: args.name },
  });

  const endpoint = pulumi.interpolate`${cluster.arn}:${service.name}`;

  return {
    serviceId: service.id,
    endpoint,
  };
}
