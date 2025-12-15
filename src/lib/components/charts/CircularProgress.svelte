<script lang="ts">
	export let value: number;
	export let max: number = 100;
	export let label: string = '';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let color: 'primary' | 'success' | 'warning' | 'error' = 'primary';

	// Circle circumference constant based on radius of 45
	const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 45; // 282.6

	$: percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
	$: sizeClass = {
		sm: 'w-20 h-20',
		md: 'w-32 h-32',
		lg: 'w-48 h-48'
	}[size];

	$: colorClass = {
		primary: 'text-primary-500',
		success: 'text-success-500',
		warning: 'text-warning-500',
		error: 'text-error-500'
	}[color];

	$: strokeDashoffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * percentage) / 100;
</script>

<div class="flex flex-col items-center gap-2">
	<div class="relative {sizeClass}">
		<svg class="transform -rotate-90 w-full h-full">
			<!-- Background circle -->
			<circle
				cx="50%"
				cy="50%"
				r="45"
				stroke="currentColor"
				stroke-width="8"
				fill="none"
				class="text-surface-700"
			/>
			<!-- Progress circle -->
			<circle
				cx="50%"
				cy="50%"
				r="45"
				stroke="currentColor"
				stroke-width="8"
				fill="none"
				class="{colorClass} transition-all duration-500"
				style="stroke-dasharray: {CIRCLE_CIRCUMFERENCE}; stroke-dashoffset: {strokeDashoffset}; stroke-linecap: round;"
			/>
		</svg>
		<!-- Center text -->
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="text-center">
				<div class="text-2xl font-bold">{percentage.toFixed(0)}%</div>
				{#if value !== undefined && max !== undefined}
					<div class="text-xs opacity-75">{value}/{max}</div>
				{/if}
			</div>
		</div>
	</div>
	{#if label}
		<div class="text-sm text-center font-medium">{label}</div>
	{/if}
</div>
