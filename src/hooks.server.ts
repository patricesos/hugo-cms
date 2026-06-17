export const handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const url = event.url.pathname;
	if (url.match(/\.(ttf|woff2?|svg|ico|png|jpg|webp)$/)) {
		response.headers.set('cache-control', 'public, max-age=31536000, immutable');
	}
	return response;
};
