import * as aws from "@pulumi/aws";
import type {
  SecretsComponentArgs,
  SecretsComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsSecrets(args: SecretsComponentArgs): SecretsComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const secret = new aws.secretsmanager.Secret(args.name, {
    name: args.name,
    tags: { ...tags, Name: args.name },
  });

  return {
    secretsStoreId: secret.id,
    arnOrUri: secret.arn,
  };
}
