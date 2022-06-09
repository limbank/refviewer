<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Toolbox from './components/Toolbox.svelte';
	import Settings from './components/Settings.svelte';
	import Dropfield from './components/Dropfield.svelte';

	import { Canvas, Layer, t } from "svelte-canvas";

	import Panzoom from '@panzoom/panzoom';

	const { ipcRenderer } = require('electron');

	let file = false;
	let width;
	let height;
	let zoomed = false;
	let settings = {};
	let settingsOpen = false;

	let proxySettings;
	let initUpdate = 0;
	let instance;
	let version = "4.0.14";

	ipcRenderer.on('settings', (event, arg) => {
		if (settings.zoom && settings.zoom != arg.zoom && instance) {
			let element = document.querySelector('.canvas-container-inner');
			initPan(element, arg.zoom);
		}

		settings = arg;
		initUpdate++;
		if (initUpdate<2) {
			console.log("REPEATED UPDATE FAILED!", initUpdate);
			proxySettings = settings;
		}
	});

	let img = new Image(); 


	function initPan(element, customZoom = false) {
		if (!element) return;

	    try {
	    	console.log("test");

	    	instance.destroy();
	    }
	    catch(e) {/*console.log("errrrr", e);*/}

		// And pass it to panzoom
		instance = Panzoom(element, {
			maxScale: 10000,
			step: customZoom || settings.zoom
		});
		element.parentElement.addEventListener('wheel', instance.zoomWithWheel);
		element.addEventListener('panzoomchange', (event) => {
		  	if (event.detail.scale >= 10) zoomed = true;
			else zoomed = false;
		})
	};

  	$: render = ({ context }) => {
	    context.drawImage(img, 0, 0);

		let element = document.querySelector('.canvas-container-inner');
	    initPan(element);
  	};

	function handleFilesSelect(e) {
		if (!settings.overwrite && file || settingsOpen) return;

	    //console.log(e.dataTransfer.files);

	    const acceptedFiles = Array.from(e.dataTransfer.files);

	    if (acceptedFiles.length > 0) {
	    	ipcRenderer.send('file', acceptedFiles[0].path);
	    }
	    else {
		    let items = e.dataTransfer;
		    console.log(items.getData("text"), );

		    //HANDLE URL, DATA, AND WHATEVER ERRORS HERE
	    }
	}

	img.onload = function(){
	  	width = img.width;
	  	height = img.height;
	};

	ipcRenderer.on('deliver', (event, arg) => {
		console.log("loading file!");
		img.src = arg;
		file = arg;
	});

	/*
		NOTE!!!

		Maybe add a setting that separates clicking
		into a separate button.

		Add image selection by dropping text in
	*/

	function handlePaste(event) {
		if (!settings.overwrite && file || settingsOpen) return;

		if (event.clipboardData.getData('Text') != "") {
			console.log("test pasted! handle URL?");
		}

		let items = (event.clipboardData  || event.originalEvent.clipboardData).items;

		let blob = null;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") === 0) blob = items[i].getAsFile();
			else{
				//afaik you can't really paste PSD here
			}
		}
		if (blob == null) return;

		/*
			Electron doesn't want us sending blob objects via ipc
			so we'll handle it in-house instead.

		*/

		var a = new FileReader();
        a.onload = function(e) {
			img.src = e.target.result;
			file = e.target.result;
        }
        a.readAsDataURL(blob);
	}
</script>

<svelte:window on:paste={handlePaste}/>

<div class="backdrop" class:legacy={settings.theme}>
	<div class="backdrop-bg backdrop-top"></div>
	<div class="backdrop-bg backdrop-right"></div>
	<div class="backdrop-bg backdrop-bottom"></div>
	<div class="backdrop-bg backdrop-left"></div>
</div>

<main class:legacy={settings.theme}>
	<Titlebar
		fileSelected={file}
		settingsOpen={settingsOpen}
		overwrite={settings.overwrite}
		legacy={settings.theme}
		tips={settings.tooltips}
		version={version}
		on:clear={e => {


			file = false;

		    try {
		    	console.log("destroying");
		    	instance.destroy();
		    }
		    catch(e) {
		    	console.log("err", e)
		    }
		}}
		on:settingsOpen={e => { settingsOpen = e.detail; }}
	/>
	<Toolbox
		settingsOpen={settingsOpen}
		fileSelected={file}
		legacy={settings.theme}
		tips={settings.tooltips}
	/>
	<Desktop
		legacy={settings.theme}
		on:dragover={(e) => { e.preventDefault(); }}
		on:drop={handleFilesSelect}
	>
		{#if settingsOpen}
			<Settings
				settings={proxySettings}
				version={version}
			/>
		{/if}

		{#if file}
			<div class="canvas-container" class:pixelated={zoomed}>
				<div class="canvas-container-inner">
				    <Canvas width={width} height={height}>
						<Layer {render} />
					</Canvas>
				</div>
			</div>
		{:else}
			<Dropfield
				legacy={settings.theme}
				on:select={e => {
					alert("woop");
				}}
			/>
		{/if}
	</Desktop>
</main>

<style lang="scss">
	.backdrop {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		border-radius: 5px;
		overflow: hidden;
		pointer-events: none;

		&.legacy {
			border-radius: 0PX;
		}

		&-bg {
			background: #171719;
			position: absolute;
		}

		&.legacy &-bg {
			background: #111111;
		}

		&-top {
			left: 0;
			top: 0;
			right: 0;
			height: 42px;
		}

		&-bottom {
			left: 0;
			bottom: 0;
			right: 0;
			height: 17px;
		}

		&-left {
			left: 0;
			top: 0;
			bottom: 0;
			width: 52px;
		}

		&-right {
			right: 0;
			top: 0;
			bottom: 0;
			width: 17px;
		}
	}

	main {
		position: fixed;

		box-sizing: border-box;
		z-index: 2;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		border-radius: 5px;
		overflow: hidden;
		display: flex;
		padding: 30px 5px 5px;

		&.legacy {
			border-radius: 0PX;
			padding: 35px 10px 10px;
		}
	}

	.canvas-container {
		overflow: hidden;
		width: 100%;
		height: 100%;
		position: relative;

		&-inner {
			overflow: hidden;
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
			display: flex;
			justify-content: center;
			align-items: center;


			:global(canvas) {
			    max-width: 100%;
			    max-height: 100%;
			    object-fit: contain;
			    align-self: center;
			    z-index:9999 !important;
			    pointer-events:all !important;
			}
		}
	}

	.pixelated {
		:global(canvas) {
		    image-rendering: -webkit-crisp-edges;
		    image-rendering: pixelated;
		    image-rendering: crisp-edges;
		}
	}
</style>
