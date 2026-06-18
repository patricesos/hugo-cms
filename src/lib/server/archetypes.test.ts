import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';

const ARCH_BASE = join('/site', 'archetypes');

function norm(p: string): string {
	return p.replace(/\\/g, '/');
}

const { mockArchetypes } = vi.hoisted(() => {
	const files = new Map<string, string>();
	const dirs = new Set<string>();

	function storeFile(path: string, content: string) {
		const n = norm(path);
		files.set(n, content);
		// Ajouter les dossiers parents, pas le fichier lui-même
		const parts = n.split('/');
		for (let i = 1; i < parts.length; i++) {
			dirs.add(parts.slice(0, i).join('/'));
		}
	}

	return {
		mockArchetypes: {
			files,
			dirs,
			storeFile,
			_reset() {
				files.clear();
				dirs.clear();
			},
		},
	};
});

vi.mock('node:fs', () => ({
	default: {
		existsSync: (p: string) => {
			const n = norm(p);
			return mockArchetypes.dirs.has(n) || mockArchetypes.files.has(n);
		},
	},
	existsSync: (p: string) => {
		const n = norm(p);
		return mockArchetypes.dirs.has(n) || mockArchetypes.files.has(n);
	},
}));

vi.mock('node:fs/promises', () => ({
	default: {
		readFile: async (p: string) => {
			const n = norm(p);
			const content = mockArchetypes.files.get(n);
			if (content === undefined) throw new Error('ENOENT');
			return content;
		},
		readdir: async (p: string, _opts?: object) => {
			const n = norm(p) + '/';
			const children = [...mockArchetypes.files.keys(), ...mockArchetypes.dirs.keys()]
				.filter(k => k.startsWith(n))
				.map(k => k.slice(n.length).split('/')[0])
				.filter((v, i, a) => a.indexOf(v) === i)
				.map(name => ({
					name,
					isDirectory: () => mockArchetypes.dirs.has(n + name),
					isFile: () => mockArchetypes.files.has(n + name),
				}));
			return children;
		},
		writeFile: async (p: string, content: string) => {
			mockArchetypes.files.set(norm(p), content);
		},
		mkdir: async (p: string, _opts?: object) => {
			mockArchetypes.dirs.add(norm(p));
		},
		unlink: async (p: string) => {
			mockArchetypes.files.delete(norm(p));
		},
	},
	readFile: async (p: string) => {
		const n = norm(p);
		const content = mockArchetypes.files.get(n);
		if (content === undefined) throw new Error('ENOENT');
		return content;
	},
	readdir: async (p: string, _opts?: object) => {
		const n = norm(p) + '/';
		const children = [...mockArchetypes.files.keys(), ...mockArchetypes.dirs.keys()]
			.filter(k => k.startsWith(n))
			.map(k => k.slice(n.length).split('/')[0])
			.filter((v, i, a) => a.indexOf(v) === i)
			.map(name => ({
				name,
				isDirectory: () => mockArchetypes.dirs.has(n + name),
				isFile: () => mockArchetypes.files.has(n + name),
			}));
		return children;
	},
	writeFile: async (p: string, content: string) => {
		mockArchetypes.files.set(norm(p), content);
	},
	mkdir: async (p: string, _opts?: object) => {
		mockArchetypes.dirs.add(norm(p));
	},
	unlink: async (p: string) => {
		mockArchetypes.files.delete(norm(p));
	},
}));

vi.mock('./config', () => ({
	getCmsConfig: () => ({
		hugoSitePath: '/site',
		archetypesDir: 'archetypes',
	}),
}));

function ap(slug: string): string {
	return norm(join(ARCH_BASE, slug + '.md'));
}

beforeEach(() => {
	mockArchetypes._reset();
	mockArchetypes.dirs.add(norm(ARCH_BASE));
});

describe('getArchetypesDir', () => {
	it('retourne le chemin du dossier archetypes', async () => {
		const { getArchetypesDir } = await import('./archetypes');
		expect(getArchetypesDir()).toBe(ARCH_BASE);
	});
});

describe('archetypeSlugToPath', () => {
	it('ajoute .md au slug', async () => {
		const { archetypeSlugToPath } = await import('./archetypes');
		expect(norm(archetypeSlugToPath('default'))).toBe(ap('default'));
	});

	it('gère les slugs avec sous-dossiers', async () => {
		const { archetypeSlugToPath } = await import('./archetypes');
		expect(norm(archetypeSlugToPath('blog/post'))).toBe(norm(join(ARCH_BASE, 'blog', 'post.md')));
	});
});

describe('listArchetypes', () => {
	it('retourne un tableau vide si le dossier nexiste pas', async () => {
		mockArchetypes.dirs.clear();
		const { listArchetypes } = await import('./archetypes');
		const result = await listArchetypes();
		expect(result).toEqual([]);
	});

	it('liste les fichiers .md du dossier', async () => {
		mockArchetypes.storeFile(ap('post'), '---\ntitle: Post\n---');
		mockArchetypes.storeFile(ap('page'), '---\ntitle: Page\n---');
		const { listArchetypes } = await import('./archetypes');
		const result = await listArchetypes();
		expect(result).toHaveLength(2);
		expect(result.find(a => a.name === 'post')?.source).toContain('title: Post');
	});

	it('place "default" en premier', async () => {
		mockArchetypes.storeFile(ap('post'), '');
		mockArchetypes.storeFile(ap('default'), '');
		const { listArchetypes } = await import('./archetypes');
		const result = await listArchetypes();
		expect(result[0].name).toBe('default');
		expect(result[1].name).toBe('post');
	});

	it('ignore les fichiers cachés', async () => {
		mockArchetypes.storeFile(ap('.hidden'), '');
		mockArchetypes.storeFile(ap('visible'), '');
		const { listArchetypes } = await import('./archetypes');
		const result = await listArchetypes();
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('visible');
	});

	it('génère un label lisible depuis le nom', async () => {
		mockArchetypes.storeFile(ap('blog-post'), '');
		const { listArchetypes } = await import('./archetypes');
		const result = await listArchetypes();
		expect(result[0].label).toBe('Blog Post');
	});
});

describe('listArchetypeTree', () => {
	it('retourne un tableau vide si le dossier nexiste pas', async () => {
		mockArchetypes.dirs.clear();
		const { listArchetypeTree } = await import('./archetypes');
		const result = await listArchetypeTree();
		expect(result).toEqual([]);
	});

	it('retourne les fichiers directs', async () => {
		mockArchetypes.storeFile(ap('post'), '');
		const { listArchetypeTree } = await import('./archetypes');
		const result = await listArchetypeTree();
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('file');
		expect(result[0].name).toBe('post.md');
	});

	it('place les dossiers avant les fichiers', async () => {
		mockArchetypes.dirs.add(join(ARCH_BASE, 'blog'));
		mockArchetypes.storeFile(ap('post'), '');
		mockArchetypes.storeFile(join(ARCH_BASE, 'blog', 'article.md'), '');
		const { listArchetypeTree } = await import('./archetypes');
		const result = await listArchetypeTree();
		expect(result[0].type).toBe('directory');
		expect(result[1].type).toBe('file');
	});
});

describe('readArchetype', () => {
	it('lit un fichier existant', async () => {
		mockArchetypes.storeFile(ap('post'), '---\ntitle: Post\n---\nContent');
		const { readArchetype } = await import('./archetypes');
		const result = await readArchetype('post');
		expect(result.name).toBe('post');
		expect(result.source).toBe('---\ntitle: Post\n---\nContent');
	});

	it('génère le label depuis le slug', async () => {
		mockArchetypes.storeFile(ap('my-post'), '');
		const { readArchetype } = await import('./archetypes');
		const result = await readArchetype('my-post');
		expect(result.label).toBe('My Post');
	});

	it('jette une erreur si le fichier nexiste pas', async () => {
		const { readArchetype } = await import('./archetypes');
		await expect(readArchetype('nonexistent')).rejects.toThrow('not found');
	});
});

describe('createArchetype', () => {
	it('crée un fichier et retourne larchétype', async () => {
		const { createArchetype } = await import('./archetypes');
		const result = await createArchetype('new', '---\ntitle: New\n---');
		expect(result.name).toBe('new');
		expect(mockArchetypes.files.has(ap('new'))).toBe(true);
	});

	it('crée le dossier parent si nécessaire', async () => {
		mockArchetypes.dirs.delete(ARCH_BASE);
		const { createArchetype } = await import('./archetypes');
		await createArchetype('blog/post', '---\n---');
		expect(mockArchetypes.dirs.has(norm(join(ARCH_BASE, 'blog')))).toBe(true);
	});

	it('jette une erreur si larchétype existe déjà', async () => {
		mockArchetypes.storeFile(ap('post'), '');
		const { createArchetype } = await import('./archetypes');
		await expect(createArchetype('post', '')).rejects.toThrow('already exists');
	});
});

describe('updateArchetype', () => {
	it('met à jour le contenu', async () => {
		mockArchetypes.storeFile(ap('post'), '---\ntitle: Old\n---');
		const { updateArchetype } = await import('./archetypes');
		await updateArchetype('post', '---\ntitle: New\n---');
		expect(mockArchetypes.files.get(ap('post'))).toBe('---\ntitle: New\n---');
	});

	it('jette une erreur si le fichier nexiste pas', async () => {
		const { updateArchetype } = await import('./archetypes');
		await expect(updateArchetype('nonexistent', '')).rejects.toThrow('not found');
	});
});

describe('deleteArchetype', () => {
	it('supprime le fichier', async () => {
		mockArchetypes.storeFile(ap('post'), '');
		const { deleteArchetype } = await import('./archetypes');
		await deleteArchetype('post');
		expect(mockArchetypes.files.has(ap('post'))).toBe(false);
	});

	it('jette une erreur si le fichier nexiste pas', async () => {
		const { deleteArchetype } = await import('./archetypes');
		await expect(deleteArchetype('nonexistent')).rejects.toThrow('not found');
	});
});

describe('renderArchetype', () => {
	it('remplace .Date par la date du jour', async () => {
		const { renderArchetype } = await import('./archetypes');
		const today = new Date().toISOString().split('T')[0];
		const result = renderArchetype('date: {{ .Date }}', 'Title', 'slug');
		expect(result).toBe(`date: ${today}`);
	});

	it('remplace .Title', async () => {
		const { renderArchetype } = await import('./archetypes');
		const result = renderArchetype('title: {{ .Title }}', 'Mon Article', 'slug');
		expect(result).toBe('title: Mon Article');
	});

	it('remplace .File.ContentBaseName et .Slug', async () => {
		const { renderArchetype } = await import('./archetypes');
		const result = renderArchetype('base: {{ .File.ContentBaseName }}\nslug: {{ .Slug }}', 'Title', 'mon-article');
		expect(result).toBe('base: mon-article\nslug: mon-article');
	});

	it('remplace .Name', async () => {
		const { renderArchetype } = await import('./archetypes');
		const result = renderArchetype('name: {{ .Name }}', 'Title', 'blog/post');
		expect(result).toBe('name: blog/post');
	});

	it('remplace now.Year', async () => {
		const { renderArchetype } = await import('./archetypes');
		const year = String(new Date().getFullYear());
		const result = renderArchetype('year: {{ now.Year }}', 'Title', 'slug');
		expect(result).toBe(`year: ${year}`);
	});

	it('remplace le pattern replace .File.ContentBaseName avec title', async () => {
		const { renderArchetype } = await import('./archetypes');
		const template = 'title: {{ replace .File.ContentBaseName "-" " " | title }}';
		const result = renderArchetype(template, 'Title', 'mon-article');
		expect(result).toBe('title: Mon Article');
	});

	it('remplace les tags vides {{ }}', async () => {
		const { renderArchetype } = await import('./archetypes');
		const result = renderArchetype('a{{  }}b', 'Title', 'slug');
		expect(result).toBe('ab');
	});
});
