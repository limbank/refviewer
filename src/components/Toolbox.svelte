<script>
	import { createEventDispatcher } from 'svelte';
	import mousetrap from 'svelte-use-mousetrap';
	const { ipcRenderer } = require('electron');

	import Tool from './common/Tool.svelte';
	import Eyedropper from './tools/Eyedropper.svelte';
	import Palette from './tools/Palette.svelte';
	import Background from './tools/Background.svelte';

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let backdropColor = "#000000";
	export let hex;

	function editImage(type) {
		ipcRenderer.send('editImage', {
			type: type,
			image: fileSelected
		});
	}

	export const copyImage = () => {
		let xhr = new XMLHttpRequest();

		xhr.onload = () => {
			try{
				let response =  xhr.response.slice(0,  xhr.response.size, "image/png");
				const item = new ClipboardItem({ "image/png": response });
				navigator.clipboard.write([item]);

				ipcRenderer.send('action', "Image copied!");
			}
			catch(e){ console.log(e); }
		};

		xhr.open('GET', fileSelected);
		xhr.responseType = 'blob';
		xhr.send();
	}
</script>

<svelte:window use:mousetrap={[
  ['command+s', 'ctrl+s', () => editImage("save")],
  ['command+c', 'ctrl+c', copyImage],
  [']', () => editImage("rotateRight")],
  ['[', () => editImage("rotateLeft")],
  ['.', () => editImage("flipHorizontal")],
  [',', () => editImage("flipVertical")]
]} />

<div
	class:legacy
	class="toolbox"
>
	{#if fileSelected && !settingsOpen}
		<Tool
			{tips}
			{legacy}
			size="13px"
			tiptext={"Save image"}
			on:click={() => editImage("save")}
		>
			<i class="far fa-save"></i>
		</Tool>
		<Tool
			{tips}
			{legacy}
			size="13px"
			tiptext={"Copy image"}
			on:click={copyImage}
		>
	    	<i class="far fa-clipboard" style="transform: translateY(-2px);"></i>
		</Tool>
		<Eyedropper
			{tips}
			{legacy}
			bind:hex
			on:pickColor={() => dispatch("pickColor")}
		/>
		<Background
			{tips}
			{legacy}
			bind:backdropColor
		/>
		<Tool
			{tips}
			{legacy}
			size="13px"
			tiptext={"Flip image"}
			on:click={() => editImage("flipHorizontal")}
		>
	    	<i class="fas fa-sync-alt"></i>
		</Tool>
		<Tool
			{tips}
			{legacy}
			size="12px"
			tiptext={"Rotate image"}
			on:click={() => editImage("rotateRight")}
		>
	    	<i class="fas fa-redo"></i>
		</Tool>
		<Palette
			{tips}
			{legacy}
			bind:fileSelected
		/>
	{/if}
</div>

<style lang="scss">
	.toolbox {
		width: 35px;
		min-width: 35px;
		flex-shrink: 0;
		box-sizing: border-box;
		margin-top: -1px;

		&.legacy {
			padding: 10px 10px 10px 0;
		}
	}

	@media only screen and (max-width: 300px) {
		.toolbox {
			display: none;
		}
	}
</style>
