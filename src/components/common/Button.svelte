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
	use:popperRef
	on:mouseenter={() => showTooltip = true}
	on:mouseleave={() => showTooltip = false}
	on:click
	class={"button " + context}
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
		color: var(--secondary-txt-color);
		background: var(--main-fg-color);
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
		font-size: 13px;

		&.control {
			margin: 0 0 0 5px;
			font-size: 12px;
		}

		&:focus {
			box-shadow: none;
			outline: none;
			border: 1px solid var(--main-accent-color);
		}

		&:first-child {
			margin-left: 0px;
		}

		&:last-child {
			margin-right: 0px;
		}

		&:hover {
			background: var(--main-accent-color);
		}
	}

	@media only screen and (max-width: 300px) {
		.button:not(.persistent) {
			display: none;
		}
	}
</style>