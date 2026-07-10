<script lang="ts">
	interface ScrollProgressProps {
		container: HTMLElement | null;
	}

	let { container }: ScrollProgressProps = $props();

	let progress = $state(0);

	$effect(() => {
		const el = container;
		if (!el) {
			progress = 0;
			return;
		}

		function onScroll() {
			const { scrollTop, scrollHeight, clientHeight } = el;
			const maxScroll = scrollHeight - clientHeight;
			progress = maxScroll > 0 ? Math.min(1, scrollTop / maxScroll) : 0;
		}

		onScroll();
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	});
</script>

<div
	class="scroll-progress"
	style="width: {progress * 100}%"
	role="progressbar"
	aria-valuenow={Math.round(progress * 100)}
	aria-valuemin={0}
	aria-valuemax={100}
></div>

<style>
	.scroll-progress {
		position: absolute;
		top: 0;
		left: 0;
		height: 3px;
		background: var(--c-primary);
		transition: width 60ms linear;
		pointer-events: none;
		z-index: 20;
	}
</style>
