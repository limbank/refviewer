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
		padding: 2px 0 0;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		height: 20px;
		transition: color 0.1s ease-out;
		-webkit-app-region: no-drag;
		margin: 0 0 5px;
		font-size: 14px;

		&:focus {
			box-shadow: none;
			outline: none;
			border: 1px solid #FAA916;
		}

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