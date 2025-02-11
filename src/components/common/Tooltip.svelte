<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let content;
	export let options = {
		modifiers: [
			{ name: 'offset', options: { offset: [0, 6] } }
		],
	};

	let timeout;
	let show;

	onMount(async () => {
		setTimeout(() => {
			show = true;
		}, 600);
	});
</script>

{#if show}
	<div 
		id="tooltip" 
		class="tooltip" 
		use:content={options} 
		in:fade="{{ duration: 200 }}"
		out:fade="{{ duration: 50 }}"
	>
		<div class="tooltip-content">
			<slot></slot>
		</div>
		<div id="arrow" class="arrow" data-popper-arrow />
	</div>
{/if}

<style lang="scss" global>
	.tooltip {
		box-sizing: border-box;
		z-index: 9999;
		padding: 5px;

		&-content {
			box-sizing: border-box;
			background: #FAA916;
			color: #171719;
			padding: 2px 6px;
			min-width: 60px;
			text-align: center;
			font-size: 12px;
			font-weight: 600;
			border-radius: 3px;
		}

		.arrow:before {
		    content: '';
		    position: absolute;
		    width: 8px;
		    height: 8px;
		    top: 50%;
		    left: 50%;
		    transform: translate(-50%, -50%) rotate(45deg);
		    background: #FAA916;
		}


		&[data-popper-placement*="bottom"] .arrow {
		    top: 5px;
		}

		&[data-popper-placement="top"] .arrow {
		    bottom: 5px;
		}

		&[data-popper-placement="left"] .arrow {
		    right: 5px;
		}

		&[data-popper-placement="right"] .arrow {
		    left: 5px;
		}
	}
</style>
