# IAM permissions for frontend-infra deploy

By default the stack only creates **Amplify** (hosting). Los recursos de Amplify se crean **con tags** (Project, Stack, Component, Name), por lo que el usuario de deploy debe tener **`amplify:TagResource`** además de CreateApp/CreateBranch. Si activas DNS o WAF (`enableDns`/`enableWaf`), hace falta también Route53 y/o WAFv2.

## Errors you may see

- `amplify:TagResource` – when creating Amplify App (tags)
- `wafv2:CreateWebACL` – when creating WAF Web ACL
- `route53:CreateHostedZone` – when creating the hosted zone

## Option A: Use the infra-permissions stack (recommended)

1. Deploy **infra-permissions** once (requires a user with IAM permission to create policies):
   ```bash
   make infra-permissions-stack
   make infra-permissions-config
   make infra-permissions-deploy
   ```
2. Get the policy ARN:
   ```bash
   cd src/packages/infra-permissions && pulumi stack output infraDeployerPolicyArn
   ```
3. In **AWS IAM** → User `nr-yd-user-deploy` → Add permissions → Attach policies → Create policy (or use the ARN above). Or attach the policy by ARN:
   ```bash
   aws iam attach-user-policy --user-name nr-yd-user-deploy --policy-arn <infraDeployerPolicyArn>
   ```
4. Run **frontend-deploy** again.

That policy includes `amplify:*`, `route53:*`, `wafv2:*` (and the rest needed for backend-infra).

## Option A.2: Usar el rol de deploy (assume role)

El stack **infra-permissions** crea un **rol** `cloud-platform-infra-deployer-<stack>` al que se le adjunta la policy anterior. Un usuario o CI puede **asumir** ese rol para obtener permisos de deploy sin tener la policy fija en el usuario.

1. Configura quién puede asumir el rol (en `Pulumi.dev.yaml` o con `pulumi config set`):
   ```yaml
   infra-permissions:deployPrincipalArn: arn:aws:iam::201462387644:user/nr-yd-user-deploy
   ```
2. Despliega infra-permissions y obtén el ARN del rol:
   ```bash
   pulumi stack output infraDeployerRoleArn
   ```
3. Para desplegar (por ejemplo frontend), asume el rol y luego ejecuta Pulumi:
   ```bash
   aws sts assume-role --role-arn <infraDeployerRoleArn> --role-session-name deploy
   # Usa las credenciales temporales (AccessKeyId, SecretAccessKey, SessionToken) en env o aws configure
   make frontend-deploy
   ```

## Deploy only Amplify (no DNS/WAF)

If the deploy user only has **Amplify** permissions, leave `enableDns` and `enableWaf` unset or set to `false` (default). Then `make frontend-deploy` will only create the Amplify app. To add DNS and WAF later, set `enableDns: true` and/or `enableWaf: true` and ensure the user has the corresponding permissions.

## Option B: Add a minimal policy to the deploy user

If you cannot deploy infra-permissions, an admin must attach a policy to `nr-yd-user-deploy`. For **Amplify only** (default stack, **con tags**): at least `amplify:*` o las acciones mínimas que incluyan **`amplify:TagResource`**. If you enable DNS/WAF:

| Service  | Actions (minimal) |
|----------|-------------------|
| Amplify  | `amplify:*` o bien `amplify:CreateApp`, **`amplify:TagResource`**, `amplify:CreateBranch`, `amplify:DeleteBranch`, `amplify:DeleteApp`, `amplify:GetApp`, `amplify:GetBranch`, `amplify:ListApps`, `amplify:ListBranches`, `amplify:UpdateApp`, `amplify:UpdateBranch` |
| Route53  | `route53:*` (o las acciones necesarias para hosted zone y records) |
| WAFv2    | `wafv2:*` (o las acciones necesarias para Web ACL) |

**Solo Amplify (con tags)** – policy mínima para el stack por defecto. `Resource` limitado a Amplify para no dar acceso a otros servicios:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
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
        "amplify:UpdateBranch"
      ],
      "Resource": "arn:aws:amplify:*:*:apps/*"
    }
  ]
}
```

**Amplify + Route53 + WAF** (si usas `enableDns`/`enableWaf`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["amplify:*"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["route53:*"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["wafv2:*"], "Resource": "*" }
  ]
}
```

Después de adjuntar la policy al usuario `nr-yd-user-deploy`, ejecuta de nuevo `make frontend-deploy`.
