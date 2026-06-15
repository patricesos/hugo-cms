import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter } from './markdown';

describe('parseFrontmatter', () => {
	it('extracts frontmatter and body from a markdown string', () => {
		const raw = `---
title: "Hello"
date: 2026-01-01
draft: false
tags:
  - test
categories:
  - demo
---

This is the body.
`;
		const { frontmatter, body } = parseFrontmatter(raw);
		expect(frontmatter.title).toBe('Hello');
		expect(new Date(frontmatter.date as string).toISOString().split('T')[0]).toBe('2026-01-01');
		expect(frontmatter.draft).toBe(false);
		expect(frontmatter.tags).toEqual(['test']);
		expect(frontmatter.categories).toEqual(['demo']);
		expect(body.trim()).toBe('This is the body.');
	});

	it('returns empty frontmatter and full body when no frontmatter', () => {
		const raw = 'Just content.';
		const { frontmatter, body } = parseFrontmatter(raw);
		expect(frontmatter).toEqual({});
		expect(body.trim()).toBe('Just content.');
	});

	it('handles empty content', () => {
		const { frontmatter, body } = parseFrontmatter('');
		expect(frontmatter).toEqual({});
		expect(body).toBe('');
	});

	it('handles frontmatter with no body', () => {
		const raw = `---
title: "Empty"
---
`;
		const { frontmatter, body } = parseFrontmatter(raw);
		expect(frontmatter.title).toBe('Empty');
		expect(body.trim()).toBe('');
	});
});

describe('serializeFrontmatter', () => {
	it('produces valid markdown with frontmatter', () => {
		const result = serializeFrontmatter('Body text', {
			title: 'Test',
			date: '2026-06-15',
		});
		expect(result).toContain('---');
		expect(result).toContain('title: Test');
		expect(result).toContain('Body text');
	});

	it('preserves body after serialization', () => {
		const fm = { title: 'Round' };
		const body = '# Heading\n\nParagraph.';
		const serialized = serializeFrontmatter(body, fm);
		const parsed = parseFrontmatter(serialized);
		expect(parsed.frontmatter.title).toBe('Round');
		expect(parsed.body.trim()).toBe(body);
	});
});

describe('round-trip: parse → serialize → parse', () => {
	const cases = [
		{
			name: 'simple post',
			input: `---
title: "Post 1"
date: 2026-01-15
---

Content here.`,
		},
		{
			name: 'with tags and categories',
			input: `---
title: "Tagged"
tags:
  - a
  - b
categories:
  - cat1
draft: true
---

Body.`,
		},
		{
			name: 'no frontmatter',
			input: 'Just some plain text content.',
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			const { frontmatter, body } = parseFrontmatter(c.input);
			const serialized = serializeFrontmatter(body, frontmatter);
			const { frontmatter: fm2, body: b2 } = parseFrontmatter(serialized);
			expect(fm2).toEqual(frontmatter);
			expect(b2.trim()).toBe(body.trim());
		});
	}
});
