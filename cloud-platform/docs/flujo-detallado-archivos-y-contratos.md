# Flujo a detalle: archivos, interfaces y contratos

Ejemplo: **backend-infra** con provider **AWS**. Desde `pulumi up` hasta la creación de RDS y el resto de recursos.

---

## 1. Entrada: Pulumi ejecuta el stack

**Archivo:** `src/packages/backend-infra/src/index.ts`

- Lee **config** de Pulumi (`Pulumi.<stack>.yaml`):
  - `cloud:provider` → `"aws"`
  - `cloud:region`, `dbSize`, `minCapacity`, `maxCapacity`, `containerImage`, etc.
- Arma **tags** (Project, Stack, Component).
- Llama a **getBackendResources(stackName, config)** para obtener la lista de recursos.
- Llama a **createResources(provider, resources, baseContext)**.
- Del **context** resultante lee las salidas (network, database, etc.) y las **exporta** para `pulumi stack output`.

**Contratos usados aquí:**
- `CloudProvider` (shared)
- `BaseContext`: `{ provider, region, tags }` (shared/descriptors)
- `ResourceDescriptor[]` (shared/descriptors)
- `ResourceContext` (provider-factory/createResources): `Record<string, unknown>`

---

## 2. Definición declarativa de recursos

**Archivo:** `src/packages/backend-infra/src/resources.ts`

- **getBackendResources(stackName, config)** devuelve un array de **descriptores** en orden de dependencia.
- Cada descriptor cumple una variante de **ResourceDescriptor** (shared):
  - **NetworkDescriptor**: `type: "network"`, `key: "network"`, `cidrBlock`, `publicSubnetCidrs`, `privateSubnetCidrs`.
  - **LoadBalancerDescriptor**: `type: "loadBalancer"`, `subnetIds: { ref: "network.publicSubnetIds" }`.
  - **ContainerServiceDescriptor**: `vpcId: { ref: "network.vpcId" }`, `subnetIds: { ref: "network.privateSubnetIds" }`.
  - **DatabaseDescriptor**: `subnetIds: { ref: "network.privateSubnetIds" }`.
  - **SecretsDescriptor**, **MonitoringDescriptor**: sin refs.

**Interfaces/contratos (shared):**
- `ResourceDescriptor` (union de todos los *Descriptor).
- `Ref`: `{ ref: string }` (ej. `"network.privateSubnetIds"`).
- `BaseDescriptor`: `name`, `key?`, `tags?`.
- `NetworkDescriptor`, `LoadBalancerDescriptor`, `ContainerServiceDescriptor`, `DatabaseDescriptor`, etc.

El **orden** del array es importante: un recurso solo puede referenciar (`ref`) salidas de recursos ya creados (anteriores en la lista).

---

## 3. Motor genérico: createResources

**Archivo:** `src/packages/provider-factory/src/createResources.ts`

- **createResources(provider, descriptors, baseContext)**:
  1. Obtiene los adapters del provider: **getProvider(provider)** → `IProviderAdapters` (aws/azure/gcp).
  2. Inicializa **context** = `{}`.
  3. Para **cada descriptor** (en orden):
     - **contextKey** = `descriptor.key ?? descriptor.name` (ej. `"network"`, `"database"`).
     - **resolveDescriptor(descriptor, context, baseContext)** → objeto con refs resueltas y baseContext fusionado.
     - Quita `type` y `key` del objeto resuelto → **args** para el adapter.
     - Según **descriptor.type** llama a **adapters[type].create(args)** (ej. `adapters.database.create(args)`).
     - Guarda el resultado en **context[contextKey]** (ej. `context["database"] = outputs`).
  4. Devuelve **context** con todas las salidas.

**Contratos:**
- **Entrada:** `ResourceDescriptor[]`, `BaseContext` (shared).
- **Salida:** `ResourceContext` = `Record<string, unknown>` (claves = key de cada recurso, valores = salidas del adapter).
- **Uso interno:** `IProviderAdapters` (provider-factory/types): cada propiedad es un adapter que cumple `I*ComponentAdapter`.

---

## 4. Resolución de referencias (Ref)

**Archivo:** `src/packages/provider-factory/src/resolveRefs.ts`

- **resolveDescriptor(descriptor, context, baseContext)**:
  1. **resolveValue(descriptor, context)**: recorre el descriptor y donde encuentra un **Ref** (`{ ref: "x.y" }`) lo sustituye por **getByPath(context, "x.y")** (ej. `context["network"]["privateSubnetIds"]` → `Output<string[]>`).
  2. Fusiona **baseContext** con el descriptor ya resuelto: `{ ...baseContext, ...resolved }`.
  3. Devuelve ese objeto (que luego createResources pasa a los adapters sin `type`/`key`).

**Contratos:**
- **Ref** e **isRef** (shared/descriptors).
- **BaseContext** (shared/descriptors).
- **context**: mismo formato que **ResourceContext** (salidas ya creadas).

Así, cuando el descriptor de database tiene `subnetIds: { ref: "network.privateSubnetIds" }`, el **args** que recibe el adapter de database tiene `subnetIds` = `context.network.privateSubnetIds` (un `Output<string[]>` de Pulumi).

---

## 5. Factory de adapters por provider

**Archivo:** `src/packages/provider-factory/src/ProviderFactory.ts`

- **getProvider(provider)** devuelve el conjunto de adapters del cloud:
  - `"aws"` → **awsAdapters**
  - `"azure"` → **azureAdapters**
  - `"gcp"` → **gcpAdapters**

**Archivo:** `src/packages/provider-factory/src/types.ts`

- **IProviderAdapters**: interfaz que agrupa todos los adapters por tipo de recurso:
  - `network: INetworkComponentAdapter`
  - `loadBalancer: ILoadBalancerComponentAdapter`
  - `containerService: IContainerServiceComponentAdapter`
  - `database: IDatabaseComponentAdapter`
  - `secrets`, `monitoring`, `firewall`, `dns`, `staticHosting`, `cdn`

Cada uno de esos tipos viene de **shared** (componentes). Así el motor solo depende del contrato **IProviderAdapters** y no del cloud concreto.

---

## 6. Contratos de componentes (shared)

**Carpeta:** `src/packages/shared/src/components/`

Cada componente define **3 contratos** (ejemplo: base de datos):

**Archivo:** `src/packages/shared/src/components/databaseComponent.ts`

- **DatabaseComponentArgs**: lo que necesita el adapter para crear la DB.
  - `name`, `instanceSize`, `storageGb`, `provider`, `region`, `subnetIds` (Input), `tags?`.
- **DatabaseComponentOutputs**: lo que devuelve el adapter (tipos Pulumi Output).
  - `host`, `port`, `endpoint` (todos `Output<T>`).
- **IDatabaseComponentAdapter**: contrato del adapter.
  - `create(args: DatabaseComponentArgs): DatabaseComponentOutputs`.

Equivalentes para el resto:
- `networkComponent.ts` → NetworkComponentArgs, NetworkComponentOutputs, INetworkComponentAdapter
- `loadBalancerComponent.ts` → LoadBalancerComponentArgs/Outputs, ILoadBalancerComponentAdapter
- `containerServiceComponent.ts`, `secretsComponent.ts`, `monitoringComponent.ts`, `firewallComponent.ts`, `dnsComponent.ts`, `staticHostingComponent.ts`, `cdnComponent.ts`

**Shared no importa** ningún SDK de cloud; solo tipos y estas interfaces.

---

## 7. Implementación por cloud (adapters)

**Archivo:** `src/packages/provider-factory/src/aws/index.ts`

- **awsAdapters**: objeto que implementa **IProviderAdapters**.
  - Cada propiedad delega en una función concreta, por ejemplo:
  - `database: { create: (args) => createAwsDatabase(args) }`.

**Archivo:** `src/packages/provider-factory/src/aws/database.ts`

- **createAwsDatabase(args: DatabaseComponentArgs): DatabaseComponentOutputs**
  - Recibe **DatabaseComponentArgs** (cumple el contrato de shared).
  - Usa **@pulumi/aws** para crear:
    - `aws.rds.SubnetGroup`
    - `aws.rds.Instance` (engine postgres, instanceClass = args.instanceSize, etc.).
  - Devuelve **DatabaseComponentOutputs** (`host`, `port`, `endpoint`).

Otros archivos en `provider-factory/src/aws/`: `network.ts`, `loadBalancer.ts`, `containerService.ts`, `secrets.ts`, `monitoring.ts`, `firewall.ts`, `dns.ts`, `staticHosting.ts`, `cdn.ts`. Cada uno implementa el **I*ComponentAdapter** correspondiente usando la API de AWS.

---

## 8. Descriptores y contexto base (shared)

**Archivo:** `src/packages/shared/src/descriptors.ts`

- **Ref**, **isRef**: referencia a salida de otro recurso.
- **BaseDescriptor**: base de todos los descriptores (name, key?, tags?).
- ***Descriptor**: uno por tipo de recurso (NetworkDescriptor, DatabaseDescriptor, …), con `type` y props específicas; algunos props pueden ser **Ref**.
- **ResourceDescriptor**: unión de todos los *Descriptor.
- **BaseContext**: `{ provider, region, tags }` inyectado en todos los recursos.

**Archivo:** `src/packages/shared/src/types.ts`

- **CloudProvider**: `"aws" | "azure" | "gcp"`.
- **StackConfig**, **StackConfigBase**, etc. (tipos en shared; no usados en el flujo createResources).

**Archivo:** `src/packages/shared/src/index.ts`

- Reexporta types, components y descriptors para que el resto del monorepo importe desde `@cloud-platform/shared`.

---

## 9. Flujo de datos (ejemplo: database)

```
Pulumi config (cloud:provider=aws, dbSize=db.t3.micro, …)
    ↓
backend-infra/src/index.ts
    → getBackendResources(stackName, config)  →  ResourceDescriptor[]
    → createResources("aws", resources, { provider, region, tags })
    ↓
provider-factory/createResources.ts
    → getProvider("aws")  →  awsAdapters (IProviderAdapters)
    → for descriptor in resources:
         si descriptor.type === "database":
           resolved = resolveDescriptor(descriptor, context, baseContext)
           args = { ...resolved sin type/key }   →  cumple DatabaseComponentArgs
           outputs = adapters.database.create(args)
           context["database"] = outputs
    ↓
provider-factory/resolveRefs.ts
    → resolveValue(descriptor, context)
       subnetIds: { ref: "network.privateSubnetIds" }  →  context.network.privateSubnetIds (Output<string[]>)
    → { ...baseContext, ...resolved }  →  args con provider, region, tags, name, instanceSize, storageGb, subnetIds (ya resuelto), …
    ↓
provider-factory/aws/database.ts (createAwsDatabase)
    → Recibe DatabaseComponentArgs (contrato shared).
    → Crea aws.rds.SubnetGroup, aws.rds.Instance (RDS Postgres).
    → Devuelve DatabaseComponentOutputs (host, port, endpoint).
    ↓
context["database"] = { host, port, endpoint }
    ↓
backend-infra/src/index.ts
    → database = ctx.database
    → export databaseEndpoint, databaseHost, databasePort
```

---

## 10. Tabla de archivos que intervienen

| Capa | Archivo | Rol |
|------|---------|-----|
| Stack | `src/packages/backend-infra/src/index.ts` | Config, lista de recursos, createResources, export de outputs. |
| Stack | `src/packages/backend-infra/src/resources.ts` | Define ResourceDescriptor[] (getBackendResources). |
| Motor | `src/packages/provider-factory/src/createResources.ts` | Loop sobre descriptors, resolve + adapter.create, llena context. |
| Motor | `src/packages/provider-factory/src/resolveRefs.ts` | Resuelve Ref contra context y fusiona BaseContext. |
| Factory | `src/packages/provider-factory/src/ProviderFactory.ts` | getProvider(provider) → awsAdapters | azureAdapters | gcpAdapters. |
| Contratos | `src/packages/provider-factory/src/types.ts` | IProviderAdapters (agrupa todos los I*ComponentAdapter). |
| Adapters | `src/packages/provider-factory/src/aws/index.ts` | awsAdapters: objeto que implementa IProviderAdapters. |
| Adapters | `src/packages/provider-factory/src/aws/database.ts` | createAwsDatabase: DatabaseComponentArgs → DatabaseComponentOutputs (RDS). |
| Shared | `src/packages/shared/src/descriptors.ts` | Ref, BaseDescriptor, *Descriptor, ResourceDescriptor, BaseContext. |
| Shared | `src/packages/shared/src/types.ts` | CloudProvider. |
| Shared | `src/packages/shared/src/components/databaseComponent.ts` | DatabaseComponentArgs, DatabaseComponentOutputs, IDatabaseComponentAdapter. |
| Shared | `src/packages/shared/src/components/*.ts` | Resto de Args, Outputs, I*Adapter. |
| Shared | `src/packages/shared/src/index.ts` | Reexport de types, components, descriptors. |

---

## 11. Resumen de contratos (quién cumple qué)

- **ResourceDescriptor** (shared): lo cumplen los objetos que devuelve **getBackendResources** / **getFrontendResources**.
- **BaseContext** (shared): lo construye **backend-infra/index** y lo pasa a **createResources**.
- **IProviderAdapters** (provider-factory): lo cumplen **awsAdapters**, **azureAdapters**, **gcpAdapters**.
- **IDatabaseComponentAdapter** (shared): lo cumple **adapters.database** de cada provider; en AWS, **createAwsDatabase**.
- **DatabaseComponentArgs** (shared): lo cumple el objeto **args** que createResources pasa a **adapters.database.create** (tras resolver refs y quitar type/key).
- **DatabaseComponentOutputs** (shared): lo cumple el retorno de **createAwsDatabase** y se guarda en **context["database"]**.

El mismo esquema se aplica al resto de tipos de recurso (network, loadBalancer, containerService, secrets, monitoring, etc.): descriptores en shared, motor en provider-factory, adapters por cloud que cumplen las interfaces de shared.
