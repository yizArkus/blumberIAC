# Permisos: diseño genérico por proveedor

Tanto **infra-permissions** (quién despliega) como **runtime-permissions** (permisos de la app en ejecución) son agnósticos al proveedor: leen `cloudProvider` de la config y solo crean recursos para ese cloud.

## Cómo funciona

1. **Config común:** en todos los stacks se usa `cloudRegion` y `cloudProvider` (aws | azure | gcp).
2. **Config por proveedor:**
   - **AWS:** exige `deployPrincipalArn` (ARN del usuario o rol IAM que puede asumir el rol de deploy). Crea un rol IAM + policy y permite que ese principal lo asuma.
   - **Azure / GCP:** de momento no exigen config extra ni crean recursos; el deploy de infra-permissions solo exporta `regionOut`. Cuando se implemente RBAC para Azure/GCP, se usará una clave equivalente (ej. `deployPrincipalId` para Azure).

## Mismo concepto, distinto nombre por cloud

| Concepto           | AWS                    | Azure (futuro)     | GCP (futuro)      |
|--------------------|------------------------|--------------------|-------------------|
| Quién puede desplegar | Usuario o rol IAM      | Service Principal / Managed Identity | Service account / principal |
| Config key         | `deployPrincipalArn`   | `deployPrincipalId` (Object ID / App ID) | análogo |
| Recurso creado     | IAM Role + Policy      | Role assignment (RBAC) | IAM binding / custom role |

El **setup** ya solo pide el “principal de deploy” cuando el proveedor es AWS; para Azure/GCP ese paso se omite hasta que se implementen los recursos de permisos en este paquete.

## Extender a Azure

En `src/packages/infra-permissions/src/index.ts`, en el bloque `else` de `provider === "azure"`:

1. Añadir dependencia `@pulumi/azure-native` (o `@pulumi/azure`) si no está.
2. Leer una config tipo `deployPrincipalId` (Object ID del principal que ejecutará Pulumi).
3. Crear un rol de Azure (definición de rol con permisos para desplegar Static Web Apps, etc.) y una asignación de rol a ese principal.
4. Exportar los identificadores útiles (ej. `infraDeployerRoleId`) de forma análoga a los ARNs en AWS.

La idea es la misma que en AWS: un solo “rol de deploy” y un principal que puede usarlo; solo cambia la API del cloud.

---

## runtime-permissions (rol en tiempo de ejecución)

Misma idea que infra-permissions pero para la **aplicación en ejecución** (backend/frontend que accede a secrets, DB, logs):

- **AWS:** crea un IAM Role asumible por ECS/Lambda, con policy para Secrets Manager, RDS connect y CloudWatch Logs.
- **Azure / GCP:** hoy no crea recursos; solo exporta `regionOut` y placeholders. Para Azure se podría crear una Managed Identity y asignarle permisos sobre Key Vault, SQL, Log Analytics, etc.

El **setup** ya escribe `cloudProvider` y `cloudRegion` en runtime-permissions cuando existe el paquete, así que al desplegar con Azure no falla por config faltante.
