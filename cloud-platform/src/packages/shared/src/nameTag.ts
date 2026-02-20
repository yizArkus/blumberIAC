import * as crypto from "crypto";
import * as pulumi from "@pulumi/pulumi";

/**
 * Nombre estándar para recursos y Name tag.
 * Patrón: org-app-stack-logicalName-hex(4)
 * - org, app → Pulumi config
 * - stack → pulumi.getStack()
 * - hash → primeros 4 caracteres de sha256(stack-logicalName)
 */
export function nameTag(logicalName: string): string {
  const config = new pulumi.Config();
  const org = config.require("org");
  const app = config.require("app");
  const stack = pulumi.getStack();

  const h = crypto
    .createHash("sha256")
    .update(`${stack}-${logicalName}`)
    .digest("hex")
    .slice(0, 4);

  return `${org}-${app}-${stack}-${logicalName}-${h}`;
}
