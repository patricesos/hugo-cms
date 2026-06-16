export interface ClientConfig {
	hugoServerPort: number;
	externalPollInterval: number;
	autoSaveDelay: number;
	fmSaveDelay: number;
	appTitle: string;
	defaultArchetype: string;
}

let cached: ClientConfig | null = null;

export async function getClientConfig(): Promise<ClientConfig> {
	if (cached) return cached;
	const res = await fetch('/api/config');
	cached = await res.json() as ClientConfig;
	return cached;
}

export function getClientConfigSync(): ClientConfig | null {
	return cached;
}
