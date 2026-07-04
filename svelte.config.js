import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		csrf: { trustedOrigins: ['*'] },
		adapter: adapter()
	},
	compilerOptions: {
		runes: true
	}
};
