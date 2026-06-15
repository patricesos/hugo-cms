.PHONY: dev build preview check test test-watch clean

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

check:
	npm run check

test:
	npm run test

test-watch:
	npm run test:watch

clean:
	rm -rf .svelte-kit build node_modules
