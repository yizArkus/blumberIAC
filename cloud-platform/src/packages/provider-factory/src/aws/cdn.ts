import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type {
  CdnComponentArgs,
  CdnComponentOutputs,
} from "@cloud-platform/shared";

export function createAwsCdn(args: CdnComponentArgs): CdnComponentOutputs {
  const tags = { ...args.tags, Name: args.name };

  const originDomain = pulumi.output(args.originUrlOrId).apply((url) =>
    url.replace(/^https?:\/\//, "").split("/")[0]
  );

  const distribution = new aws.cloudfront.Distribution(args.name, {
    enabled: true,
    defaultRootObject: "index.html",
    origins: [
      {
        originId: args.name,
        domainName: originDomain,
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "http-only",
          originSslProtocols: ["TLSv1.2"],
        },
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: args.name,
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
    },
    restrictions: {
      geoRestriction: {
        restrictionType: "none",
      },
    },
    viewerCertificate: {
      cloudfrontDefaultCertificate: true,
    },
    tags: { ...tags, Name: args.name },
  });

  const cdnUrl = pulumi.interpolate`https://${distribution.domainName}`;

  return {
    cdnId: distribution.id,
    cdnUrl,
  };
}
