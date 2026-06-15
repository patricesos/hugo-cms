import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: { runes: true, dev: true },
		}),
	],
	resolve: {
		conditions: ['browser'],
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
	},
});
