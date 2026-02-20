# Flujo: elegir AWS y usar RDS con PostgreSQL

## Resumen del flujo

```
Tú configuras (Pulumi)  →  backend-infra lee config  →  getProvider("aws")  →  aws adapter DB  →  RDS PostgreSQL
```

---

## Paso 1: Configurar el provider (AWS) y el stack

En la carpeta del proyecto **backend-infra** ejecutas:

```bash
cd src/packages/backend-infra
pulumi config set cloud:provider aws
pulumi config set cloud:region us-east-1
```

Opcional (tamaño de instancia y de DB; si no, se usan defaults):

```bash
pulumi config set instanceSize t3.micro
pulumi config set dbSize db.t3.micro
```

Eso guarda en `Pulumi.<stack>.yaml` algo como:

```yaml
config:
  backend-infra:cloud:provider: aws
  backend-infra:cloud:region: us-east-1
  backend-infra:instanceSize: t3.micro
  backend-infra:dbSize: db.t3.micro
```

---

## Paso 2: backend-infra lee la config y elige el provider

En **`src/packages/backend-infra/src/index.ts`**:

```ts
const config = new pulumi.Config();
const provider = config.require("cloud:provider") as CloudProvider;  // "aws"
const dbSize = config.get("dbSize") ?? "db.t3.micro";
// ...
const providerAdapters = getProvider(provider);   // ← aquí se elige AWS
```

- `provider` sale de lo que pusiste con `pulumi config set cloud:provider aws`.
- `getProvider(provider)` devuelve los adapters de ese cloud.

---

## Paso 3: ProviderFactory devuelve los adapters de AWS

En **`src/packages/provider-factory/src/ProviderFactory.ts`**:

```ts
export function getProvider(provider: CloudProvider): IProviderAdapters {
  switch (provider) {
    case "aws":
      return awsAdapters;   // ← para DB usará el adapter de AWS
    case "azure":
      return azureAdapters;
    case "gcp":
      return gcpAdapters;
    // ...
  }
}
```

Si `provider === "aws"`, todo lo que hagas con `providerAdapters` (network, loadBalancer, **database**, etc.) usará la implementación de **AWS**.

---

## Paso 4: backend-infra pide crear la base de datos

En **`src/packages/backend-infra/src/index.ts`**:

```ts
const database = providerAdapters.database.create({
  name: `backend-db-${stackName}`,
  instanceSize: dbSize,        // ej. "db.t3.micro"
  storageGb: 20,
  provider,
  region,
  subnetIds: network.privateSubnetIds,
  tags,
});
```

- `providerAdapters` aquí es **awsAdapters**.
- Por tanto `providerAdapters.database.create(...)` llama a la implementación **AWS** del componente de base de datos.

---

## Paso 5: El adapter de AWS crea RDS con PostgreSQL

En **`src/packages/provider-factory/src/aws/database.ts`**:

```ts
export function createAwsDatabase(args: DatabaseComponentArgs): DatabaseComponentOutputs {
  // ...
  const db = new aws.rds.Instance(args.name, {
    allocatedStorage: args.storageGb,
    storageType: "gp3",
    engine: "postgres",        // ← motor: PostgreSQL
    engineVersion: "15",      // ← versión 15
    instanceClass: args.instanceSize,   // ej. db.t3.micro
    dbName: args.name.replace(/-/g, "_"),
    username: "admin",
    password: pulumi.secret("changeme-in-production"),
    dbSubnetGroupName: subnetGroup.name,
    publiclyAccessible: false,
    skipFinalSnapshot: true,
    tags: { ...tags, Name: args.name },
  });
  // ...
}
```

Ahí se crea:

- Un **Subnet Group** de RDS en las subnets privadas.
- Una **instancia RDS** con:
  - **Motor:** PostgreSQL 15 (RDS Postgres).
  - **Clase:** la que viene de config (`dbSize` → `instanceClass`, ej. `db.t3.micro`).
  - **Almacenamiento:** `storageGb` (ej. 20).

Eso es exactamente **RDS con PostgreSQL**.

---

## Diagrama del flujo (AWS + RDS PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TÚ (terminal)                                                           │
│  pulumi config set cloud:provider aws                                    │
│  pulumi config set dbSize db.t3.micro                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  backend-infra/src/index.ts                                              │
│  provider = config.require("cloud:provider")  →  "aws"                   │
│  providerAdapters = getProvider(provider)     →  awsAdapters             │
│  database = providerAdapters.database.create({ instanceSize: dbSize })  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  provider-factory: getProvider("aws")  →  awsAdapters                    │
│  awsAdapters.database  →  createAwsDatabase (aws/database.ts)           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  aws/database.ts                                                         │
│  new aws.rds.Instance({ engine: "postgres", engineVersion: "15", ... })  │
│  →  Crea RDS PostgreSQL en AWS                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen

| Qué quieres              | Dónde se define / cómo                          |
|--------------------------|--------------------------------------------------|
| Usar **AWS**             | `pulumi config set cloud:provider aws`           |
| **RDS**                  | Sale de elegir AWS (el adapter de AWS usa RDS)   |
| **PostgreSQL**           | Hoy fijo en `aws/database.ts`: `engine: "postgres"`, `engineVersion: "15"` |
| Tamaño de instancia (DB) | `pulumi config set dbSize db.t3.micro` (o en stack config) |

Para que “PostgreSQL” también sea configurable (por ejemplo elegir postgres vs mysql por config), se puede añadir un parámetro `engine` en el componente compartido y en la config de Pulumi; el flujo seguiría siendo el mismo, solo que ese valor bajaría hasta `aws.rds.Instance({ engine: ... })`.
