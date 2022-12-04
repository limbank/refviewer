<script>
	const { ipcRenderer } = require('electron');

	export let settings = { zoom: 0.3 };

	let timeout;

	$: {
		clearTimeout(timeout);
		timeout = setTimeout(()=> {
        	ipcRenderer.send('settings:write', settings);
		}, 500);
    }

    let resetConfirmed = false;
    let resetText = "Reset";

    function handleReset() {
    	if (!resetConfirmed) {
    		resetText = "Are you sure?";
    		resetConfirmed = true;
    		return;
    	}

    	//settings = { zoom: 0.3 };

    	settings.zoom = 0.3;
    	settings.overwrite = false;
    	settings.theme = false;
    	settings.tooltips = false;
    	settings.transparency = false;
    	settings.autosave = false;
    	settings.savedir = false;

    	resetConfirmed = false;
    	resetText = "Reset";
    }

    ipcRenderer.on('getDirectory', (event, arg) => {
    	settings.savedir = arg;
	});
</script>

<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Zoom amount
		</div>
		<div class="setting-control">
			<span class="setting-control-info">{settings.zoom}</span>
		</div>
		<div class="setting-control-large">
			<input type="range" bind:value={settings.zoom} step="0.1" max="1" min="0.1">
		</div>
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Allow overwrite
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.overwrite}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
	<div class="setting-description">
		Allow selecting a new image while another image is loaded.
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Legacy theme
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.theme}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Disable tooltips
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.tooltips}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Ignore transparency
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.transparency}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
	<div class="setting-description">
		Make the image ignore background transparency and stay opaque.
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Auto-save screenshots
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.autosave}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
</div>
<div class="setting" class:disabled={!settings.autosave}>
	<div class="setting-inner">
		<div class="setting-title">
			Auto-save directory
		</div>
		<div class="setting-control">
			<input type="hidden" bind:value={settings.savedir}>
			<button class="button" on:click={() => ipcRenderer.send('select:saveDirectory')}>
				{settings.savedir ? "Change" : "Browse"}
			</button>
		</div>
	</div>
	<div class="setting-description">
		Choose the directory where to save screenshots
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Reset settings
		</div>
		<div class="setting-control">
			<button class="button" on:click={handleReset}>{resetText}</button>
		</div>
	</div>
	<div class="setting-description">
		Reset the settings back to their defaults
	</div>
</div>

<!--
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Legacy file select
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.select}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
	<div class="setting-description">
		Enable a separate button for clicking to select a file
	</div>
</div>
<div class="setting">
	<div class="setting-inner">
		<div class="setting-title">
			Developer mode
		</div>
		<div class="setting-control">
			<label class="switch">
				<input type="checkbox" bind:checked={settings.devmode}>
				<span class="slider"></span>
			</label>
		</div>
	</div>
</div>-->

<style lang="scss">
	.setting {
		border-bottom: 1px solid #2F2E33;
		padding: 8px 0 14px;
		margin-bottom: 5px;

		&.disabled {
			opacity: 0.5;
			pointer-events: none;
		}

		&-inner {
			display: flex;
			justify-content: space-between;
			align-items: center;
			flex-wrap: wrap;
		}

		&-title {
			font-size: 14px;
			color: #B7B9BC;
			font-weight: 500;
			display: inline-flex;
			align-items: center;
		}

		&-description {
			font-size: 11px;
			color: #B7B9BC;
			padding: 10px 0 0;
		}

		&-control {
			display: inline-flex;
			align-items: center;

			&-large {
				display: flex;
				width: 100%;
				align-items: center;
				box-sizing: border-box;
				padding: 10px 0 0;
			}

			&-info {
				display: inline-flex;
				min-height: 20px;
				min-width: 30px;
				font-size: 12px;
				font-weight: 500;
				text-align: center;
				align-items: center;
				justify-content: center;
				background-color: #2F2E33;
				color: #B7B9BC;
				border-radius: 3px;
			}
		}
	}

	.button {
		min-height: 25px;
		border-radius: 3px;
		background-color: #2F2E33;
		cursor: pointer;
		border: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 5px 10px;
	    color: #B7B9BC;
	    font-size: 12px;
	    font-weight: 600;

	    &:hover {
  			background-color: #FAA916;
  			color: #171719;
	    }
	}

	.switch {
		position: relative;
		overflow: hidden;
		display: inline-block;
		width: 30px;
		height: 20px;

		input { 
			opacity: 0;
			width: 0;
			height: 0;
			position: absolute;
			left: -1;
			top: -1;
			pointer-events: none;

			&:checked + .slider {
	  			background-color: #FAA916;
			}

			&:checked + .slider:before {
				transform: translateX(16px);
			}
		}

		.slider {
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: #2F2E33;
			transition: .2s;
			border-radius: 3px;

			&:before {
				position: absolute;
				content: "";
				height: 16px;
				width: 10px;
				left: 2px;
				bottom: 2px;
				background-color: #171719;
				transition: .2s;
				border-radius: 3px;
			}
		}
	}

	input[type=range] {
		-webkit-appearance: none;
		margin: 0 0;
		width: 100%;
		background: transparent;
	}

	input[type=range]:focus {
		outline: none;
	}

	input[type=range]::-webkit-slider-runnable-track {
		width: 100%;
		height: 6px;
		cursor: pointer;
		background: #2F2E33;
		border-radius: 3px;
		margin: 5px 0;
	}

	input[type=range]:focus::-webkit-slider-runnable-track {
		background: #2F2E33;
	}

	input[type=range]::-webkit-slider-thumb {
		height: 16px;
		width: 10px;
		border-radius: 3px;
		background: #171719;
		cursor: pointer;
		-webkit-appearance: none;
		margin: -5px 0 0;
	}
</style>
