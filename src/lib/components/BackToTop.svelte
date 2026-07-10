<script lang="ts">
	import { ArrowUp } from '@lucide/svelte';

	interface BackToTopProps {
		container: HTMLElement | null;
		threshold?: number;
	}

	let { container, threshold = 400 }: BackToTopProps = $props();

	let visible = $state(false);

	$effect(() => {
		const el = container;
		if (!el) {
			visible = false;
			return;
		}

		function onScroll() {
			visible = el.scrollTop > threshold;
		}

		onScroll();
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	});

	function scrollToTop() {
		container?.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

{#if visible}
	<button class="back-to-top" onclick={scrollToTop} title="Retour en haut">
		<ArrowUp size={16} />
	</button>
{/if}

<style>
	.back-to-top {
		position: absolute;
		bottom: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid var(--c-border);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		z-index: 20;
		transition: all 0.15s;
	}

	.back-to-top:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
	}
</style>
