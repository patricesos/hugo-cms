import { settingsSchema, type SettingField } from './schema';

/**
 * Valide une valeur de setting à partir de son nom de clé.
 * Utilise settingsSchema comme source unique de vérité pour les types,
 * intervalles (min/max) et options (select).
 */
export function validateSettingValue(
	key: string,
	value: unknown,
): { valid: true; parsed: string | number | boolean } | { valid: false; error: string } {
	const field = findField(key);
	if (!field) {
		return { valid: false, error: `Unknown setting key: "${key}"` };
	}

	switch (field.type) {
		case 'select': {
			if (typeof value !== 'string') {
				return { valid: false, error: `Expected a string for "${key}"` };
			}
			const validOptions = field.options?.map(o => o.value) ?? [];
			if (!validOptions.includes(value)) {
				return {
					valid: false,
					error: `Invalid value "${value}" for "${key}"; expected one of: ${validOptions.join(', ')}`,
				};
			}
			return { valid: true, parsed: value };
		}

		case 'number': {
			if (typeof value !== 'number' || isNaN(value)) {
				return { valid: false, error: `Expected a number for "${key}"` };
			}
			if (field.min !== undefined && value < field.min) {
				return { valid: false, error: `Value ${value} is below minimum ${field.min} for "${key}"` };
			}
			if (field.max !== undefined && value > field.max) {
				return { valid: false, error: `Value ${value} exceeds maximum ${field.max} for "${key}"` };
			}
			return { valid: true, parsed: value };
		}

		case 'boolean': {
			if (typeof value !== 'boolean') {
				return { valid: false, error: `Expected a boolean for "${key}"` };
			}
			return { valid: true, parsed: value };
		}

		case 'text':
		case 'folder': {
			if (typeof value !== 'string') {
				return { valid: false, error: `Expected a string for "${key}"` };
			}
			return { valid: true, parsed: value };
		}

		default:
			return { valid: false, error: `Unknown field type "${field.type}" for "${key}"` };
	}
}

function findField(key: string): SettingField | undefined {
	for (const tab of settingsSchema) {
		for (const group of tab.groups) {
			for (const field of group.fields) {
				if (field.key === key) return field;
			}
		}
	}
	return undefined;
}

export function allSettingKeys(): string[] {
	const keys: string[] = [];
	for (const tab of settingsSchema) {
		for (const group of tab.groups) {
			for (const field of group.fields) {
				keys.push(field.key);
			}
		}
	}
	return keys;
}
