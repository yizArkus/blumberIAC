# Usar Azure como proveedor: qué hacer y qué falta

Si eliges **Azure** en el setup (`cloud provider: azure`), el proyecto **aún no puede desplegar** en Azure. Solo **AWS** tiene implementaciones completas. Este doc resume qué falta y qué tendrías que hacer.

## Estado actual

- **Setup (`make setup`):** ya pide proveedor y región; puedes poner `azure` y una región (ej. `eastus`). La config se guarda en Pulumi.
- **infra-permissions:** está pensado para **AWS** (IAM, ARN del principal). Con Azure fallaría o no tendría equivalente.
- **frontend-infra / backend-infra:** al desplegar llaman a los adapters del proveedor; los de **Azure son stubs** y lanzan "not implemented".

## Qué te falta para Azure

### 1. Implementar los adapters de Azure en provider-factory

Ruta: `src/packages/provider-factory/src/azure/`

Hoy todos los adapters son stubs. Habría que implementar al menos:

| Componente        | AWS (referencia)     | Azure equivalente a implementar |
|-------------------|----------------------|----------------------------------|
| frontendHosting   | `aws/frontendHosting.ts` (Amplify) | **Static Web Apps** (Pulumi `@pulumi/azure-native` o `@pulumi/azure`) |
| (opcional) network, database, containerService, etc. | En `aws/` | Según lo que quieras desplegar (VNet, Azure SQL, Container Apps, etc.) |

Para **solo frontend en Azure** bastaría implementar **frontendHosting** en Azure (Static Web Apps) y dejar el resto como stub si no lo usas.

### 2. infra-permissions para Azure

El paquete **ya es genérico**: lee `cloudProvider` de la config y solo crea recursos según el proveedor.

- **AWS:** crea el rol IAM y la policy (igual que antes); exige `deployPrincipalArn`.
- **Azure / GCP:** hoy no crea recursos (no-op); solo exporta `regionOut` y placeholders. No exige `deployPrincipalArn`.

Para que Azure tenga permisos reales hay que **extender el mismo paquete**: en el `else` de `provider === "azure"`, crear los recursos de RBAC (rol, asignación al principal que despliega) usando `@pulumi/azure-native` y una config tipo `deployPrincipalId` (Object ID o Application ID del Service Principal). La idea es la misma que en AWS: “quién puede desplegar” → en AWS es un ARN, en Azure un principal ID.

### 3. Ajustar el setup cuando el proveedor es Azure

En `scripts/apply-stack-config.js`:

- **deployPrincipalArn:** es concepto de AWS. Si el proveedor es `azure`, ese paso debería ser opcional o sustituido por algo tipo “Azure principal / Service Principal” (y no escribir `deployPrincipalArn` para stacks Azure, o usar otra clave).
- **amplify.yml:** solo aplica a **AWS Amplify**. Con Azure no hace falta generarlo (o generar algo equivalente para Static Web Apps si lo usas y tiene build config en repo).
- **Token de GitHub:** Static Web Apps también puede usar repo; el token podría reutilizarse según cómo implementes el adapter de Azure.

### 4. Backend y otros recursos

- **backend-infra** hoy usa recursos AWS (ECS, RDS, etc.). Para Azure habría que implementar los adapters de Azure (Container Apps, Azure SQL, etc.) en `provider-factory/src/azure/` y que **backend-infra** use el mismo `cloudProvider` de config (ya lo hace) para que se usen esos adapters.
- Misma idea para **frontend-infra**: ya usa `cloudProvider` de config; en cuanto exista el adapter Azure de `frontendHosting`, usará Azure al poner `azure` en el setup.

### 5. Credenciales y CLI

- Tener **Azure CLI** instalado y hacer `az login`.
- Pulumi con backend Azure (o el que uses) y configurar el provider de Azure en Pulumi para los stacks que usen `cloudProvider: azure`.

## Resumen

| Qué quieres hacer        | Qué tienes que hacer |
|--------------------------|----------------------|
| Solo **probar** con `azure` en el setup | Puedes poner `azure` y región; la config se guarda, pero **deploy fallará** hasta implementar adapters. |
| **Frontend en Azure** (Static Web Apps) | Implementar el adapter `frontendHosting` en `provider-factory/src/azure/` (Static Web Apps), ajustar setup para no exigir `deployPrincipalArn` en Azure (o pedir equivalente Azure), y no generar `amplify.yml` para Azure. |
| **Backend + DB en Azure** | Implementar en `azure/` los adapters que use backend-infra (containerService, database, etc.) y, si aplica, infra-permissions para Azure. |

En resumen: **sí puedes elegir Azure en el setup**, pero para que realmente despliegue en Azure hace falta **implementar los adapters de Azure** en `provider-factory` y **adaptar infra-permissions y el setup** a Azure (principal de deploy y opción de no generar amplify.yml).
