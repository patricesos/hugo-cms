<script lang="ts">
	import type { SettingField } from './schema';
	import FolderPicker from '$lib/components/FolderPicker.svelte';

	let { field, value, onChange }: {
		field: SettingField;
		value: any;
		onChange: (key: string, value: any) => void;
	} = $props();

	let showFolderPicker = $state(false);

	function clampNumber(val: number): number {
		if (field.min !== undefined) val = Math.max(field.min, val);
		if (field.max !== undefined) val = Math.min(field.max, val);
		return val;
	}

	function handleBlur(e: Event) {
		if (field.type === 'number') {
			const el = e.target as HTMLInputElement;
			const clamped = clampNumber(parseInt(el.value, 10) || (field.default as number));
			el.value = String(clamped);
			onChange(field.key, clamped);
		}
	}
</script>

<div class="field-row">
	<div class="field-text">
		<span class="field-label">{field.label}</span>
		{#if field.description}
			<span class="field-desc">{field.description}</span>
		{/if}
	</div>

	<div class="field-control">
		{#if field.type === 'boolean'}
			<button
				class="toggle"
				class:active={!!value}
				onclick={() => onChange(field.key, !value)}
				role="switch"
				aria-checked={!!value}
				aria-label={field.label}
			>
				<span class="toggle-dot"></span>
			</button>

		{:else if field.type === 'select'}
			<select
				value={String(value)}
				onchange={(e) => onChange(field.key, (e.target as HTMLSelectElement).value)}
				class="select-input"
			>
				{#each field.options ?? [] as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>

		{:else if field.type === 'number'}
			<div class="number-wrap">
				<input
					type="number"
					min={field.min}
					max={field.max}
					value={value}
					oninput={(e) => onChange(field.key, parseInt((e.target as HTMLInputElement).value, 10) || (field.default as number))}
					onblur={handleBlur}
					class="number-input"
				/>
				{#if field.unit}<span class="unit">{field.unit}</span>{/if}
			</div>

		{:else if field.type === 'folder'}
			<div class="folder-wrap">
				<input
					type="text"
					value={String(value)}
					oninput={(e) => onChange(field.key, (e.target as HTMLInputElement).value)}
					class="text-input folder-input"
				/>
				<button
					class="browse-btn"
					onclick={() => showFolderPicker = true}
					title="Parcourir"
				>…</button>
			</div>
			<FolderPicker
				show={showFolderPicker}
				initialPath={String(value)}
				onSelect={(path) => { onChange(field.key, path); showFolderPicker = false; }}
				onClose={() => showFolderPicker = false}
			/>

		{:else if field.type === 'text'}
			<input
				type="text"
				value={String(value)}
				oninput={(e) => onChange(field.key, (e.target as HTMLInputElement).value)}
				class="text-input"
			/>
		{/if}
	</div>
</div>

<style>
	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		gap: 12px;
		border-bottom: 1px solid var(--c-border);
	}

	.field-row:last-child {
		border-bottom: none;
	}

	.field-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.field-label {
		font-size: 13px;
		color: var(--c-text);
		font-weight: 500;
	}

	.field-desc {
		font-size: 11px;
		color: var(--c-text-muted);
		line-height: 1.3;
	}

	.field-control {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	/* Toggle switch */
	.toggle {
		position: relative;
		width: 36px;
		height: 20px;
		border-radius: var(--radius-xl);
		border: none;
		background: var(--c-border);
		cursor: pointer;
		padding: 0;
		transition: background 0.15s;
		flex-shrink: 0;
	}

	.toggle.active {
		background: var(--c-primary);
	}

	.toggle-dot {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.15s;
	}

	.toggle.active .toggle-dot {
		transform: translateX(16px);
	}

	/* Select */
	.select-input {
		padding: 4px 8px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		min-width: 110px;
	}

	/* Number */
	.number-wrap {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.number-input {
		width: 72px;
		padding: 4px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		text-align: right;
	}

	.unit {
		font-size: 11px;
		color: var(--c-text-muted);
		font-family: monospace;
		min-width: 24px;
	}

	/* Text */
	.text-input {
		padding: 4px 8px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		width: 110px;
	}

	.folder-wrap {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.folder-input {
		width: 220px;
	}

	.browse-btn {
		padding: 4px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		line-height: 1;
	}

	.browse-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}
</style>
