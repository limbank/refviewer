<script>
	const { ipcRenderer } = require('electron');
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';
	const tinycolor = require("tinycolor2");

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';

	import { tt, locale, locales } from "../../stores/i18n.js";
	import settings from '../../stores/settings.js';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;
	let palette = [];

	export let closeDropdowns = false;
	export let fileSelected = false;

	ipcRenderer.on('palette', (event, arg) => {
		if (arg && arg.length > 0) {
			palette = arg;
			showDropdown = true;
		}
		else ipcRenderer.send('action', $tt("palette.invalid"));
	});

	function paletteClick(hex) {
		let tempHex = hex;

		if ($settings.hashsign && tempHex.startsWith("#")) tempHex = tempHex.substring(1);
		
        navigator.clipboard.writeText(tempHex).then(() => {
		    ipcRenderer.send('action', $tt("color.copied"));
		}, () => {
		    ipcRenderer.send('action', $tt("color.failed"));
		});
	}
	
	$: if (closeDropdowns) showDropdown = false;
</script>

<Button
	tiptext={"Generate palette"}
	on:click={e => {
		ipcRenderer.send('editImage', {
			type: 'getPalette',
			image: fileSelected
		});
	}}
>	
	<i class="fas fa-palette" use:dropdownRef></i>
</Button>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<div class="palette">
			{#each palette as color}
				<div
					on:click={() => {
						let hex = tinycolor(`rgb(${color[0]}, ${color[1]}, ${color[2]})`).toHexString();
						paletteClick(hex);
					}}
					class="item"
					style="background: rgb({color[0]}, {color[1]}, {color[2]});"
				>
					<div class="item-detail">
						{color[0]},
						{color[1]},
						{color[2]}
					</div>
					<div class="item-detail">
						{tinycolor(`rgb(${color[0]}, ${color[1]}, ${color[2]})`).toHexString()}
					</div>
				</div>
			{/each}
		</div>
	</Dropdown>
{/if}

<style lang="scss">
	.palette {
		padding: 12px;
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