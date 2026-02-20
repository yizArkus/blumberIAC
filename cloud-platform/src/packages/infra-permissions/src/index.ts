import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const stackName = pulumi.getStack();
const region = config.require("cloudRegion");

const infraDeployerPolicy = new aws.iam.Policy(
  "infra-deployer-policy",
  {
    name: `cloud-platform-infra-deployer-${stackName}`,
    description: "Allows deploying backend-infra and frontend-infra (Pulumi). EC2, ECS, RDS, Amplify, Route53, WAF, Secrets, etc.",
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "Networking",
          Effect: "Allow",
          Action: ["ec2:*", "elasticloadbalancing:*"],
          Resource: "*",
        },
        {
          Sid: "Compute",
          Effect: "Allow",
          Action: ["ecs:*", "ecr:*", "lambda:*"],
          Resource: "*",
        },
        {
          Sid: "Database",
          Effect: "Allow",
          Action: ["rds:*"],
          Resource: "*",
        },
        {
          Sid: "IAM",
          Effect: "Allow",
          Action: [
            "iam:CreateRole",
            "iam:PutRolePolicy",
            "iam:AttachRolePolicy",
            "iam:PassRole",
            "iam:GetRole",
            "iam:ListAttachedRolePolicies",
            "iam:GetRolePolicy",
            "iam:DetachRolePolicy",
            "iam:DeleteRolePolicy",
            "iam:DeleteRole",
          ],
          Resource: "*",
        },
        {
          Sid: "DNS",
          Effect: "Allow",
          Action: ["route53:*"],
          Resource: "*",
        },
        {
          Sid: "FirewallWAF",
          Effect: "Allow",
          Action: ["wafv2:*"],
          Resource: "*",
        },
        {
          Sid: "Amplify",
          Effect: "Allow",
          Action: [
            "amplify:CreateApp",
            "amplify:TagResource",
            "amplify:CreateBranch",
            "amplify:GetApp",
            "amplify:GetBranch",
            "amplify:ListApps",
            "amplify:UpdateApp",
            "amplify:UpdateBranch",
          ],
          Resource: "arn:aws:amplify:*:*:apps/*",
        },
      ],
    }),
  },
  { protect: true }
);

export const infraDeployerPolicyArn = infraDeployerPolicy.arn;
export const infraDeployerPolicyName = infraDeployerPolicy.name;
export const regionOut = region;
