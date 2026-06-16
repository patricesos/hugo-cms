import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig({
	define: {
		global: 'globalThis',
	},
	plugins: [
		{
			name: 'load-env',
			configResolved(config) {
				const env = loadEnv(config.mode, config.envDir || process.cwd(), '');
				for (const key in env) {
					if (!process.env[key]) {
						process.env[key] = env[key];
					}
				}
			},
		},
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
