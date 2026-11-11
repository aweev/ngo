# ============================================================
# NGO OS (AWE System — Web)
# Next.js 16 · pnpm 9 · Node >= 22 · Supabase · Docker
#
#   make            # this help (default goal)
#   make setup      # first run: .env.local + dependencies + diagnostics
#   make dev        # local dev server → http://localhost:3000
#   make ci         # exactly what .github/workflows/web-ci.yml runs
#
# Targets are grouped in the order you normally run them, and every target
# delegates to a package.json script so `make` and `pnpm` can never drift.
# ============================================================

APP_NAME   := ngo
IMAGE      ?= ngo-web:local
CONTAINER  ?= ngo-web
PORT       ?= 3000
ENV_FILE   ?= .env.local
NODE_MIN   ?= 22.12.0
PNPM       ?= pnpm
PNPM_VER   ?= 9.15.0
DOCKER     ?= docker
COMPOSE    ?= $(DOCKER) compose
SUPABASE   ?= supabase

# Fail fast: one shell per recipe line, errexit + nounset + pipefail, so a
# failure in the middle of a pipeline can never be reported as success.
SHELL        := bash
.SHELLFLAGS  := -eu -o pipefail -c

# No implicit rules or built-in suffixes: every target is declared below.
MAKEFLAGS  += --no-builtin-rules
.SUFFIXES:

.DEFAULT_GOAL := help

# Honour NO_COLOR (https://no-color.org) for CI logs and dumb terminals.
ifdef NO_COLOR
C_BOLD :=
C_DIM  :=
C_CYAN :=
C_OFF  :=
else
C_BOLD := \033[1m
C_DIM  := \033[2m
C_CYAN := \033[36m
C_OFF  := \033[0m
endif

.PHONY: help \
        env install setup \
        dev build start \
        typegen typecheck functions-check lint test verify ci test-e2e \
        test-rls test-runtime \
        supabase-status supabase-start supabase-stop supabase-reset \
        db-push gen-types functions-deploy seed-personas seed-master \
        docker-build docker-run up down logs ps docker-clean \
        clean clean-all doctor require-env

##@ Meta

help: ## Show this help
	@printf '\n%b\n' "$(C_BOLD)$(APP_NAME) — available targets$(C_OFF)"
	@awk 'BEGIN {FS = ":.*##"} \
		/^##@/ {printf "\n$(C_BOLD)%s$(C_OFF)\n", substr($$0, 5); next} \
		/^[a-zA-Z0-9_-]+:.*##/ {printf "  $(C_CYAN)%-19s$(C_OFF) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n%b\n' "$(C_DIM)Overridable: PORT=4000 · IMAGE=… · SUPABASE=\"npx supabase\" · ENV_FILE=…$(C_OFF)"
	@printf '%b\n\n' "$(C_DIM)Live-DB suites need DATABASE_URL. Full runbook: supabase/README.md$(C_OFF)"

# Guard shared by every target that needs a real environment file.
require-env:
	@test -f "$(ENV_FILE)" || { \
		echo "Missing $(ENV_FILE). Run: make env" >&2; \
		exit 1; \
	}

##@ 1. First-run setup

env: ## Create .env.local from .env.example (never overwrites)
	@if [ -f "$(ENV_FILE)" ]; then \
		echo "$(ENV_FILE) already exists — left untouched."; \
	else \
		cp .env.example "$(ENV_FILE)"; \
		echo "Created $(ENV_FILE) from .env.example."; \
		echo "Now set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,"; \
		echo "SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET (openssl rand -hex 32)."; \
	fi

install: ## Install dependencies (pinned pnpm, frozen lockfile)
	@command -v node >/dev/null || { echo "Node.js $(NODE_MIN)+ is required." >&2; exit 1; }
	@command -v corepack >/dev/null || { echo "corepack is required — enable it with: corepack enable" >&2; exit 1; }
	@corepack enable
	@corepack prepare pnpm@$(PNPM_VER) --activate
	@$(PNPM) install --frozen-lockfile

setup: env install doctor ## First run: env file → dependencies → diagnostics
	@printf '\n%b\n' "$(C_BOLD)Setup complete.$(C_OFF) Next: edit $(ENV_FILE), then run: make dev"

##@ 2. Develop

dev: require-env ## Run the Next.js dev server on http://localhost:PORT
	@$(PNPM) run dev --port $(PORT)

build: require-env ## Production build (local, non-standalone)
	@$(PNPM) build

start: require-env ## Serve the production build (needs: make build)
	@$(PNPM) run start --port $(PORT)

##@ 3. Quality gates — fastest first, in the same order as CI

typegen: ## Generate Next.js route types (.next/types) — typecheck needs them
	@$(PNPM) typegen

typecheck: typegen ## TypeScript check for the app and lib
	@$(PNPM) typecheck

functions-check: ## Type-check supabase/functions (deno check, tsc fallback)
	@$(PNPM) verify:functions

lint: ## ESLint
	@$(PNPM) lint

test: ## Unit tests (vitest)
	@$(PNPM) test

verify: typegen ## Full local gate: typecheck → functions → lint → tests → static verifiers
	@$(PNPM) verify

# Mirrors .github/workflows/web-ci.yml, including the placeholder env the CI
# build uses, so it runs without a .env.local.
ci: verify ## Reproduce the CI pipeline locally (verify + standalone build)
	@NEXT_PUBLIC_APP_URL=http://localhost:3000 \
	 NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
	 NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
	 NEXT_OUTPUT=standalone $(PNPM) build
	@printf '\n%b\n' "$(C_BOLD)CI pipeline passed locally.$(C_OFF)"

test-e2e: ## Playwright end-to-end (needs: make dev or make up)
	@$(PNPM) test:e2e

##@ 4. Live database suites (need DATABASE_URL)

test-rls: ## Tenant-isolation + permission suite against a real database
	@test -n "$${DATABASE_URL:-}" || { \
		echo "Set DATABASE_URL, e.g." >&2; \
		echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres make test-rls" >&2; \
		exit 1; \
	}
	@$(PNPM) test:rls

test-runtime: ## Scheduled-runtime suite: claim RPC + pg_cron job contract
	@test -n "$${DATABASE_URL:-}" || { \
		echo "Set DATABASE_URL, e.g." >&2; \
		echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres make test-runtime" >&2; \
		exit 1; \
	}
	@$(PNPM) test:runtime

##@ 5. Supabase: local stack, migrations, functions, seeds

supabase-status: ## Show local Supabase URLs and keys
	@$(SUPABASE) status

supabase-start: ## Start the local Supabase stack (needs Docker)
	@$(SUPABASE) start

supabase-stop: ## Stop the local Supabase stack (keeps data)
	@$(SUPABASE) stop

supabase-reset: ## Re-apply all migrations + seed.sql to the LOCAL DB (destroys local data)
	@printf '%b\n' "Re-applying every migration and seed.sql to the LOCAL database."
	@$(SUPABASE) db reset

db-push: ## Push pending migrations to the linked remote project
	@printf '%b\n' "Pushing supabase/migrations to the linked project…"
	@$(SUPABASE) db push
	@printf '\n%b\n' "Migrations pushed. Regenerate the client types next: make gen-types"

gen-types: ## Regenerate src/types/database.ts from the linked project
	@$(PNPM) supabase:gen-types
	@printf '\n%b\n' "Types regenerated — review and commit src/types/database.ts."

functions-deploy: ## Deploy all Edge Functions (server-side bundling, no Docker)
	@$(SUPABASE) functions deploy --use-api --yes
	@printf '\n%b\n' "Functions deployed. Type-check them first with: make functions-check"

seed-personas: require-env ## Seed 4 staff users + org bootstrap (confirm-gated)
	@$(PNPM) seed:personas

seed-master: require-env ## Seed the full demo dataset (confirm-gated, slow)
	@$(PNPM) seed:master

##@ 6. Docker (production image)

docker-build: ## Build the production image
	@$(DOCKER) version >/dev/null 2>&1 || { echo "Docker is not reachable — start Docker first." >&2; exit 1; }
	@$(DOCKER) build -t $(IMAGE) .
	@printf '\n%b\n' "Built $(IMAGE). Run it with: make docker-run"

docker-run: require-env ## Run the production image in the foreground (Ctrl+C stops)
	@$(DOCKER) run --rm --name $(CONTAINER) -p $(PORT):3000 --env-file $(ENV_FILE) $(IMAGE)

up: require-env ## Build and start the production stack in the background (Compose)
	@$(COMPOSE) up --build -d
	@printf '\n%b\n' "Health: http://localhost:$(PORT)/api/health"
	@printf '%b\n' "Logs: make logs   |   Stop: make down"

down: ## Stop the Compose stack (keeps image and volumes)
	@$(COMPOSE) down

logs: ## Tail application logs
	@$(COMPOSE) logs -f app

ps: ## Show this project's containers
	@$(COMPOSE) ps
	@-$(DOCKER) ps --filter "name=$(CONTAINER)" --filter "name=supabase_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

docker-clean: ## Remove this project's containers, image and volumes
	@-$(COMPOSE) down --rmi local --volumes --remove-orphans
	@-$(DOCKER) rmi $(IMAGE)

##@ 7. Housekeeping & diagnostics

clean: ## Remove build and test artefacts (.next, coverage, Playwright output)
	@$(PNPM) clean

clean-all: clean ## Also remove node_modules (re-run `make install` afterwards)
	@rm -rf node_modules

doctor: ## Check the toolchain, env file, DATABASE_URL and published ports
	@printf '\n%b\n' "$(C_BOLD)Toolchain$(C_OFF)"
	@printf '  %-11s %s\n' node "$$(node --version 2>/dev/null || echo 'MISSING — install Node $(NODE_MIN)+')"
	@printf '  %-11s %s\n' pnpm "$$($(PNPM) --version 2>/dev/null || echo 'MISSING — run: make install')"
	@printf '  %-11s %s\n' deno "$$(deno --version 2>/dev/null | head -n1 || echo 'absent — functions-check falls back to tsc')"
	@printf '  %-11s %s\n' supabase "$$($(SUPABASE) --version 2>/dev/null | head -n1 || echo 'MISSING — install the Supabase CLI')"
	@printf '  %-11s %s\n' docker "$$($(DOCKER) version --format '{{.Server.Version}}' 2>/dev/null || echo 'absent — Docker targets unavailable')"
	@printf '\n%b\n' "$(C_BOLD)Environment$(C_OFF)"
	@if [ -f "$(ENV_FILE)" ]; then printf '  %-11s present\n' "$(ENV_FILE)"; else printf '  %-11s MISSING — run: make env\n' "$(ENV_FILE)"; fi
	@if [ -n "$${DATABASE_URL:-}" ]; then printf '  %-11s set — live-DB suites available\n' DATABASE_URL; else printf '  %-11s unset — needed by test-rls / test-runtime\n' DATABASE_URL; fi
	@printf '\n%b\n' "$(C_BOLD)Published ports (3000, 5432x)$(C_OFF)"
	@$(DOCKER) ps --format '  {{.Names}}  {{.Ports}}' 2>/dev/null | grep -E '3000|5432[0-9]' || printf '  none (local Supabase down? try: make supabase-status)\n'
	@printf '\n'