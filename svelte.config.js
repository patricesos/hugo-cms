import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		// Application locale — pas de requêtes cross-origin légitimes.
		// Le '*' désactivait la protection CSRF, exposant l'API aux sites
		// malveillants ouverts en parallèle. La valeur par défaut (liste vide)
		// n'autorise que les requêtes same-origin.
		csrf: { trustedOrigins: [] },
		adapter: adapter()
	},
	compilerOptions: {
		runes: true
	}
};
