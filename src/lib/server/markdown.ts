import matter from 'gray-matter';
import { parse, stringify } from '@iarna/toml';

export type FrontmatterLanguage = 'yaml' | 'toml';

export interface ParsedMarkdown {
	frontmatter: Record<string, unknown>;
	body: string;
	language: FrontmatterLanguage;
}

const YAML_DELIM = '---';
const TOML_DELIM = '+++';

export function detectFrontmatterLanguage(raw: string): FrontmatterLanguage {
	const trimmed = raw.trimStart();
	if (trimmed.startsWith(TOML_DELIM)) return 'toml';
	return 'yaml';
}

function parseTomlFrontmatter(raw: string): ParsedMarkdown {
	const trimmed = raw.trimStart();
	const endIdx = trimmed.indexOf(TOML_DELIM, 3);
	if (endIdx === -1) {
		return { frontmatter: {}, body: raw, language: 'toml' };
	}
	const tomlBlock = trimmed.slice(3, endIdx).trim();
	const body = trimmed.slice(endIdx + 3).trimStart();
	if (!tomlBlock) {
		return { frontmatter: {}, body, language: 'toml' };
	}
	try {
		const parsed = parse(tomlBlock) as Record<string, unknown>;
		return { frontmatter: parsed, body, language: 'toml' };
	} catch {
		return { frontmatter: {}, body: raw, language: 'toml' };
	}
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
	const lang = detectFrontmatterLanguage(raw);
	if (lang === 'toml') {
		return parseTomlFrontmatter(raw);
	}
	const { data, content } = matter(raw);
	return { frontmatter: data as Record<string, unknown>, body: content, language: 'yaml' };
}

function tomlSerialize(body: string, frontmatter: Record<string, unknown>): string {
	const tomlStr = stringify(frontmatter as Record<string, unknown>);
	return `+++\n${tomlStr}+++\n\n${body}`;
}

export function serializeFrontmatter(
	body: string,
	frontmatter: Record<string, unknown>,
	language: FrontmatterLanguage = 'yaml'
): string {
	if (language === 'toml') {
		return tomlSerialize(body, frontmatter);
	}
	return matter.stringify(body, frontmatter);
}