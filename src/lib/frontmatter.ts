import yaml from 'js-yaml';
import { parse, stringify } from '@iarna/toml';

export type FrontmatterLanguage = 'yaml' | 'toml';

export interface ParsedMarkdown {
	frontmatter: Record<string, unknown>;
	body: string;
	language: FrontmatterLanguage;
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeDates(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (Array.isArray(value)) return value.map(normalizeDates);
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(obj)) result[key] = normalizeDates(obj[key]);
		return result;
	}
	return value;
}

export function countYamlComments(yamlBlock: string): number {
	return (yamlBlock.match(/^\s*#/gm) || []).length;
}

// =============================================================================
// Parsing
// =============================================================================

export function detectFrontmatterLanguage(raw: string): FrontmatterLanguage {
	const trimmed = raw.trimStart();
	if (trimmed.startsWith('+++')) return 'toml';
	return 'yaml';
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
	const lang = detectFrontmatterLanguage(raw);
	if (lang === 'toml') return parseTomlFrontmatter(raw);
	return parseYamlFrontmatter(raw);
}

function parseTomlFrontmatter(raw: string): ParsedMarkdown {
	const trimmed = raw.trimStart();
	const endIdx = trimmed.indexOf('+++', 3);
	if (endIdx === -1) return { frontmatter: {}, body: raw, language: 'toml' };
	const block = trimmed.slice(3, endIdx).trim();
	const body = trimmed.slice(endIdx + 3).trimStart();
	if (!block) return { frontmatter: {}, body, language: 'toml' };
	try {
		const parsed = parse(block) as Record<string, unknown>;
		if (parsed && typeof parsed === 'object') return { frontmatter: parsed, body, language: 'toml' };
	} catch { /* ignore */ }
	return { frontmatter: {}, body: raw, language: 'toml' };
}

function parseYamlFrontmatter(raw: string): ParsedMarkdown {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith('---')) return { frontmatter: {}, body: raw, language: 'yaml' };
	const endIdx = trimmed.indexOf('---', 3);
	if (endIdx === -1) return { frontmatter: {}, body: raw, language: 'yaml' };
	const yamlBlock = trimmed.slice(3, endIdx).trim();
	const body = trimmed.slice(endIdx + 3).trimStart();
	if (!yamlBlock) return { frontmatter: {}, body, language: 'yaml' };
	const commentCount = countYamlComments(yamlBlock);
	if (commentCount > 0) {
		console.warn(
			`[frontmatter] ${commentCount} ligne(s) de commentaire YAML détectée(s). ` +
			'Ils seront perdus à la réécriture (M-002).',
		);
	}
	try {
		const parsed = yaml.load(yamlBlock);
		if (parsed && typeof parsed === 'object') return { frontmatter: parsed as Record<string, unknown>, body, language: 'yaml' };
	} catch { /* ignore */ }
	return { frontmatter: {}, body: raw, language: 'yaml' };
}

// =============================================================================
// splitRawContent — same semantics as before (null vs {})
// =============================================================================

export function splitRawContent(text: string): { frontmatter: Record<string, unknown> | null; body: string; format: 'yaml' | 'toml' } {
	const { frontmatter, body, language } = parseFrontmatter(text);
	const hasFm = Object.keys(frontmatter).length > 0;
	return { frontmatter: hasFm ? frontmatter : null, body, format: language };
}

export function getRawBody(text: string): string {
	return splitRawContent(text).body;
}

// =============================================================================
// Serialization
// =============================================================================

export function serializeFm(fm: Record<string, unknown>, format: FrontmatterLanguage): string {
	const normalized = normalizeDates(fm) as Record<string, unknown>;
	if (format === 'toml') {
		return `+++\n${stringify(normalized as unknown as import('@iarna/toml').JsonMap)}+++`;
	}
	return `---\n${yaml.dump(normalized, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).trim()}\n---`;
}

export function composeRaw(fm: Record<string, unknown>, format: FrontmatterLanguage, body: string): string {
	const fmString = Object.keys(fm).length > 0 ? serializeFm(fm, format) : '';
	return fmString ? `${fmString}\n\n${body}` : body;
}

export function serializeFrontmatter(body: string, frontmatter: Record<string, unknown>, language: FrontmatterLanguage = 'yaml'): string {
	return composeRaw(frontmatter, language, body);
}
