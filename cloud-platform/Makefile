# cloud-platform — Multi-cloud infra (AWS/Azure/GCP). Pulumi + TypeScript.
# Run from repo root: cd cloud-platform then make <target>.
# Requires: Node 18+, Pulumi CLI, cloud credentials.

# Use Makefile directory as root so paths work when run from any cwd
ROOT := $(patsubst %/,%,$(dir $(abspath $(firstword $(MAKEFILE_LIST)))))
BACKEND := $(ROOT)/src/packages/backend-infra
FRONTEND := $(ROOT)/src/packages/frontend-infra
INFRA_PERMS := $(ROOT)/src/packages/infra-permissions
RUNTIME_PERMS := $(ROOT)/src/packages/runtime-permissions
NOOP := node -e "process.exit(0)"

.PHONY: install build
install:
	npm install
build:
	npm run build

# --- Backend (ECS, RDS, ALB, etc.) ---
.PHONY: backend-stack backend-config backend-preview backend-deploy backend-destroy
backend-stack:
	cd "$(BACKEND)" && (pulumi stack init dev || $(NOOP)) && pulumi stack select dev
backend-config:
	cd "$(BACKEND)" && pulumi config set --secret database:password "$${DB_PASSWORD:-changeme}"
backend-preview: build
	cd "$(BACKEND)" && pulumi stack select dev && pulumi preview
backend-deploy: build
	cd "$(BACKEND)" && pulumi stack select dev && pulumi up
backend-destroy:
	cd "$(BACKEND)" && pulumi stack select dev && pulumi destroy

# --- Frontend (Amplify / Static Web Apps / Firebase) ---
# Run frontend-config once (or before deploy) so Pulumi Cloud has required keys.
.PHONY: frontend-stack frontend-config frontend-preview frontend-deploy frontend-destroy
frontend-stack:
	cd "$(FRONTEND)" && (pulumi stack init dev || $(NOOP)) && pulumi stack select dev
frontend-config:
	cd "$(FRONTEND)" && pulumi config set cloudProvider aws && pulumi config set cloudRegion us-east-1 && pulumi config set domain example.com && pulumi config set budgetLimit 150
frontend-preview: build frontend-config
	cd "$(FRONTEND)" && pulumi stack select dev && pulumi preview
frontend-deploy: build frontend-config
	cd "$(FRONTEND)" && pulumi stack select dev && pulumi up
frontend-destroy:
	cd "$(FRONTEND)" && pulumi stack select dev && pulumi destroy

# --- Infra permissions (IAM for deployers: who runs Pulumi) ---
.PHONY: infra-permissions-stack infra-permissions-config infra-permissions-preview infra-permissions-deploy infra-permissions-destroy
infra-permissions-stack:
	cd "$(INFRA_PERMS)" && (pulumi stack init dev || $(NOOP)) && pulumi stack select dev
infra-permissions-config:
	cd "$(INFRA_PERMS)" && pulumi config set cloudProvider aws && pulumi config set cloudRegion us-east-1
infra-permissions-preview: build
	cd "$(INFRA_PERMS)" && pulumi stack select dev && pulumi preview
infra-permissions-deploy: build
	cd "$(INFRA_PERMS)" && pulumi stack select dev && pulumi up
infra-permissions-destroy:
	cd "$(INFRA_PERMS)" && pulumi stack select dev && pulumi destroy

# --- Runtime permissions (IAM for app at runtime: ECS task role, etc.) ---
.PHONY: runtime-permissions-stack runtime-permissions-config runtime-permissions-preview runtime-permissions-deploy runtime-permissions-destroy
runtime-permissions-stack:
	cd "$(RUNTIME_PERMS)" && (pulumi stack init dev || $(NOOP)) && pulumi stack select dev
runtime-permissions-config:
	cd "$(RUNTIME_PERMS)" && pulumi config set cloudProvider aws && pulumi config set cloudRegion us-east-1
runtime-permissions-preview: build
	cd "$(RUNTIME_PERMS)" && pulumi stack select dev && pulumi preview
runtime-permissions-deploy: build
	cd "$(RUNTIME_PERMS)" && pulumi stack select dev && pulumi up
runtime-permissions-destroy:
	cd "$(RUNTIME_PERMS)" && pulumi stack select dev && pulumi destroy

# --- Stacks: staging / prod (e.g. make frontend-deploy-stack STACK=prod) ---
STACK ?= dev
.PHONY: backend-deploy-stack frontend-deploy-stack infra-permissions-deploy-stack runtime-permissions-deploy-stack
backend-deploy-stack: build
	cd "$(BACKEND)" && pulumi stack select $(STACK) && pulumi up
frontend-deploy-stack: build
	cd "$(FRONTEND)" && pulumi stack select $(STACK) && pulumi up
infra-permissions-deploy-stack: build
	cd "$(INFRA_PERMS)" && pulumi stack select $(STACK) && pulumi up
runtime-permissions-deploy-stack: build
	cd "$(RUNTIME_PERMS)" && pulumi stack select $(STACK) && pulumi up
