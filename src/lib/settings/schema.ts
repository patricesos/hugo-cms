export type SettingType = 'select' | 'number' | 'text' | 'boolean';

export interface SettingField {
	key: string;
	label: string;
	description?: string;
	type: SettingType;
	options?: { value: string; label: string }[];
	default: string | number | boolean;
	unit?: string;
	min?: number;
	max?: number;
	advanced?: boolean;
}

export interface SettingGroup {
	label: string;
	fields: SettingField[];
}

export interface SettingTab {
	id: string;
	label: string;
	groups: SettingGroup[];
}

export const settingsSchema: SettingTab[] = [
	{
		id: 'general',
		label: 'Général',
		groups: [
			{
				label: '',
				fields: [
					{
						key: 'theme',
						label: 'Thème',
						type: 'select',
						options: [
							{ value: 'system', label: 'Système' },
							{ value: 'light', label: 'Clair' },
							{ value: 'dark', label: 'Sombre' },
						],
						default: 'system',
					},
					{
						key: 'editorFont',
						label: 'Police éditeur',
						type: 'select',
						options: [
							{ value: 'serif', label: 'Serif (Georgia)' },
							{ value: 'sans', label: 'Sans-serif (Open Sans)' },
							{ value: 'mono', label: 'Monospace' },
							{ value: 'system-ui', label: 'System UI' },
						],
						default: 'serif',
					},
					{
						key: 'editorFontSize',
						label: 'Taille police éditeur',
						type: 'select',
						options: [
							{ value: 'small', label: 'Petite' },
							{ value: 'normal', label: 'Normale' },
							{ value: 'large', label: 'Grande' },
						],
						default: 'normal',
					},
					{
						key: 'editorMaxWidth',
						label: 'Largeur max éditeur',
						type: 'select',
						options: [
							{ value: '720px', label: '720px' },
							{ value: 'custom', label: 'Personnalisée' },
							{ value: '100%', label: '100%' },
						],
						default: '720px',
					},
					{
						key: 'editorMaxWidthCustom',
						label: 'Largeur perso',
						type: 'number',
						unit: 'px',
						default: 720,
						min: 400,
						max: 2000,
					},
				],
			},
		],
	},
	{
		id: 'editor',
		label: 'Éditeur',
		groups: [
			{
				label: '',
				fields: [
					{
						key: 'defaultRawMode',
						label: 'Mode brut par défaut',
						type: 'boolean',
						default: false,
					},
					{
						key: 'showBubbleMenu',
						label: 'Menu flottant (sélection)',
						type: 'boolean',
						default: true,
					},
					{
						key: 'showSlashMenu',
						label: 'Menu slash (/)',
						type: 'boolean',
						default: true,
					},
					{
						key: 'draftByDefault',
						label: 'Brouillon par défaut',
						type: 'boolean',
						default: true,
					},
					{
						key: 'autoSaveDelay',
						label: 'Auto-save',
						description: "Délai d'inactivité avant sauvegarde",
						type: 'number',
						unit: 'ms',
						default: 2000,
						min: 500,
						max: 30000,
					},
					{
						key: 'historyDepth',
						label: 'Undo/redo max',
						description: "Nombre d'états conservés dans l'historique",
						type: 'number',
						default: 250,
						min: 10,
						max: 10000,
					},
				],
			},
		],
	},
	{
		id: 'panels',
		label: 'Panneaux',
		groups: [
			{
				label: 'Sidebar',
				fields: [
					{
						key: 'sidebarOpen',
						label: 'Ouverte par défaut',
						type: 'boolean',
						default: true,
					},
					{
						key: 'sidebarWidth',
						label: 'Largeur',
						type: 'number',
						unit: 'px',
						default: 260,
						min: 180,
						max: 500,
					},
					{
						key: 'sidebarView',
						label: 'Vue par défaut',
						type: 'select',
						options: [
							{ value: 'content', label: 'Content' },
							{ value: 'static', label: 'Static' },
							{ value: 'archetypes', label: 'Archetypes' },
							{ value: 'config', label: 'Config' },
						],
						default: 'content',
					},
				],
			},
			{
				label: 'Frontmatter',
				fields: [
					{
						key: 'fmOpen',
						label: 'Ouvert par défaut',
						type: 'boolean',
						default: true,
					},
					{
						key: 'fmWidth',
						label: 'Largeur',
						type: 'number',
						unit: 'px',
						default: 280,
						min: 200,
						max: 500,
					},
					{
						key: 'fmRawMode',
						label: 'Mode brut',
						description: 'Éditer le YAML directement',
						type: 'boolean',
						default: false,
					},
				],
			},
			{
				label: 'Hugo',
				fields: [
					{
						key: 'showConsole',
						label: 'Console Hugo',
						type: 'boolean',
						default: false,
					},
					{
						key: 'showPreview',
						label: 'Aperçu Hugo',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	},
	{
		id: 'git',
		label: 'Git',
		groups: [
			{
				label: '',
				fields: [
					{
						key: 'showGit',
						label: 'Git intégré',
						description: 'Active le panneau commit / push',
						type: 'boolean',
						default: false,
					},
					{
						key: 'gitRemote',
						label: 'Remote par défaut',
						type: 'text',
						default: 'origin',
					},
					{
						key: 'gitBranch',
						label: 'Branche par défaut',
						type: 'text',
						default: 'main',
					},
				],
			},
		],
	},
	{
		id: 'advanced',
		label: 'Avancé',
		groups: [
			{
				label: 'Chemin du site Hugo',
				fields: [
					{
						key: 'hugoSitePathUseDotEnv',
						label: 'Utiliser le chemin depuis .env',
						description: 'Décocher pour définir un chemin personnalisé',
						type: 'boolean',
						default: true,
					},
					{
						key: 'hugoSitePathCustom',
						label: 'Chemin personnalisé',
						type: 'text',
						default: '',
					},
				],
			},
		],
	},
];
