export const handle = async ({ event, resolve }) => {
	try {
		const response = await resolve(event);
		const url = event.url.pathname;
		if (url.match(/\.(ttf|woff2?|svg|ico|png|jpg|webp)$/)) {
			response.headers.set('cache-control', 'public, max-age=31536000, immutable');
		}
		return response;
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Erreur inconnue';
		return new Response(
			`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Configuration</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1e1e2e;color:#cdd6f4}
.card{background:#313244;padding:2rem 2.5rem;border-radius:10px;max-width:520px}
h1{font-size:1.3rem;margin:0 0 .5rem}p{color:#a6adc8;margin:0 0 .8rem;line-height:1.5}
.err{color:#f38ba8;font-size:.85rem;background:#1e1e2e;padding:.6rem .8rem;border-radius:6px;word-break:break-all}</style>
</head><body><div class="card"><h1>⚠ Configuration requise</h1>
<p>Le chemin du site Hugo n'est pas valide.<br>Ouvrez les paramètres (⚙) et définissez un chemin valide, ou éditez le fichier <code>.env</code>.</p>
<p class="err">${msg.replace(/</g, '&lt;')}</p></div></body></html>`,
			{ status: 500, headers: { 'content-type': 'text/html;charset=utf-8' } }
		);
	}
};

export function handleError({ error }: { error: unknown }) {
	const msg = error instanceof Error ? error.message : String(error);
	console.error(msg);
}
