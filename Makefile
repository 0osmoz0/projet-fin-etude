# Infra escape game — commandes DevOps locales
# Usage: make help

SHELL := /bin/bash
COMPOSE ?= docker compose
ENV_FILE ?= .env

.DEFAULT_GOAL := help

.PHONY: help env-check ports-check config lint lint-docker lint-yaml lint-shell lint-workflows build up down restart ps logs smoke smoke-ssh wait clean reset-hard pre-commit-install

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

env-check: ## Vérifie que .env existe (copie depuis .env.example si absent)
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo "→ $(ENV_FILE) absent, copie depuis .env.example"; \
		cp .env.example "$(ENV_FILE)"; \
	fi

ports-check: env-check ## Vérifie que HUB_PORT et PIVOT_PORT sont libres
	./scripts/check-ports.sh

config: env-check ## Valide docker-compose.yml
	$(COMPOSE) config -q

lint: lint-yaml lint-docker lint-shell lint-workflows ## Tous les linters locaux

lint-yaml: ## yamllint sur compose + .github
	@command -v yamllint >/dev/null || { echo "Installez yamllint: pip install yamllint"; exit 1; }
	yamllint -c .yamllint.yml docker-compose.yml docker-compose.override.yml.example .github/

lint-docker: ## hadolint sur tous les Dockerfiles
	@command -v hadolint >/dev/null || { echo "Installez hadolint: https://github.com/hadolint/hadolint"; exit 1; }
	@for f in services/*/Dockerfile; do \
		echo "→ $$f"; \
		hadolint -c .hadolint.yaml "$$f" || exit 1; \
	done

lint-shell: ## shellcheck sur scripts/
	@command -v shellcheck >/dev/null || { echo "Installez shellcheck"; exit 1; }
	shellcheck -x scripts/*.sh scripts/lib/common.sh

lint-workflows: ## actionlint sur les workflows GitHub
	@command -v actionlint >/dev/null || { echo "Installez actionlint: https://github.com/rhysd/actionlint"; exit 1; }
	actionlint

build: env-check ## Build toutes les images
	$(COMPOSE) build --pull

up: env-check ports-check ## Démarre la stack (détaché)
	$(COMPOSE) up -d --build

down: ## Arrête la stack
	$(COMPOSE) down

restart: down up ## Redémarrage propre

ps: ## État des conteneurs
	$(COMPOSE) ps -a

logs: ## Logs en continu
	$(COMPOSE) logs -f --tail=100

wait: env-check ## Attend que les healthchecks passent
	./scripts/wait-healthy.sh

smoke: env-check ## Tests HTTP de fumée (hub + pivot + CCTV relay)
	./scripts/smoke-test.sh

smoke-ssh: env-check ## Tests voie SSH ops → CCTV (stack déjà up)
	./scripts/smoke-ssh.sh

test: up wait smoke ## Pipeline locale complète (up → health → smoke)

clean: down ## Arrêt sans supprimer les volumes

reset-hard: ## Reset complet (volumes + rebuild)
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE) up -d --build

pre-commit-install: ## Installe les hooks pre-commit
	@command -v pre-commit >/dev/null || { echo "pip install pre-commit"; exit 1; }
	pre-commit install
