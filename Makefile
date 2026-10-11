# ============================================================
# NGO OS (AWE System — Web) — Makefile
# Next.js 16 + pnpm 9 + Supabase + Docker
#
# Usage:
#   make env            # create .env.local from .env.example (first run only)
#   make install        # install deps (pnpm 9, Node >= 22.12)
#   make dev            # local dev server → http://localhost:3000
#   make up             # production image via Docker Compose (Docker Desktop)
#   make doctor         # sanity-check your machine
# Run `make help` for the full list.
# ============================================================

APP_NAME   := ngo
IMAGE      := ngo-web:local
CONTAINER  := ngo-web
PORT       ?= 3000
ENV_FILE   := .env.local
COMPOSE    := docker compose
PNPM       := pnpm

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "NGO OS — available targets:"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
	@echo ""
	@echo "Typical flows:"
	@echo "  Local dev (fastest):  make env install dev"
	@echo "  Docker prod (image):  make env up        # then open http://localhost:$(PORT)"
	@echo ""

# ------------------------------------------------------------
# First-run setup
# ------------------------------------------------------------
.PHONY: env
env: ## Create .env.local from .env.example if missing
	@if [ -f "$(ENV_FILE)" ]; then \
		echo "$(ENV_FILE) already exists — leaving it untouched."; \
	else \
		cp .env.example $(ENV_FILE); \
		echo "Created $(ENV_FILE) from .env.example."; \
		echo "Next: edit $(ENV_FILE) and set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,"; \
		echo "      SUPABASE_SERVICE_ROLE_KEY (and secrets via: openssl rand -hex 32)."; \
	fi

.PHONY: install
install: ## Install dependencies (frozen lockfile, pnpm 9)
	@node --version
	@corepack enable
	@corepack prepare pnpm@9.15.0 --activate
	@$(PNPM) install --frozen-lockfile

# ------------------------------------------------------------
# Local development (no Docker needed for the app itself)
# ------------------------------------------------------------
.PHONY: dev
dev: ## Run Next.js dev server on http://localhost:3000
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	@$(PNPM) run dev --port $(PORT)

.PHONY: build
build: ## Production build (local, non-standalone)
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	@$(PNPM) build

.PHONY: start
start: ## Serve the production build locally (needs: make build)
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	@$(PNPM) run start --port $(PORT)

# ------------------------------------------------------------
# Quality gates
# ------------------------------------------------------------
.PHONY: lint
lint: ## ESLint
	@$(PNPM) lint

.PHONY: typecheck
typecheck: ## TypeScript check (run typegen first in CI)
	@$(PNPM) typegen
	@$(PNPM) typecheck

.PHONY: test
test: ## Unit tests (vitest)
	@$(PNPM) test

.PHONY: verify
verify: ## Full local gate: typecheck + lint + tests + static verifiers
	@$(PNPM) verify

.PHONY: test-e2e
test-e2e: ## Playwright e2e (needs dev server or up running)
	@$(PNPM) test:e2e

# ------------------------------------------------------------
# Docker — production image (Dockerfile, standalone output)
# ------------------------------------------------------------
.PHONY: docker-build
docker-build: ## Build production image (needs Docker Desktop running)
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	docker build -t $(IMAGE) .

.PHONY: docker-run
docker-run: ## Run production image (foreground, --rm). Ctrl+C stops it
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	docker run --rm --name $(CONTAINER) -p $(PORT):3000 --env-file $(ENV_FILE) $(IMAGE)

.PHONY: up
up: ## Build + start production stack in background (Compose)
	@if [ ! -f "$(ENV_FILE)" ]; then echo "Missing $(ENV_FILE). Run: make env"; exit 1; fi
	$(COMPOSE) up --build -d
	@echo ""
	@echo "App: http://localhost:$(PORT)/api/health"
	@echo "Logs: make logs   | Stop: make down"

.PHONY: down
down: ## Stop Compose stack (keep image + volumes)
	$(COMPOSE) down

.PHONY: logs
logs: ## Tail app logs
	$(COMPOSE) logs -f app

.PHONY: ps
ps: ## Show running containers for this project
	$(COMPOSE) ps
	@docker ps --filter "name=$(CONTAINER)" --filter "name=supabase_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

.PHONY: docker-clean
docker-clean: ## Remove app container + image (frees disk)
	-$(COMPOSE) down --rmi local --volumes --remove-orphans
	-docker rmi $(IMAGE)

# ------------------------------------------------------------
# Supabase (local stack runs in Docker; yours is already UP)
# ------------------------------------------------------------
.PHONY: supabase-status
supabase-status: ## Show local Supabase status (API/DB/Studio URLs + keys)
	supabase status

.PHONY: supabase-start
supabase-start: ## Start local Supabase (needs Docker; no-op if already up)
	supabase start

.PHONY: supabase-stop
supabase-stop: ## Stop local Supabase (keeps data)
	supabase stop

.PHONY: supabase-reset
supabase-reset: ## Reset local DB: re-run ALL migrations + seed.sql (DESTROYS local data)
	supabase db reset

.PHONY: db-push
db-push: ## Push pending migrations to linked remote project
	supabase db push

.PHONY: gen-types
gen-types: ## Regenerate src/types/database.ts from linked project
	@$(PNPM) supabase:gen-types

.PHONY: seed-personas
seed-personas: ## Seed 4 staff users + org bootstrap (needs .env.local)
	@$(PNPM) seed:personas

.PHONY: seed-master
seed-master: ## Seed full demo dataset (needs .env.local)
	@$(PNPM) seed:master

# ------------------------------------------------------------
# Housekeeping
# ------------------------------------------------------------
.PHONY: clean
clean: ## Remove build/test artefacts (.next, coverage, playwright output)
	@$(PNPM) clean

.PHONY: clean-all
clean-all: clean ## Also remove node_modules + lock reinstall on next install
	rm -rf node_modules

.PHONY: doctor
doctor: ## Check Docker, Node, pnpm, env file, ports, Supabase containers
	@echo "--- docker ---"
	@docker --version
	@docker version --format "Docker OK: server {{.Server.Version}} ({{.Server.Os}})" 2>&1 | head -n 2
	@echo "--- compose ---"
	@$(COMPOSE) version
	@echo "--- node / pnpm ---"
	@node --version
	@($(PNPM) --version 2>&1 || echo "pnpm NOT found — run: make install") | head -n 2
	@echo "--- env ---"
	@if [ -f "$(ENV_FILE)" ]; then echo "$(ENV_FILE): present"; else echo "$(ENV_FILE): MISSING → run: make env"; fi
	@echo "--- ports ---"
	@(docker ps --format "{{.Names}} {{.Ports}}" | grep -E "54321|54322|54323|3000" || echo "no Supabase/app ports published (is local Supabase up? try: supabase status)") | head -n 10
	@echo "--- containers ---"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -n 15
	@echo ""
	@echo "Health: curl http://localhost:$(PORT)/api/health (after dev/up)"
