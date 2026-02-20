/**
 * CDN component - provider agnostic interface.
 * CloudFront / Azure CDN / Cloud CDN equivalent.
 */

import type { Input, Output } from "@pulumi/pulumi";
import type { CloudProvider } from "../types";

export interface CdnComponentArgs {
  name: string;
  originUrlOrId: Input<string>;
  provider: CloudProvider;
  region: string;
  tags?: Record<string, string>;
}

export interface CdnComponentOutputs {
  cdnId: Output<string>;
  cdnUrl: Output<string>;
}

export interface ICdnComponentAdapter {
  create(args: CdnComponentArgs): CdnComponentOutputs;
}
