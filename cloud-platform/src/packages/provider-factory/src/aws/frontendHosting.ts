import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  FrontendHostingComponentArgs,
  FrontendHostingComponentOutputs,
} from "@cloud-platform/shared";

function getBuildSpec(appRoot?: string): string {
  const artifactDir = "dist";
  if (appRoot) {
    return `version: 1
applications:
  - appRoot: ${appRoot}
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: ${artifactDir}
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
`;
  }
  return `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: ${artifactDir}
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
`;
}

export function createAwsFrontendHosting(
  args: FrontendHostingComponentArgs
): FrontendHostingComponentOutputs {
  const tags = { ...args.tags, Name: args.name };
  const branchName = args.branch ?? "main";
  const stack = pulumi.getStack();
  const buildSpec = getBuildSpec(args.appRoot);
  const envVars: Record<string, string> = {};
  if (args.appRoot) {
    envVars.AMPLIFY_MONOREPO_APP_ROOT = args.appRoot;
  }

  const app = new aws.amplify.App(`${args.name}-app`, {
    name: `${args.name}-${stack}`,
    ...(args.repoUrl ? { repository: args.repoUrl } : {}),
    ...(args.repoUrl && args.accessToken ? { accessToken: args.accessToken } : {}),
    buildSpec,
    ...(Object.keys(envVars).length > 0 ? { environmentVariables: envVars } : {}),
    customRules: [
      { source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>", status: "200", target: "/index.html" },
    ],
    tags: tags as Record<string, string>,
  });

  const branch = new aws.amplify.Branch(`${args.name}-branch`, {
    appId: app.id,
    branchName,
    framework: args.framework ?? "React",
    stage: "PRODUCTION",
    enableAutoBuild: true,
    tags: tags as Record<string, string>,
  });

  const appUrl = pulumi.interpolate`https://${branch.branchName}.${app.id}.amplifyapp.com`;

  return {
    appUrl,
    appId: app.id,
  };
}
