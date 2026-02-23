import * as pulumi from "@pulumi/pulumi";
import { nameTag } from "@cloud-platform/shared";

const config = new pulumi.Config();
const region = config.require("cloudRegion");
const provider = config.require("cloudProvider") as "aws" | "azure" | "gcp";

let infraDeployerPolicyArn: pulumi.Output<string>;
let infraDeployerPolicyName: pulumi.Output<string>;
let infraDeployerRoleArn: pulumi.Output<string>;

if (provider === "aws") {
  const aws = require("@pulumi/aws");
  const deployPrincipalRaw = config.require("deployPrincipalArn");
  const deployPrincipalArn: string | pulumi.Output<string> = deployPrincipalRaw.startsWith("arn:")
    ? deployPrincipalRaw
    : pulumi.output(aws.getCallerIdentity()).apply((id: { accountId: string }) => `arn:aws:iam::${id.accountId}:user/${deployPrincipalRaw}`);

  const infraDeployerPolicy = new aws.iam.Policy(
    "infra-deployer-policy",
    {
      name: nameTag("infra-deployer-policy"),
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
              "amplify:AssociateWebACL",
              "amplify:DisassociateWebACL",
              "amplify:GetWebACL",
              "amplify:GetWebACLForResource",
            ],
            Resource: "arn:aws:amplify:*:*:apps/*",
          },
          {
            Sid: "WAFv2",
            Effect: "Allow",
            Action: [
              "wafv2:CreateWebACL",
              "wafv2:GetWebACL",
              "wafv2:UpdateWebACL",
              "wafv2:DeleteWebACL",
              "wafv2:ListWebACLs",
              "wafv2:AssociateWebACL",
              "wafv2:DisassociateWebACL",
              "wafv2:GetWebACLForResource",
              "wafv2:PutPermissionPolicy",
              "wafv2:GetPermissionPolicy",
              "wafv2:ListRuleGroups",
              "wafv2:GetRuleGroup",
              "wafv2:ListAvailableManagedRuleGroups",
              "wafv2:GetManagedRuleSet",
              "wafv2:ListTagsForResource",
              "wafv2:TagResource",
              "wafv2:UntagResource",
            ],
            Resource: [
              "arn:aws:wafv2:*:*:regional/webacl/*",
              "arn:aws:wafv2:*:*:global/webacl/*",
              "arn:aws:wafv2:*:*:regional/managedruleset/*/*",
              "arn:aws:wafv2:*:*:global/managedruleset/*/*",
            ],
          },
          {
            Sid: "WAFv2Amplify",
            Effect: "Allow",
            Action: [
              "wafv2:AssociateWebACL",
              "wafv2:DisassociateWebACL",
              "wafv2:GetWebACLForResource",
            ],
            // Disassociate/Associate authorize against the target resource ARN (e.g. Amplify app ARN)
            // and may also require access to the Web ACL resource.
            Resource: [
              "arn:aws:amplify:*:*:apps/*",
              "arn:aws:wafv2:*:*:regional/webacl/*",
              "arn:aws:wafv2:*:*:global/webacl/*",
            ],
          },
        ],
      }),
    }
  );

  const assumeRolePolicy =
    typeof deployPrincipalArn === "string"
      ? JSON.stringify({
          Version: "2012-10-17",
          Statement: [{ Effect: "Allow", Principal: { AWS: deployPrincipalArn }, Action: "sts:AssumeRole" }],
        })
      : deployPrincipalArn.apply((arn: string) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [{ Effect: "Allow", Principal: { AWS: arn }, Action: "sts:AssumeRole" }],
          })
        );

  const infraDeployerRole = new aws.iam.Role("infra-deployer-role", {
    name: nameTag("infra-deployer-role"),
    description: "Rol para desplegar infra (frontend Amplify, backend, etc.) desde Pulumi o CI.",
    assumeRolePolicy,
  });

  new aws.iam.RolePolicyAttachment("infra-deployer-role-policy", {
    role: infraDeployerRole.name,
    policyArn: infraDeployerPolicy.arn,
  });

  infraDeployerPolicyArn = infraDeployerPolicy.arn;
  infraDeployerPolicyName = infraDeployerPolicy.name;
  infraDeployerRoleArn = infraDeployerRole.arn;
} else {
  pulumi.log.info(
    `infra-permissions: ${provider} does not create permission resources yet; region is exported. Extend this package for RBAC in Azure/GCP.`
  );
  const empty = pulumi.output("");
  infraDeployerPolicyArn = empty;
  infraDeployerPolicyName = empty;
  infraDeployerRoleArn = empty;
}

export const regionOut = region;
export { infraDeployerPolicyArn, infraDeployerPolicyName, infraDeployerRoleArn };
