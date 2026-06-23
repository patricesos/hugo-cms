import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { getCmsConfig } from './config';
import { THEME_CATALOG } from './theme-catalog';
import { getAllShortcodes } from './shortcodes';

// ── Types ──────────────────────────────────────────────────────

export interface ThemeConflict {
	shortcodeName: string;
	description: string;
}

export interface InstallResult {
	success: boolean;
	message: string;
	conflicts?: ThemeConflict[];
}

// ── Chemins ──────────────────────────────────────────────────────

function themesDir(): string {
	return resolve(getCmsConfig().hugoSitePath, 'themes');
}

function backupsDir(): string {
	return resolve(getCmsConfig().hugoSitePath, '.cms', 'backups', 'theme');
}

function themePath(themeId: string): string {
	return resolve(themesDir(), themeId);
}

// ── Backups ──────────────────────────────────────────────────────

async function backupConfig(): Promise<string | null> {
	const sitePath = getCmsConfig().hugoSitePath;
	const rootConfigs = ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'hugo.json'];
	for (const name of rootConfigs) {
		const fp = join(sitePath, name);
		if (existsSync(fp)) {
			const bkDir = backupsDir();
			await mkdir(bkDir, { recursive: true });
			const bkPath = join(bkDir, name);
			await copyFile(fp, bkPath);
			return bkPath;
		}
	}
	return null;
}

async function restoreConfig(backupPath: string): Promise<void> {
	const sitePath = getCmsConfig().hugoSitePath;
	const name = backupPath.split(/[/\\]/).pop()!;
	await copyFile(backupPath, join(sitePath, name));
}

// ── Shortcode conflicts ─────────────────────────────────────────

export async function detectShortcodeConflicts(
	themeId: string,
): Promise<ThemeConflict[]> {
	const entry = THEME_CATALOG.find((t) => t.id === themeId);
	if (!entry || entry.providedShortcodes.length === 0) return [];

	const allShortcodes = await getAllShortcodes();
	const customShortcodes = allShortcodes.filter((s) => s.source === 'custom');
	const customNames = new Set(customShortcodes.map((s) => s.name));

	const conflicts: ThemeConflict[] = [];
	for (const scName of entry.providedShortcodes) {
		if (customNames.has(scName)) {
			const existing = customShortcodes.find((s) => s.name === scName);
			conflicts.push({
				shortcodeName: scName,
				description: existing?.description ?? `Shortcode « ${scName} » existe déjà`,
			});
		}
	}
	return conflicts;
}

// ── Thèmes installés ────────────────────────────────────────────

export async function getInstalledThemes(): Promise<string[]> {
	const dir = themesDir();
	if (!existsSync(dir)) return [];
	const entries = await readdir(dir, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => e.name);
}

// ── Progression du clonage ───────────────────────────────────────

const cloneProgress = new Map<string, number | null>();

/** Retourne le pourcentage de progression (0-100) ou `null` si inconnu/termine. */
export function getThemeInstallProgress(themeId: string): number | null {
	return cloneProgress.get(themeId) ?? null;
}

/** Réinitialise la progression pour un thème. */
export function clearThemeInstallProgress(themeId: string): void {
	cloneProgress.delete(themeId);
}

// ── Clone avec progression ───────────────────────────────────────

const PROGRESS_RE = /(\d+)%\s*\((\d+)\/(\d+)\)/;

function cloneWithProgress(repo: string, targetDir: string, themeId: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('git', ['clone', '--depth', '1', '--progress', repo, targetDir], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stderrBuf = '';

		proc.stderr!.on('data', (chunk: Buffer) => {
			stderrBuf += chunk.toString();
			// Extraire la dernière ligne de progression
			const lines = stderrBuf.split('\n');
			stderrBuf = lines.pop() ?? '';
			for (const line of lines) {
				const m = PROGRESS_RE.exec(line);
				if (m) {
					const total = parseInt(m[3], 10);
					const processed = parseInt(m[2], 10);
					if (total > 0) {
						cloneProgress.set(themeId, Math.round((processed / total) * 100));
					}
				}
			}
		});

		proc.on('error', (err) => reject(err));

		proc.on('close', (code) => {
			if (code === 0) {
				cloneProgress.set(themeId, 100);
				resolve();
			} else {
				reject(new Error(`git clone a échoué (code ${code})`));
			}
		});
	});
}

// ── Installation ─────────────────────────────────────────────────

export async function installTheme(themeId: string): Promise<InstallResult> {
	// 1. Valider l'ID dans le catalogue
	const entry = THEME_CATALOG.find((t) => t.id === themeId);
	if (!entry) {
		return { success: false, message: `Thème « ${themeId} » inconnu dans le catalogue.` };
	}

	// 2. Vérifier si déjà installé
	const installed = await getInstalledThemes();
	if (installed.includes(themeId)) {
		return { success: false, message: `Le thème « ${entry.name} » est déjà installé.` };
	}

	// 3. Détection de conflits shortcodes
	const conflicts = await detectShortcodeConflicts(themeId);
	if (conflicts.length > 0) {
		return {
			success: false,
			message: `Conflits de shortcodes détectés avec le thème « ${entry.name} ».`,
			conflicts,
		};
	}

	// 4. Backup de la config Hugo
	let backupPath: string | null = null;
	try {
		backupPath = await backupConfig();
	} catch {
		return { success: false, message: 'Impossible de sauvegarder la configuration Hugo.' };
	}

	// 5. Cloner le thème avec suivi de progression
	const targetDir = themePath(themeId);
	cloneProgress.set(themeId, 0);
	try {
		await mkdir(themesDir(), { recursive: true });
		await cloneWithProgress(entry.repo, targetDir, themeId);

		// Nettoyer .git pour ne pas polluer le dépôt du site
		const gitDir = join(targetDir, '.git');
		if (existsSync(gitDir)) {
			await rm(gitDir, { recursive: true, force: true });
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		cloneProgress.delete(themeId);
		if (existsSync(targetDir)) {
			await rm(targetDir, { recursive: true, force: true });
		}
		return { success: false, message: `Échec du clonage : ${msg}` };
	}

	// 6. Ajouter `theme = "<id>"` dans la config Hugo racine
	try {
		await setThemeInConfig(themeId);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		// Rollback : restaurer la config et nettoyer le thème
		if (backupPath) {
			try { await restoreConfig(backupPath); } catch { /* best-effort */ }
		}
		if (existsSync(targetDir)) {
			await rm(targetDir, { recursive: true, force: true });
		}
		cloneProgress.delete(themeId);
		return { success: false, message: `Échec de la modification de config : ${msg}` };
	}

	cloneProgress.set(themeId, 100);
	return {
		success: true,
		message: `Thème « ${entry.name} » installé avec succès.`,
	};
}

// ── Modification de la config Hugo ──────────────────────────────

/** Sélectionné pour l'exportation afin de pouvoir tester unitairement chaque format. */
export function setThemeInToml(content: string, themeId: string): string {
	const lines = content.split('\n');
	const themeLine = `theme = "${themeId}"`;
	const hasTheme = lines.some((l) => /^\s*theme\s*=/.test(l));
	if (hasTheme) {
		return lines.map((l) => /^\s*theme\s*=/.test(l) ? themeLine : l).join('\n');
	}
	const idx = lines.findIndex((l) => /^\s*$/.test(l) && !l.startsWith('#'));
	if (idx >= 0) {
		lines.splice(idx, 0, themeLine);
	} else {
		lines.unshift(themeLine);
	}
	return lines.join('\n');
}

/** Sélectionné pour l'exportation afin de pouvoir tester unitairement chaque format. */
export function setThemeInYaml(content: string, themeId: string): string {
	const lines = content.split('\n');
	const themeLine = `theme: "${themeId}"`;
	const hasTheme = lines.some((l) => /^\s*theme\s*:/.test(l));
	if (hasTheme) {
		return lines.map((l) => /^\s*theme\s*:/.test(l) ? themeLine : l).join('\n');
	}
	const idx = lines.findIndex((l, i) => i > 0 && /^\s*$/.test(l));
	if (idx >= 0) {
		lines.splice(idx, 0, themeLine);
	} else {
		lines.unshift(themeLine + '\n');
	}
	return lines.join('\n');
}

/** Sélectionné pour l'exportation afin de pouvoir tester unitairement chaque format. */
export function setThemeInJson(content: string, themeId: string): string {
	try {
		const cfg = JSON.parse(content);
		cfg.theme = themeId;
		return JSON.stringify(cfg, null, 2) + '\n';
	} catch {
		throw new Error('Fichier JSON de configuration invalide.');
	}
}

/**
 * Lit la valeur `theme` dans la config Hugo racine.
 * Retourne `null` si aucune config ou si la clé est absente.
 */
export async function getActiveTheme(): Promise<string | null> {
	const sitePath = getCmsConfig().hugoSitePath;
	const rootConfigs = ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'hugo.json'];

	for (const name of rootConfigs) {
		const fp = join(sitePath, name);
		if (existsSync(fp)) {
			const ext = name.split('.').pop()!.toLowerCase();
			const content = await readFile(fp, 'utf-8');
			return parseThemeFromConfig(content, ext);
		}
	}
	return null;
}

function parseThemeFromConfig(content: string, ext: string): string | null {
	if (ext === 'toml') {
		const m = content.match(/^\s*theme\s*=\s*"([^"]+)"/m);
		return m ? m[1] : null;
	}
	if (ext === 'yaml' || ext === 'yml') {
		const m = content.match(/^\s*theme\s*:\s*"([^"]+)"/m);
		return m ? m[1] : null;
	}
	if (ext === 'json') {
		try {
			const cfg = JSON.parse(content);
			return typeof cfg.theme === 'string' ? cfg.theme : null;
		} catch { return null; }
	}
	return null;
}

/**
 * Bascule le thème actif vers un thème installé.
 */
export async function switchActiveTheme(themeId: string): Promise<{ success: boolean; message: string }> {
	const installed = await getInstalledThemes();
	if (!installed.includes(themeId)) {
		return { success: false, message: `Le thème « ${themeId} » n'est pas installé.` };
	}
	try {
		await setThemeInConfig(themeId);
		return { success: true, message: `Thème activé : ${themeId}` };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { success: false, message: `Échec du changement de thème : ${msg}` };
	}
}

async function setThemeInConfig(themeId: string): Promise<void> {
	const sitePath = getCmsConfig().hugoSitePath;
	const rootConfigs = ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'hugo.json'];

	for (const name of rootConfigs) {
		const fp = join(sitePath, name);
		if (existsSync(fp)) {
			const ext = name.split('.').pop()!.toLowerCase();
			const content = await readFile(fp, 'utf-8');

			if (ext === 'toml') {
				await writeFile(fp, setThemeInToml(content, themeId), 'utf-8');
			} else if (ext === 'yaml' || ext === 'yml') {
				await writeFile(fp, setThemeInYaml(content, themeId), 'utf-8');
			} else if (ext === 'json') {
				await writeFile(fp, setThemeInJson(content, themeId), 'utf-8');
			}
			return;
		}
	}
	throw new Error('Aucun fichier de configuration Hugo trouvé à la racine du site.');
}
