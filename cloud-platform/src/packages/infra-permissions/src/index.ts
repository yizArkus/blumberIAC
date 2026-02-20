import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const stackName = pulumi.getStack();
const region = config.require("cloudRegion");
const deployPrincipalRaw = config.require("deployPrincipalArn");
const deployPrincipalArn: string | pulumi.Output<string> = deployPrincipalRaw.startsWith("arn:")
  ? deployPrincipalRaw
  : pulumi.output(aws.getCallerIdentity()).apply((id) => `arn:aws:iam::${id.accountId}:user/${deployPrincipalRaw}`);

const infraDeployerPolicy = new aws.iam.Policy(
  "infra-deployer-policy",
  {
    name: `cloud-platform-infra-deployer-${stackName}`,
    description: "Allows deploying backend-infra and frontend-infra (Pulumi). EC2, ECS, RDS, Amplify, Route53, WAF, Secrets, etc.",
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
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
          Sid: "Amplify",
          Effect: "Allow",
          Action: [
            "amplify:CreateApp",
            "amplify:TagResource",
            "amplify:CreateBranch",
            "amplify:DeleteBranch",
            "amplify:DeleteApp",
            "amplify:GetApp",
            "amplify:GetBranch",
            "amplify:ListApps",
            "amplify:ListBranches",
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

const assumeRolePolicy =
  typeof deployPrincipalArn === "string"
    ? JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Principal: { AWS: deployPrincipalArn }, Action: "sts:AssumeRole" }],
      })
    : deployPrincipalArn.apply((arn) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [{ Effect: "Allow", Principal: { AWS: arn }, Action: "sts:AssumeRole" }],
        })
      );

const infraDeployerRole = new aws.iam.Role("infra-deployer-role", {
  name: `cloud-platform-infra-deployer-${stackName}`,
  description: "Rol para desplegar infra (frontend Amplify, backend, etc.) desde Pulumi o CI.",
  assumeRolePolicy,
});

new aws.iam.RolePolicyAttachment("infra-deployer-role-policy", {
  role: infraDeployerRole.name,
  policyArn: infraDeployerPolicy.arn,
});

export const infraDeployerPolicyArn = infraDeployerPolicy.arn;
export const infraDeployerPolicyName = infraDeployerPolicy.name;
export const infraDeployerRoleArn = infraDeployerRole.arn;
export const regionOut = region;
