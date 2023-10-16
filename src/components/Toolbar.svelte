<script>
	import { createEventDispatcher } from 'svelte';
	import mousetrap from 'svelte-use-mousetrap';
	const { ipcRenderer } = require('electron');

	import Button from './common/Button.svelte';
	import Eyedropper from './tools/Eyedropper.svelte';
	import Palette from './tools/Palette.svelte';
	import Resizer from './tools/Resizer.svelte';
	import Background from './tools/Background.svelte';

	import Dropout from './tools/Dropout.svelte';

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let hashsign = true;
	export let backdropColor = legacy ? "#111111" : "#2F2E33";
	export let hex;
	export let showDropdown = false;

	let closeDropdowns = false;

	function editImage(type) {
		if (!fileSelected) return;

		ipcRenderer.send('editImage', {
			type: type,
			image: fileSelected
		});
	}

	function getSelectedText() {
    	let text = "";

    	if (typeof window.getSelection != "undefined") {
        	text = window.getSelection().toString();
    	} 
    	else if (typeof document.selection != "undefined" && document.selection.type == "Text") {
        	text = document.selection.createRange().text;
    	}

    	return text;
	}

	export const copyImage = () => {
		if (!fileSelected || getSelectedText() != "") return;

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

	//close all dropdowns when settings open
	$: if (settingsOpen) closeDropdowns = true;
</script>

<svelte:window use:mousetrap={[
  ['command+s', 'ctrl+s', () => editImage("save")],
  ['command+c', 'ctrl+c', copyImage],
  [']', () => editImage("rotateRight")],
  ['[', () => editImage("rotateLeft")],
  ['.', () => editImage("flipHorizontal")],
  [',', () => editImage("flipVertical")],
  ['command+z', 'ctrl+z', () => {
  	if (!fileSelected) return;
  	ipcRenderer.send('undo', fileSelected);
  }]
]} />

<div
	class:legacy
	class="toolbox"
>
	{#if fileSelected && !settingsOpen}
		<Button
			{tips}
			{legacy}
			size="13px"
			tiptext={"Save image"}
			on:click={() => editImage("save")}
		>
			<i class="far fa-save"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			size="13px"
			tiptext={"Copy image"}
			on:click={copyImage}
		>
	    	<i class="far fa-clipboard" style="transform: translateY(-2px);"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			size="13px"
			tiptext={"Crop image"}
			on:click={() => dispatch("cropImage")}
		>
	    	<i class="far fa-crop-alt" style=""></i>
		</Button>
		<Button
			{tips}
			{legacy}
			size="13px"
			tiptext={"Flip image"}
			on:click={() => editImage("flipHorizontal")}
		>
	    	<i class="fas fa-sync-alt"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			size="12px"
			tiptext={"Rotate image"}
			on:click={() => editImage("rotateRight")}
		>
	    	<i class="fas fa-redo"></i>
		</Button>
		<Eyedropper
			{tips}
			{legacy}
			{closeDropdowns}
			{hashsign}
			bind:showDropdown
			bind:hex
			on:pickColor={() => dispatch("pickColor")}
		/>
		<Background
			{tips}
			{legacy}
			{hashsign}
			{closeDropdowns}
			bind:backdropColor
		/>
		<Resizer
			{tips}
			{legacy}
			{closeDropdowns}
			bind:fileSelected
		/>
		<Dropout icon="fas fa-magic" {legacy}>
			<Palette
				{tips}
				{legacy}
				{hashsign}
				{closeDropdowns}
				bind:fileSelected
			/>
			<Button
				{tips}
				{legacy}
				size="13px"
				tiptext={"Greyscale"}
				on:click={() => editImage("greyImage")}
			>
		    	<i class="fas fa-adjust"></i>
			</Button>
			<Button
				{tips}
				{legacy}
				size="13px"
				tiptext={"Negative"}
				on:click={() => editImage("negateImage")}
			>
		    	<i class="fas fa-minus-circle"></i>
			</Button>
		</Dropout>
	{/if}
</div>

<style lang="scss">
	.toolbox {
		width: 35px;
		min-width: 35px;
		flex-shrink: 0;
		box-sizing: border-box;
		margin-top: -1px;
		-webkit-app-region: drag;

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
