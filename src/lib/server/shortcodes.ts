import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCmsConfig } from './config';

export interface ShortcodeParam {
	name: string;
	type: 'positional' | 'named';
	required: boolean;
	defaultValue?: string;
	description: string;
}

export interface ShortcodeDef {
	name: string;
	source: 'native' | 'custom' | 'theme';
	description: string;
	params: ShortcodeParam[];
	body: boolean;
	example: string;
}

const NATIVE_SHORTCODES: ShortcodeDef[] = [
	{
		name: 'figure',
		source: 'native',
		description: 'Inserts an image with optional caption, link, and attribution',
		params: [
			{ name: 'src', type: 'named', required: true, description: 'Image path or URL' },
			{ name: 'alt', type: 'named', required: false, description: 'Alt text' },
			{ name: 'caption', type: 'named', required: false, description: 'Image caption' },
			{ name: 'title', type: 'named', required: false, description: 'Title attribute' },
			{ name: 'link', type: 'named', required: false, description: 'Link URL' },
			{ name: 'class', type: 'named', required: false, description: 'CSS class' },
			{ name: 'width', type: 'named', required: false, description: 'Image width' },
			{ name: 'height', type: 'named', required: false, description: 'Image height' },
			{ name: 'attr', type: 'named', required: false, description: 'Attribution text' },
			{ name: 'attrlink', type: 'named', required: false, description: 'Attribution link' },
		],
		body: false,
		example: '{{< figure src="image.jpg" caption="Une légende" >}}',
	},
	{
		name: 'highlight',
		source: 'native',
		description: 'Syntax-highlighted code block',
		params: [
			{ name: 'lang', type: 'positional', required: true, description: 'Language (python, go, …)' },
			{ name: 'options', type: 'named', required: false, description: 'Highlight options (linenos, hl_lines, …)' },
		],
		body: true,
		example: '{{< highlight python "linenos=table" >}}\nprint("hello")\n{{< /highlight >}}',
	},
	{
		name: 'gist',
		source: 'native',
		description: 'Embeds a GitHub Gist',
		params: [
			{ name: 'username', type: 'positional', required: true, description: 'GitHub username' },
			{ name: 'gistID', type: 'positional', required: true, description: 'Gist ID' },
			{ name: 'filename', type: 'positional', required: false, description: 'Specific file in the gist' },
		],
		body: false,
		example: '{{< gist username abc123 >}}',
	},
	{
		name: 'ref',
		source: 'native',
		description: 'Returns the relative permalink of a page',
		params: [
			{ name: 'path', type: 'positional', required: true, description: 'Page path (e.g. /blog/post)' },
		],
		body: false,
		example: '{{< ref "/blog/post" >}}',
	},
	{
		name: 'relref',
		source: 'native',
		description: 'Returns the relative permalink of a page (relative)',
		params: [
			{ name: 'path', type: 'positional', required: true, description: 'Page path' },
		],
		body: false,
		example: '{{< relref "/blog/post" >}}',
	},
	{
		name: 'param',
		source: 'native',
		description: 'Gets a page/site parameter value',
		params: [
			{ name: 'key', type: 'positional', required: true, description: 'Parameter key (e.g. "summary")' },
		],
		body: false,
		example: '{{< param summary >}}',
	},
];

async function scanCustomShortcodes(): Promise<ShortcodeDef[]> {
	const shortcodesDir = join(getCmsConfig().hugoSitePath, getCmsConfig().shortcodesDir);

	let files: string[];
	try {
		files = (await readdir(shortcodesDir)).filter((f) => f.endsWith('.html'));
	} catch {
		return [];
	}

	const fileContents = await Promise.all(
		files.map(async (f) => ({
			name: f.replace(/\.html$/, ''),
			content: await readFile(join(shortcodesDir, f), 'utf-8'),
		}))
	);

	return fileContents.map(({ name, content }) => {

		// Extract .Get calls for named params and positional params
		const namedParamRe = /\$?\.Get\s*\(\s*"([^"]+)"\s*\)/g;
		const namedParams = new Set<string>();
		let match: RegExpExecArray | null;
		while ((match = namedParamRe.exec(content)) !== null) {
			namedParams.add(match[1]);
		}

		const positionalParamRe = /\$?\.Get\s*\(\s*(\d+)\s*\)/g;
		let maxPos = -1;
		while ((match = positionalParamRe.exec(content)) !== null) {
			maxPos = Math.max(maxPos, parseInt(match[1], 10));
		}

		const hasBody = /\{\{\s*\.Inner\s*\}\}/.test(content);

		// Try to extract a description from HTML comments at the top
		const descMatch = content.match(/<!--\s*([\s\S]*?)-->/);
		const description = descMatch
			? descMatch[1].trim().split('\n')[0].trim()
			: `Shortcode « ${name} »`;

		const params: ShortcodeParam[] = [];

		// Add positional params first
		for (let i = 0; i <= maxPos; i++) {
			const named = namedParams.has(String(i));
			params.push({
				name: String(i),
				type: 'positional',
				required: i === 0,
				description: `Positional argument ${i}`,
			});
		}

		// Add named params
		for (const p of namedParams) {
			if (/^\d+$/.test(p)) continue; // already added as positional
			// Detect default values like: .Get "param" | default "val"
			const defaultRe = new RegExp(`\\$\\.Get\\s*\\(\\s*"${p}"\\s*\\).*?\\|\\s*default\\s+"([^"]+)"`, 's');
			const defaultMatch = defaultRe.exec(content);
			params.push({
				name: p,
				type: 'named',
				required: !defaultMatch,
				defaultValue: defaultMatch?.[1],
				description: p,
			});
		}

		// Build example
		const posParts: string[] = [];
		const namedParts: string[] = [];
		for (const p of params) {
			if (p.type === 'positional') {
				posParts.push(p.defaultValue || p.name);
			} else {
				namedParts.push(`${p.name}="${p.defaultValue || p.name}"`);
			}
		}
		const allParts = [...posParts, ...namedParts];
		const example = hasBody
			? `{{< ${name} ${allParts.join(' ')} >}}\n...\n{{< /${name} >}}`
			: `{{< ${name} ${allParts.join(' ')} >}}`;

		return {
			name,
			source: 'custom' as const,
			description,
			params,
			body: hasBody,
			example,
		};
	});
}

export async function getAllShortcodes(): Promise<ShortcodeDef[]> {
	const custom = await scanCustomShortcodes();
	const customNames = new Set(custom.map((s) => s.name));
	// Native shortcodes that are NOT overridden by custom ones
	const native = NATIVE_SHORTCODES.filter((s) => !customNames.has(s.name));
	return [...custom, ...native];
}

export async function getShortcode(name: string): Promise<ShortcodeDef | undefined> {
	const all = await getAllShortcodes();
	return all.find((s) => s.name === name);
}
