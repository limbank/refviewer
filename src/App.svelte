<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Toolbox from './components/Toolbox.svelte';
	import Actions from './components/Actions.svelte';
	import Dropfield from './components/Dropfield.svelte';
	import Menu from './components/menu/Menu.svelte';
	import Loader from './components/common/Loader.svelte';
	import Cursor from './components/Cursor.svelte';
	import Zoomscale from './components/Zoomscale.svelte';
	import tinycolor from 'tinycolor2';
	import Panzoom from '@panzoom/panzoom';
	import { Canvas, Layer, t } from "svelte-canvas";

	import Helper from './scripts/helper.js';

	const { ipcRenderer } = require('electron');
	const { version } = require('../package.json');

	const helper = new Helper();

	let fileSelected = false;
	let width;
	let height;
	let pixelated = false;
	let settings = {};
	let proxySettings;
	let settingsOpen = false;
	let pickingmode = false;

	let recents;
	let initUpdate = 0;
	let instance;

	let loading = false;

	let hex;
	let chosenColor;
	let mouseincanvas = false;

	let zoomscale = 1;

	let backdropColor = "#2F2E33";

  	let workAreaOpacity = 1;
	let m = { x: 0, y: 0 };

	let img = new Image();
	img.onload = function(){
	  	width = img.width;
	  	height = img.height;
	};

	ipcRenderer.on('recents', (event, arg) => {
		recents = arg;
	});

	ipcRenderer.on('settings', (event, arg) => {
		if (settings.zoom && settings.zoom != arg.zoom && instance) {
			let element = document.querySelector('.canvas-container-inner');
			initPan(element, arg.zoom);
		}

		settings = arg;
		initUpdate++;

		if (initUpdate < 2) proxySettings = settings;
	});

	ipcRenderer.on('deliver', (event, arg) => {
		img.src = arg;
		loading = false;
		fileSelected = arg;
	});

	function delInstance() {
	    try {
	    	instance.destroy();
	    }
	    catch(e) {/*console.log("errrrr", e);*/}
	}

	function handleCursor(event) {
		m.x = event.clientX;
		m.y = event.clientY;
	}

	function initPan(element, customZoom = false) {
		if (!element) return;

		delInstance();

		// And pass it to panzoom
		instance = Panzoom(element, {
			maxScale: 10000,
			step: customZoom || settings.zoom
		});

		element.parentElement.addEventListener('wheel', instance.zoomWithWheel);
		element.addEventListener('panzoomchange', (event) => {
			zoomscale = Number(event.detail.scale).toFixed(1);

		  	if (event.detail.scale >= 10) pixelated = true;
			else pixelated = false;
		})
	};

  	$: render = ({ context }) => {
  		try {
		    context.drawImage(img, 0, 0);

			let element = document.querySelector('.canvas-container-inner');
		    initPan(element);
  		}
	    catch(e) { console.log("err", e); }
  	};

  	$: {
  		if(!settings.transparency) workAreaOpacity = tinycolor(backdropColor).toRgb().a;
		else workAreaOpacity = 1;
  	};

  	function handleMousemove(e) {
  		if (!pickingmode) return;

  		mouseincanvas = true;

        let canvas = e.srcElement;
        let ctx = canvas.getContext('2d');

        let positionInfo = canvas.getBoundingClientRect();
        let mousePos = helper.getMousePos(canvas, e, positionInfo);
        let newWidth = helper.scaleNumber(mousePos.x, [0, positionInfo.width], [0, width]);
        let newHeight = helper.scaleNumber(mousePos.y, [0, positionInfo.height], [0, height]);

        let imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
        let pixel = imageData.data;
        let pixelColor = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`;

        chosenColor = tinycolor({ r: pixel[0], g: pixel[1], b: pixel[2] }).toHexString();
  	}

	function handlePaste(event) {
		if (!settings.overwrite && fileSelected || settingsOpen) return;

		if (event.clipboardData.getData('Text') != "") {
			console.log("text pasted! handle URL?");
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

		helper.getIMG(blob, (result) => {
			img.src = result;
			fileSelected = result;
		});
	}
</script>

<svelte:window on:paste={handlePaste} />

<div class="backdrop" class:legacy={settings.theme}>
	<div class="backdrop-bg backdrop-top"></div>
	<div class="backdrop-bg backdrop-right"></div>
	<div class="backdrop-bg backdrop-bottom"></div>
	<div class="backdrop-bg backdrop-left"></div>
</div>

<main class:legacy={settings.theme}>
	<Titlebar
		{settingsOpen}
		{version}
		{fileSelected}
		overwrite={settings.overwrite}
		legacy={settings.theme}
		tips={settings.tooltips}
		on:clear={e => {
			fileSelected = false;
	    	backdropColor = "#2F2E33";

		    delInstance();
		}}
		on:settingsOpen={e => { settingsOpen = e.detail; }}
	/>
	<Toolbox
		{settingsOpen}
		{fileSelected}
		{hex}
		legacy={settings.theme}
		tips={settings.tooltips}
		bind:backdropColor
		on:pickColor={e => {
			pickingmode = true;
	  		instance.setOptions({ disablePan: true });
		}}
	/>
	<Desktop
		legacy={settings.theme}
		settings={proxySettings}
		{backdropColor}
		{settingsOpen}
		bind:loading
	>
		{#if settingsOpen}
			<Menu
				settings={proxySettings}
				{recents}
				{version}
				on:settingsOpen={e => { settingsOpen = e.detail; }}
			/>
		{/if}

		{#if loading}
			<Loader />
		{/if}

		{#if fileSelected}
			<div
				class="canvas-container"
				class:pixelated
				on:mousemove={handleCursor}
			>
				{#if pickingmode && mouseincanvas}
					<Cursor
						x={m.x}
						y={m.y}
						{chosenColor}
					/>
				{/if}

				<Zoomscale {zoomscale} {instance} />

				<div
					class="canvas-container-inner"
			    	style="opacity: {workAreaOpacity}"
					class:pickingmode
			    	on:click={() => {
			    		setTimeout(() => {
				    		if (pickingmode) {
				    			pickingmode = false;
		  						instance.setOptions({ disablePan: false });
				    		}
			    		}, 100);
			    	}}
				>
				    <Canvas
				    	width={width}
				    	height={height}
				    	on:mousemove={handleMousemove}
				    	on:mouseenter={() => { mouseincanvas = true; }}
				    	on:mouseleave={() => { mouseincanvas = false; }}
				    	on:click={() => {
				    		if (pickingmode) {
				    			pickingmode = false;
		  						instance.setOptions({ disablePan: false });
				    			hex = chosenColor;
				    		}
				    	}}
				    >
						<Layer {render} />
					</Canvas>
				</div>
			</div>
		{/if}

		{#if !fileSelected && !loading}
			<Dropfield legacy={settings.theme} />
		{/if}

		<Actions />
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
			    width: unset !important;
			    height: unset !important;
			    object-fit: contain;
			    align-self: center;
			    z-index:9999 !important;
			    pointer-events:all !important;
			    cursor: grab;
			}

			&.pickingmode :global(canvas) {
				cursor: none;
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

	@media only screen and (max-width: 300px) {
		.backdrop {
			&-left {
				left: 0;
				top: 0;
				bottom: 0;
				width: 17px;
			}
		}
	}
</style>
