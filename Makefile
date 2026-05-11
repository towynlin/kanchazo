.PHONY: dev migrate test test-unit test-integration test-e2e lint build clean

dev:
	@cp -n .env.example .env 2>/dev/null || true
	@docker compose up -d postgres
	@echo "Waiting for Postgres..."
	@until docker compose exec postgres pg_isready -U kanchazo > /dev/null 2>&1; do sleep 1; done
	@echo "Running migrations..."
	@DATABASE_URL=postgres://kanchazo:kanchazo@localhost:5432/kanchazo npm run migrate
	@echo "Starting dev server..."
	@npm run dev

migrate:
	npm run migrate

test:
	npm run test

test-unit:
	npm run test:unit

test-integration:
	@docker compose up -d postgres
	@until docker compose exec postgres pg_isready -U kanchazo > /dev/null 2>&1; do sleep 1; done
	@DATABASE_URL=postgres://kanchazo:kanchazo@localhost:5432/kanchazo npm run test:integration

test-e2e:
	npm run test:e2e

lint:
	npm run lint

build:
	npm run build

clean:
	docker compose down -v
	rm -rf .next node_modules
