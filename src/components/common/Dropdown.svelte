<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { clickOutside } from '../../scripts/clickOutside.js'

	const dispatch = createEventDispatcher();

	export let content;

	export let options = {
		modifiers: [
		    {
		      name: 'offset',
		      options: {
		        offset: ({ placement, reference, popper }) => {
		        	if (popper.y > 0) {
		        		return [12, 15];
		        	}
		        	else {
		        		return [-12, 15];
		        	}
		        },
		      },
		    },
	  	],
	};

	let show;
	let clicks = 0;

	onMount(async () => {
		show = true;
	});
</script>

{#if show}
	<div 
		id="dropdown" 
		class="dropdown" 
		use:content={options} 
		in:fade="{{ duration: 200 }}"
		out:fade="{{ duration: 50 }}"
		use:clickOutside
		on:outsideclick={() => {
			clicks++;
			if (clicks > 1) {
				dispatch('close');
				show = false;
			}
		}}
	>
		<div class="dropdown-content">
			<slot></slot>
		</div>
		<div id="arrow" class="arrow" data-popper-arrow />
	</div>
{/if}

<style lang="scss" global>
	.dropdown {
		box-sizing: border-box;
		z-index: 9998;
		padding: 5px;

		&-content {
			box-sizing: border-box;
			background: var(--secondary-txt-color);
			border-radius: 3px;
			position: relative;
			z-index: 2;
		}

		&>.arrow:before {
		    content: '';
		    position: absolute;
		    z-index: 1;
		    width: 8px;
		    height: 8px;
		    top: 50%;
		    left: 50%;
		    transform: translate(-50%, -50%) rotate(45deg);
			background: var(--secondary-txt-color);
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
