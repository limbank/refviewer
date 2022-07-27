<script>
	import { createPopperActions } from 'svelte-popperjs';
	import Tooltip from './Tooltip.svelte';

	const [popperRef, popperContent] = createPopperActions({
	    placement: 'right',
	    strategy: 'fixed',
	});

	let showTooltip = false;

	export let tips = false;
	export let legacy = false;
	export let size = 14;
	export let tiptext = false;
</script>

<button
	style='font-size:{legacy ? "14px" : size};'
	use:popperRef
	on:mouseenter={() => showTooltip = true}
	on:mouseleave={() => showTooltip = false}
	on:click
	class="control"
	class:legacy
>
	<slot></slot>
</button>

{#if showTooltip && !tips && tiptext}
	<Tooltip content={popperContent}>
		{tiptext}
	</Tooltip>
{/if}

<style lang="scss">
	.control {
		box-sizing: border-box;
		color: #171719;
		background: #3A3940;
		border-radius: 3px;
		border: 0;
		margin: 0;
		padding: 2px 0 0;
		height: 20px;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		transition: color 0.1s ease-out;
		margin-bottom: 5px;
		font-size: 14px;

		&:first-child {
			margin-top: 0px;
		}

		&:last-child {
			margin-bottom: 0px;
		}

		&:hover {
			background: #FAA916;
		}

		&.legacy {
			width: 25px;
			height: 25px;
			margin-bottom: 10px;
			border: 2px solid #3F3F3F;
			background: transparent;
			color: #3F3F3F;

		    &:hover {
		    	border-color: black;
			    color: black;
			    background-color: #3F3F3F;
		    }
		}
	}
</style>