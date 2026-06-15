import matter from 'gray-matter';

export interface ParsedMarkdown {
	frontmatter: Record<string, unknown>;
	body: string;
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
	const { data, content } = matter(raw);
	return { frontmatter: data as Record<string, unknown>, body: content };
}

export function serializeFrontmatter(
	body: string,
	frontmatter: Record<string, unknown>
): string {
	return matter.stringify(body, frontmatter);
}
