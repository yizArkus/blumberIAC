import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const stackName = pulumi.getStack();
const region = config.require("cloudRegion");

const appRuntimePolicy = new aws.iam.Policy(
  "app-runtime-policy",
  {
    name: `cloud-platform-app-runtime-${stackName}`,
    description: "Minimal permissions for backend/frontend at runtime: secrets, RDS connect, logs.",
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ReadSecrets",
          Effect: "Allow",
          Action: ["secretsmanager:GetSecretValue"],
          Resource: "arn:aws:secretsmanager:*:*:secret:backend-*",
        },
        {
          Sid: "DatabaseAccess",
          Effect: "Allow",
          Action: ["rds-db:connect"],
          Resource: "arn:aws:rds-db:*:*:dbuser:*/backend-*",
        },
        {
          Sid: "WriteLogs",
          Effect: "Allow",
          Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
          Resource: "arn:aws:logs:*:*:log-group:/cloud-platform/*",
        },
      ],
    }),
  },
  { protect: true }
);

const appRuntimeRole = new aws.iam.Role(
  "app-runtime-role",
  {
    name: `cloud-platform-app-runtime-${stackName}`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: ["ecs-tasks.amazonaws.com", "lambda.amazonaws.com"],
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
  },
  { protect: true }
);

new aws.iam.RolePolicyAttachment("app-runtime-policy-attach", {
  role: appRuntimeRole.name,
  policyArn: appRuntimePolicy.arn,
});

export const appRuntimeRoleArn = appRuntimeRole.arn;
export const appRuntimeRoleName = appRuntimeRole.name;
export const appRuntimePolicyArn = appRuntimePolicy.arn;
export const regionOut = region;
