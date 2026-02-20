# cloud-platform

Monorepo **multi-cloud** (AWS, Azure, GCP) con Pulumi y TypeScript. La estructura base **no está atada a ningún proveedor**; el proveedor se elige por stack.

## Estructura

```
cloud-platform/
├── src/
│   └── packages/
│       ├── shared/            # Componentes reutilizables agnósticos al provider
│       ├── provider-factory/  # Factory e implementaciones por cloud (AWS, Azure, GCP)
│       ├── frontend-infra/    # Infraestructura del frontend (Amplify, DNS, WAF)
│       ├── backend-infra/     # Infraestructura del backend (container, LB, DB, secrets, monitoring)
│       ├── infra-permissions/ # IAM: permisos para quien despliega (Pulumi)
│       └── runtime-permissions/ # IAM: permisos para la app en ejecución (ECS, Lambda)
├── docs/security/            # Ejemplos de políticas (Infra Deployer, App Runtime)
├── package.json
└── tsconfig.json
```

## Requisitos

- Node.js >= 18
- Pulumi CLI
- Credenciales del cloud elegido (AWS CLI, Azure CLI o gcloud)

## Instalación

```bash
npm install
npm run build
```

## Cómo cambiar el provider

El provider se define por **configuración de stack**, no en código:

```bash
# Para frontend-infra
cd src/packages/frontend-infra
pulumi config set cloud:provider aws    # o azure | gcp
pulumi config set cloud:region us-east-1
```

```bash
# Para backend-infra
cd src/packages/backend-infra
pulumi config set cloud:provider aws
pulumi config set cloud:region us-east-1
```

Solo **AWS** tiene implementaciones completas en este repo. Azure y GCP tienen adapters stub; se pueden extender en `src/packages/provider-factory/src/azure/` y `src/packages/provider-factory/src/gcp/`.

## Cómo cambiar de stack

Cada proyecto (frontend-infra y backend-infra) tiene sus propios stacks. Por defecto se usa el stack actual.

```bash
cd src/packages/frontend-infra
pulumi stack select dev      # o staging, prod
# o crear uno nuevo
pulumi stack init my-stack
```

Configuración por stack (ejemplo para `dev`):

```bash
pulumi config set cloud:provider aws
pulumi config set cloud:region us-east-1
pulumi config set instanceSize t3.micro
pulumi config set dbSize db.t3.micro
pulumi config set minCapacity 1
pulumi config set maxCapacity 2
pulumi config set budgetLimit 150
```

La región **no está hardcodeada**: se usa siempre `cloud:region` del config.

## Cómo desplegar el frontend

1. Configurar provider y región (ver arriba).
2. Crear/seleccionar stack y configurar `domain` si usas DNS propio.
3. Desplegar:

```bash
cd src/packages/frontend-infra
npm run build
pulumi up
```

Se crean: hosting (Amplify en AWS), DNS (Route53), WAF.

## Cómo desplegar el backend

1. Configurar provider y región.
2. Opcional: `containerImage`, `instanceSize`, `dbSize`, `minCapacity`, `maxCapacity`, `budgetLimit`.
3. Desplegar:

```bash
cd src/packages/backend-infra
npm run build
pulumi up
```

Se crean: red (VPC), load balancer, servicio de contenedores (ECS Fargate en AWS), base de datos (RDS), secrets manager, monitoring (CloudWatch).

## Restricción de costos (~150 USD/ambiente)

Los defaults están pensados para ~150 USD por ambiente:

- **Compute**: 1 servicio contenedor, 0.25–0.5 vCPU, 512MB–1GB RAM.
- **Base de datos**: instancia micro/small, 20GB.
- **Red**: 1 NAT Gateway, 1 Load Balancer.
- **Observabilidad**: logs y métricas básicos, sin autoscaling agresivo.

Ajusta `instanceSize`, `dbSize`, `minCapacity` y `maxCapacity` por stack según necesidad.

## Modelo de seguridad

Dos roles conceptuales:

| Rol | Quién | Permisos |
|-----|--------|----------|
| **Infra Deployer** | Quien ejecuta `pulumi up` | Networking, Compute, Database, IAM, DNS, Firewall, Secrets (completos para aprovisionar) |
| **App Runtime** | Identidad del backend/frontend en ejecución | Leer secretos, acceso a DB, escribir logs (mínimos) |

Ejemplos de políticas (AWS) en:

- `docs/security/infra-deployer-policy.example.json`
- `docs/security/app-runtime-policy.example.json`

**Orden recomendado:** desplegar **infra-permissions** primero, adjuntar la policy al usuario que ejecuta Pulumi, y después **frontend-infra** / **backend-infra**. Si el usuario de deploy no tiene permisos (p. ej. `amplify:TagResource`, `route53:CreateHostedZone`, `wafv2:CreateWebACL`), ver `docs/security/frontend-infra-iam-minimum.md`.

## Proyectos Pulumi independientes

- **frontend-infra**: se despliega con `cd src/packages/frontend-infra && pulumi up`.
- **backend-infra**: se despliega con `cd src/packages/backend-infra && pulumi up`.

Ambos consumen `@cloud-platform/shared` y `@cloud-platform/provider-factory`; no comparten estado ni stack.

## Configuración de ejemplo (AWS)

En `src/packages/frontend-infra` o `src/packages/backend-infra`:

```bash
pulumi config set cloud:provider aws
pulumi config set cloud:region us-east-1
pulumi config set budgetLimit 150
# frontend-infra
pulumi config set domain example.com
# backend-infra
pulumi config set containerImage nginx:alpine
pulumi config set instanceSize t3.micro
pulumi config set dbSize db.t3.micro
pulumi config set minCapacity 1
pulumi config set maxCapacity 2
```

## Licencia

Uso interno / según tu organización.
