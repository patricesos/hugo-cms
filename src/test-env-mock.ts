export const env = new Proxy({} as Record<string, string>, {
	get(_, key: string) {
		return process.env[key] || '';
	},
});
