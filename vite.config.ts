import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

// Chargé au top-level pour que server.host soit défini avant le démarrage de Vite
const env = loadEnv(process.env['MODE'] || '', process.cwd(), '');

export default defineConfig({
	define: {
		global: 'globalThis',
	},
	server: {
		host: env['CMS_BIND_ADDRESS'] === '0.0.0.0' ? true : undefined,
	},
	plugins: [
		{
			name: 'load-env',
			configResolved(config) {
				const loaded = loadEnv(config.mode, config.envDir || process.cwd(), '');
				for (const key in loaded) {
					if (!process.env[key]) {
						process.env[key] = loaded[key];
					}
				}
			},
		},
		sveltekit()
	]
});
