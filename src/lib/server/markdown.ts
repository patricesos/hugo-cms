import { parseFrontmatter as parseFm, serializeFrontmatter as serializeFm, detectFrontmatterLanguage } from '$lib/frontmatter';
import type { FrontmatterLanguage, ParsedMarkdown } from '$lib/frontmatter';

export type { FrontmatterLanguage, ParsedMarkdown };

export function parseFrontmatter(raw: string): ParsedMarkdown {
	return parseFm(raw);
}

export function serializeFrontmatter(
	body: string,
	frontmatter: Record<string, unknown>,
	language: FrontmatterLanguage = 'yaml'
): string {
	return serializeFm(body, frontmatter, language);
}

export { detectFrontmatterLanguage };