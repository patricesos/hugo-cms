export interface ClientConfig {
	hugoServerPort: number;
	externalPollInterval: number;
	autoSaveDelay: number;
	fmSaveDelay: number;
	appTitle: string;
	defaultArchetype: string;
}

export interface ServerConfig {
	hugoSitePath: string;
	hugoServerPort: number;
	hugoBindAddress: string;
	hugoStartupTimeout: number;
	hugoStopTimeout: number;
	externalPollInterval: number;
	autoSaveDelay: number;
	fmSaveDelay: number;
	appTitle: string;
	defaultAuthor: string;
	defaultArchetype: string;
	dateFormat: string;
	trashDir: string;
	gitEnabled: boolean;
	defaultRemote: string;
	defaultBranch: string;
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

export async function getServerConfig(): Promise<ServerConfig> {
	const res = await fetch('/api/config');
	return await res.json() as ServerConfig;
}
