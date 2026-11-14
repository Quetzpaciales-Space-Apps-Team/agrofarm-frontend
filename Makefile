export PATH := $(PATH):/home/angc_/.nvm/versions/node/v24.17.0/bin

.PHONY: dev test lint typecheck build check

dev:
	npm run dev

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

build:
	npm run build

check: lint typecheck test
