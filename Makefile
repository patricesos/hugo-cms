.PHONY: all dev build preview start check test lint clean dist install run

all: install check build


run:
	npm run build && npm run preview

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

start:
	node build/index.js

check:
	npm run check

test:
	npm run test

test:watch
	npm run test:watch

lint:
	npx svelte-check --tsconfig ./tsconfig.json

dist:
	npm run dist

clean:
	rm -rf build/
	rm -rf .svelte-kit/
	rm -rf node_modules/.cache/
