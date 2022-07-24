<script>
	import { createEventDispatcher } from 'svelte';
	const { ipcRenderer } = require('electron');

	import Tool from './common/Tool.svelte';
	import Eyedropper from './tools/Eyedropper.svelte';
	import Palette from './tools/Palette.svelte';
	import Backdrop from './Backdrop.svelte';

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let backdropColor = "#000000";
	export let pickedColor;

	function copyImage() {
		let xhr = new XMLHttpRequest();
		xhr.onload = () => {
			try{
				let response =  xhr.response.slice(0,  xhr.response.size, "image/png");
				const item = new ClipboardItem({ "image/png": response });
				navigator.clipboard.write([item]);
				this.notify("Image copied!");
			}
			catch(e){ console.log(e); }
		};
		xhr.open('GET', fileSelected);
		xhr.responseType = 'blob';
		xhr.send();

		ipcRenderer.send('action', "Image copied!");
	}
</script>

<div class="toolbox">
	{#if fileSelected && !settingsOpen}
		<Tool
			{tips}
			{legacy}
			size="13px"
			tiptext={"Save image"}
			on:click={e => { ipcRenderer.send('saveImage', fileSelected); }}
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
			bind:pickedColor
			on:pickColor={() => dispatch("pickColor")}
		/>
		<Backdrop
			{tips}
			{legacy}
			bind:backdropColor
		/>
		<Tool
			{tips}
			{legacy}
			size="13px"
			tiptext={"Flip image"}
			on:click={e => { ipcRenderer.send('flipImage', fileSelected); }}
		>
	    	<i class="fas fa-sync-alt"></i>
		</Tool>
		<Tool
			{tips}
			{legacy}
			size="12px"
			tiptext={"Rotate image"}
			on:click={e => { ipcRenderer.send('rotateImage', fileSelected); }}
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
	}

	@media only screen and (max-width: 300px) {
		.toolbox {
			display: none;
		}
	}
</style>
