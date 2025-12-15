<script lang="ts">
	export let data: { label: string; value: number; color?: string }[] = [];
	export let title: string = '';
	export let showPercentage: boolean = true;

	$: total = data.reduce((sum, item) => sum + item.value, 0);
	$: dataWithPercentages = data.map((item) => ({
		...item,
		percentage: total > 0 ? (item.value / total) * 100 : 0
	}));

	const defaultColors = [
		'bg-primary-500',
		'bg-secondary-500',
		'bg-tertiary-500',
		'bg-success-500',
		'bg-warning-500',
		'bg-error-500'
	];

	function getColor(index: number): string {
		return data[index]?.color || defaultColors[index % defaultColors.length];
	}
</script>

{#if title}
	<h3 class="h3 mb-4">{title}</h3>
{/if}

{#if data.length === 0}
	<div class="text-center py-8 opacity-75">
		<p>No data available</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each dataWithPercentages as item, index}
			<div class="space-y-1">
				<div class="flex justify-between items-center text-sm">
					<span class="font-medium capitalize">{item.label}</span>
					<div class="flex items-center gap-2">
						<span class="font-bold">{item.value}</span>
						{#if showPercentage}
							<span class="opacity-75">({item.percentage.toFixed(1)}%)</span>
						{/if}
					</div>
				</div>
				<div class="w-full bg-surface-700 rounded-full h-3 overflow-hidden">
					<div
						class="h-full transition-all duration-500 {getColor(index)}"
						style="width: {item.percentage}%"
					/>
				</div>
			</div>
		{/each}
	</div>
{/if}
