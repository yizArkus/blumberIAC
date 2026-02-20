# cloud-platform — Infra con Pulumi (AWS). Una sola forma de ejecutar.
#
# Requisitos: Node 18+, Pulumi CLI, credenciales AWS.
#
# Flujo (siempre con STACK=; por defecto dev):
#
#   1. make setup STACK=dev
#   2. make deploy-permissions STACK=dev
#   3. make deploy-frontend STACK=dev   o   make deploy-backend STACK=dev
#
# Tras deploy-permissions, adjunta la policy al usuario en IAM (ver docs/security).

STACK ?= dev
ROOT := $(patsubst %/,%,$(dir $(abspath $(firstword $(MAKEFILE_LIST)))))
BACKEND := $(ROOT)/src/packages/backend-infra
FRONTEND := $(ROOT)/src/packages/frontend-infra
INFRA_PERMS := $(ROOT)/src/packages/infra-permissions
RUNTIME_PERMS := $(ROOT)/src/packages/runtime-permissions
NOOP := node -e "process.exit(0)"
FRONTEND_REPO_URL ?= https://github.com/yizArkus/blumberIAC
FRONTEND_BRANCH ?= main

.PHONY: install build setup deploy-permissions deploy-frontend deploy-backend destroy-frontend destroy-backend

install:
	npm install

build:
	npm run build

# 1) Setup: stack + config. Si eliges otro stack en la lista, el setup aplica la config a ese stack.
setup:
	cd "$(ROOT)" && node scripts/ensure-stack.js $(STACK) "$(FRONTEND)" "$(BACKEND)" "$(INFRA_PERMS)" "$(RUNTIME_PERMS)"
	cd "$(ROOT)" && node scripts/apply-stack-config.js $(STACK) "$(FRONTEND)" "$(BACKEND)" "$(INFRA_PERMS)" "$(FRONTEND_REPO_URL)" "$(FRONTEND_BRANCH)"

# 2) Despliega la policy IAM para quien hace deploy. Una vez; luego adjunta la policy al usuario.
deploy-permissions: build
	cd "$(INFRA_PERMS)" && pulumi stack select $(STACK) && pulumi up

# 3a) Despliega el frontend (Amplify).
deploy-frontend: build
	cd "$(FRONTEND)" && pulumi stack select $(STACK) && pulumi up

# 3b) Despliega el backend.
deploy-backend: build
	cd "$(BACKEND)" && pulumi stack select $(STACK) && pulumi up

destroy-frontend:
	cd "$(FRONTEND)" && pulumi stack select $(STACK) && pulumi destroy

destroy-backend:
	cd "$(BACKEND)" && pulumi stack select $(STACK) && pulumi destroy
