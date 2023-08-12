<script>
	import { createPopperActions } from 'svelte-popperjs';
	import Tooltip from './Tooltip.svelte';

	const [popperRef, popperContent] = createPopperActions({
	    placement: 'bottom',
	    strategy: 'fixed',
	});

	let showTooltip = false;

	export let tips = false;
	export let legacy = false;
	export let size = 14;
	export let tiptext = false;
	export let persistent = false;
</script>

<button
	style='font-size:{legacy ? "14px" : size};'
	use:popperRef
	on:mouseenter={() => showTooltip = true}
	on:mouseleave={() => showTooltip = false}
	on:click
	class="control"
	class:legacy
	class:persistent
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
		-webkit-app-region: no-drag;
		margin-left: 5px;
		font-size: 14px;

		&:first-child {
			margin-left: 0px;
		}

		&:last-child {
			margin-right: 0px;
		}

		&:hover {
			background: #FAA916;
		}

		&:focus {
			box-shadow: none;
			outline: none;
			border: 1px solid #FAA916;
		}

		&.legacy {
		    border: 2px solid #3F3F3F;
		    border-top: unset;
		    border-top-left-radius: 0px;
		    border-top-right-radius: 0px;
		    border-bottom-left-radius: 4px;
		    border-bottom-right-radius: 4px;
		    height: 25px;
		    color: #3F3F3F;
		    line-height: 25px;
		    text-align: center;
		    width: 40px;
		    background: transparent;

		    &:hover {
		    	border-color: black;
			    color: black;
			    background-color: #3F3F3F;
		    }
		}
	}

	@media only screen and (max-width: 300px) {
		.control:not(.persistent) {
			display: none;
		}
	}
</style>