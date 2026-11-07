BINARY := bin/go-mvc

.PHONY: install dev dev-go dev-vite build build-go build-frontend migrate fresh seed test lint clean

install: ## Install Go + npm dependencies
	go mod download
	npm install

dev: ## Run Go (air live reload) and Vite (HMR) together
	$(MAKE) -j2 dev-go dev-vite

dev-go:
	@if command -v air >/dev/null; then air -c .air.toml; \
	else go run github.com/air-verse/air@latest -c .air.toml; fi

dev-vite:
	npm run dev

build: build-frontend build-go ## Production build: dist/ + bin/go-mvc

build-frontend:
	npm run build

build-go:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY) .

migrate: ## Run pending migrations
	./forge migrate

fresh: ## Drop all tables, migrate and seed
	./forge migrate:fresh --seed

seed:
	./forge db:seed

test: ## Go tests + frontend lint
	go vet ./...
	go test ./...
	npm run lint:check

lint:
	gofmt -l -w .
	npm run lint
	npm run format

clean:
	rm -rf bin dist tmp
