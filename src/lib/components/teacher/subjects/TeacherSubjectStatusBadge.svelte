<script lang="ts">
	import StatusPill from '$lib/components/shared/StatusPill.svelte';
	import type { TeacherSubjectStatusTone } from '$lib/types/teacher';

	type Props = {
		label: string;
		tone: TeacherSubjectStatusTone;
	};

	let { label, tone }: Props = $props();

	const semanticTone = $derived.by(() => {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		if (tone === 'healthy') return 'healthy';
		return 'neutral';
	});
</script>

<StatusPill {label} tone={semanticTone} uppercase={true} />
