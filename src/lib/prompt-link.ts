export function promptLink(): string | null {
	if (typeof window === 'undefined' || !window.prompt) return null;
	const raw = window.prompt('URL du lien (http://, https://, /, ou mailto:)');
	if (!raw) return null;
	const url = raw.trim();
	if (!url) return null;
	if (/^(https?:\/\/|\/|mailto:|#)/.test(url)) return url;
	return `https://${url}`;
}
