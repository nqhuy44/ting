# Makefile for Ting Project

# Simple entry points for DevOps tasks.

.PHONY: setup dev build start test clean logs release

# 1. Environment Setup
setup:
	@echo "Setting up project..."
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh

# 2. Local Development
dev:
	@echo "Starting development server..."
	@npm run dev

# 3. Production Build
build:
	@echo "Building production package..."
	@npm run build

# 4. Production Start
start:
	@echo "Starting production server..."
	@npm start

# 5. Clean Data
clean:
	@echo "Cleaning up local data and build artifacts..."
	@rm -rf .next
	@rm -rf data/*.db

# 6. Docker (if applicable)
docker-build:
	@docker-compose build

docker-up:
	@docker-compose up -d

docker-logs:
	@docker-compose logs -f

# 7. Release (Version bump, Build, Push)
IMAGE_NAME=nqh44/ting

release:
ifndef VERSION
	$(error VERSION is not defined. Usage: make release VERSION=x.x.x)
endif
	@echo "Current version: $$(node -p "require('./package.json').version")"
	@echo "Setting version to $(VERSION)..."
	@npm version $(VERSION) --no-git-tag-version --allow-same-version
	@echo "Building Docker image for version $(VERSION)..."
	@docker build -t $(IMAGE_NAME):latest -t $(IMAGE_NAME):v$(VERSION) .
	@echo "Pushing Docker images..."
	@docker push $(IMAGE_NAME):latest
	@docker push $(IMAGE_NAME):v$(VERSION)
	@echo "Release $(VERSION) finished successfully!"
