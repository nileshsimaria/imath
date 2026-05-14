.PHONY: help dev build preview check check-math check-render install clean

help: ## Show this help
	@echo "imath — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Run dev server (live reload, http://localhost:5173/imath/)
	npm run dev

build: ## Build static site to dist/
	npm run build

preview: build ## Serve the built site (http://localhost:4173/imath/)
	npm run preview

check: ## Run ALL checks before shipping (math + build + headless render, ~25s)
	npm run check

check-math: ## Static audit of every quiz/lesson JSON (~1s)
	npm run check:math

check-render: build ## Headless render audit of every page + quiz (~22s)
	npm run check:render

check-widgets: build ## Interactive smoke test of widgets (clicks controls, verifies updates) (~15s)
	npm run check:widgets

install: ## Install npm deps + chromium browser for playwright
	npm install
	npx playwright install chromium

clean: ## Remove dist/
	rm -rf dist
