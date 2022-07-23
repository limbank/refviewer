<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';
	const { ipcRenderer } = require('electron');
	const tinycolor = require("tinycolor2");

	import Tool from './Tool.svelte';
	import Dropdown from './Dropdown.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;
	let palette = {};

	export let fileSelected = false;
	export let tips = false;
	export let legacy = false;

	ipcRenderer.on('palette', (event, arg) => {
		palette = arg;
	});
</script>

<Tool
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Generate palette"}
	on:click={e => {
		ipcRenderer.send('getPalette', fileSelected);
		showDropdown = true;
	}}
>	
	<i class="fas fa-palette" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<div class="palette">
			{#each Object.entries(palette) as [color_name, color_number]}
				<div
					on:click={e => {
			            navigator.clipboard.writeText(tinycolor(`rgb(${palette[color_name]._rgb})`).toHexString()).then(() => {
						    console.log("Copied to clipboard");
						}, () => {
						    console.log("Failed to copy");
						});
					}}
					class="item"
					style="background: rgb({palette[color_name]._rgb});"
				>
					<div class="item-detail">
						{Math.floor(palette[color_name]._rgb[0])},
						{Math.floor(palette[color_name]._rgb[1])},
						{Math.floor(palette[color_name]._rgb[2])}
					</div>
					<div class="item-detail">
						{tinycolor(`rgb(${palette[color_name]._rgb})`).toHexString()}
					</div>
				</div>
			{/each}
		</div>
	</Dropdown>
{/if}

<style lang="scss">
	.palette {
		padding: 15px;
		display: grid;
		grid-template-columns: 70px 70px 70px;
		grid-template-rows: 70px 70px;
		grid-column-gap: 5px;
		grid-row-gap: 5px;

		.item {
			border-radius: 3px;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			justify-content: flex-end;
			padding: 5px;
			cursor: pointer;

			&-detail {
				font-size:8px;
				background: rgba(0, 0, 0, 0.6);
				color: #a7a6ab;
				border-radius: 3px;
				padding: 1px 2px;
				margin: 1px 0 0;
				pointer-events: none;
			}
		}
	}
</style>