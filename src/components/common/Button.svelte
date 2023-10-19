<script>
	import { createPopperActions } from 'svelte-popperjs';
	import Tooltip from './Tooltip.svelte';

	import settings from '../../stores/settings.js';

	let showTooltip = false;

	export let size = 14;
	export let tiptext = false;
	export let persistent = false;
	export let context = "";

	const [popperRef, popperContent] = createPopperActions({
	    placement: context != "" ? 'bottom' : 'right',
	    strategy: 'fixed',
	});
</script>

<button
	style='font-size:{$settings.theme ? "14px" : size};'
	use:popperRef
	on:mouseenter={() => showTooltip = true}
	on:mouseleave={() => showTooltip = false}
	on:click
	class={"button " + context}
	class:legacy={$settings.theme}
	class:persistent
>
	<slot></slot>
</button>

{#if showTooltip && !$settings.tooltips && tiptext}
	<Tooltip content={popperContent}>
		{tiptext}
	</Tooltip>
{/if}

<style lang="scss">
	.button {
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

		&.control {
			margin: 0 0 0 5px;

			&.legacy {
			    width: 40px;
			    border-top: unset;
			    border-top-left-radius: 0px;
			    border-top-right-radius: 0px;
			    border-bottom-left-radius: 4px;
			    border-bottom-right-radius: 4px;
			    line-height: 25px;
			    text-align: center;
			}
		}

		&:focus {
			box-shadow: none;
			outline: none;
			border: 1px solid #FAA916;
		}

		&:first-child {
			margin-left: 0px;
		}

		&:last-child {
			margin-right: 0px;
		}

		&:hover {
			background: #FAA916;
		}
	}

	@media only screen and (max-width: 300px) {
		.button:not(.persistent) {
			display: none;
		}
	}
</style>