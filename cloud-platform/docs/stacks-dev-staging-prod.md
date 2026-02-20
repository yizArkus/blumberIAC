# Stacks: dev, staging y prod

Los tres stacks (**dev**, **staging**, **prod**) comparten los **mismos requisitos** (~$150/mes). Los archivos de config están versionados: `Pulumi.dev.yaml`, `Pulumi.staging.yaml`, `Pulumi.prod.yaml` (sin .example).

---

## 1. Crear los stacks (una vez por proyecto)

```bash
cd src/packages/backend-infra
pulumi stack init dev
pulumi stack init staging
pulumi stack init prod
```

```bash
cd src/packages/frontend-infra
pulumi stack init dev
pulumi stack init staging
pulumi stack init prod
```

---

## 2. Configurar cada stack (backend: contraseña obligatoria)

Los YAML ya existen. Solo falta setear el **secret** de la BD (no va en el YAML en claro):

```bash
cd src/packages/backend-infra
pulumi stack select dev
pulumi config set --secret database:password "tu-password-seguro"
```

Repite para `staging` y `prod` (stack select + config set --secret).

---

## 3. Desplegar por stack

```bash
cd src/packages/backend-infra
pulumi stack select dev   # o staging | prod
pulumi up
```

```bash
cd src/packages/frontend-infra
pulumi stack select dev
pulumi up
```

---

## 4. Requisitos unificados (~$150/mes)

Los tres stacks usan la **misma** configuración base:

| Componente | Config |
|------------|--------|
| VPC & Subnets | 1 VPC, public/private subnets, route tables |
| Internet Gateway | 1 IGW |
| NAT Gateway | 1 NAT (~$37) |
| ALB | 1 Application Load Balancer (~$24) |
| ECS Fargate (backend) | 1 service, 0.25 vCPU / 0.5 GB RAM (~$12) |
| RDS PostgreSQL | db.t4g.micro, Single-AZ, 20 GB gp3 (~$15) |
| Frontend (Amplify / Static Web Apps / Firebase) | frontendHosting, bajo tráfico (~$10) |
| WAF | 1 Web ACL (~$16) |
| Secrets Manager | Uso mínimo (~$1) |
| CloudWatch | Logs y métricas básicas (~$6) |

**Backend stacks:** `instanceSize: t3.micro`, `dbSize: db.t4g.micro`, `minCapacity/maxCapacity: 1`, `database:storageGb: 20`, `database:storageType: gp3`.  
**Única diferencia:** en **prod** `database:skipFinalSnapshot: false` para crear snapshot al destruir.

---

## 5. Cambiar de proveedor (multi-cloud)

Se usan **los mismos** archivos YAML para todos los proveedores. Lo único que cambia es el valor de `cloud:provider` y los valores que dependen del proveedor:

| Clave | AWS (ej.) | Azure / GCP (ej.) |
|-------|-----------|-------------------|
| `cloud:provider` | `aws` | `azure` / `gcp` |
| `cloud:region` | `us-east-1` | `eastus` / `us-central1` |
| `instanceSize` | `t3.micro` | SKU de VM / machine type |
| `dbSize` | `db.t4g.micro` | Tier del proveedor |

Las **claves** de config se mantienen; cada adapter (AWS, Azure, GCP) interpreta los valores según su API. No hace falta otro juego de YAML por proveedor.

---

## 6. Archivos versionados

`Pulumi.dev.yaml`, `Pulumi.staging.yaml` y `Pulumi.prod.yaml` están en el repo (`.gitignore` los excluye de ignorar). La contraseña de la BD se setea con `pulumi config set --secret` y queda cifrada en el YAML local.
