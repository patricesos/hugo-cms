import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveHugoBinary } from '$lib/server/hugo';

const execFileAsync = promisify(execFile);

/**
 * Version de l'application, synchronisee manuellement avec package.json.
 * Centralisee ici pour eviter les import JSON fragiles dans le bundle.
 */
export const APP_VERSION = '1.6.2';

/**
 * Retourne la version de Node.js (process.version, invariant).
 */
export function getNodeVersion(): string {
	return process.version;
}

// Cache module-level : les versions Hugo ne changent pas pendant la vie du process.
let _hugoVersionFull: string | null = null;
let _hugoVersionShort: string | null = null;

const HUGO_SEMVER_RE = /v\d+\.\d+\.\d+/;

/**
 * Extrait le semver court (ex: "v0.145.0") du raw `hugo version`.
 */
function extractHugoShortVersion(raw: string): string {
	const match = raw.match(HUGO_SEMVER_RE);
	return match ? match[0] : raw.split(' ')[0] || raw;
}

/**
 * Retourne la version complete de Hugo (raw `hugo version`).
 * Mise en cache apres le premier appel.
 */
export async function getHugoVersionFull(): Promise<string> {
	if (_hugoVersionFull) return _hugoVersionFull;

	try {
		const hugoBin = resolveHugoBinary();
		const { stdout } = await execFileAsync(hugoBin, ['version'], { timeout: 10000 });
		_hugoVersionFull = stdout.trim();
		_hugoVersionShort = extractHugoShortVersion(_hugoVersionFull);
	} catch {
		_hugoVersionFull = 'non disponible';
		_hugoVersionShort = 'non disponible';
	}

	return _hugoVersionFull;
}

/**
 * Retourne la version courte de Hugo (ex: "v0.145.0").
 * Court-circuite le cache de la version complete si deja resolue.
 */
export async function getHugoVersion(): Promise<string> {
	if (_hugoVersionShort) return _hugoVersionShort;
	// S'assure que le cache soit peuple
	await getHugoVersionFull();
	return _hugoVersionShort!;
}
