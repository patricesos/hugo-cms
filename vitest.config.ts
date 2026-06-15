import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: { runes: true, dev: true },
		}),
	],
	resolve: {
		conditions: ['browser'],
		alias: {
			'$env/static/private': resolve('src/test-env-mock.ts'),
		},
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
	},
});
