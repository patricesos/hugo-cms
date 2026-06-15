<script lang="ts">
	let { wordCount = 0, charCount = 0, saveState = 'saved' }: {
		wordCount?: number;
		charCount?: number;
		saveState?: 'saved' | 'unsaved' | 'saving';
	} = $props();

	const labels: Record<string, string> = {
		saved: '✓  Enregistré',
		unsaved: '●  Modifications non sauvegardées',
		saving: '○  Sauvegarde…',
	};
</script>

<div class="status-bar">
	<span class="save-status" class:saved={saveState === 'saved'}
		class:unsaved={saveState === 'unsaved'}
		class:saving={saveState === 'saving'}>
		{labels[saveState]}
	</span>
	<span class="stats">
		{wordCount} mots · {charCount} caractères
	</span>
</div>

<style>
	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 16px;
		font-size: 12px;
		color: #6b7280;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
		font-family: ui-monospace, 'SF Mono', monospace;
	}

	.save-status.saved { color: #16a34a; }
	.save-status.unsaved { color: #d97706; }
	.save-status.saving { color: #6366f1; }

	.stats { color: #9ca3af; }
</style>
