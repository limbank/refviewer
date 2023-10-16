<script>
	const { ipcRenderer } = require('electron');
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';
	const tinycolor = require("tinycolor2");

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;
	let locked = false;
	let bootFlagH = false;
	let bootFlagW = false;
	let imageWidth;
	let imageHeight;
	let firstWidth;
	let firstHeight;
	let aspectRatio = 0;

	export let closeDropdowns = false;
	export let fileSelected = false;
	export let tips = false;
	export let legacy = false;

	ipcRenderer.on('imagesize', (event, arg) => {
		imageHeight = arg.h;
		imageWidth = arg.w;
		firstHeight = arg.h;
		firstWidth = arg.w;
	});

	function resizeImage() {
		ipcRenderer.send('editImage', {
			type: 'resizeImage',
			image: fileSelected,
			args: {
				w: imageWidth,
				h: imageHeight,
				r: locked
			}
		});
	}

	function getRatio() {
		aspectRatio = imageWidth / imageHeight;
	}

	function setRatio(side) {
		console.log("Setting ratio");
		switch(side) {
			case "w" :
				imageWidth = Math.round(imageHeight * aspectRatio);
				break;
			case "h" :
				imageHeight = Math.round(imageWidth / aspectRatio);
				break;
			default :
				break;
		}
	}

	function wInput() {
		if (locked) {
			setRatio("h");
		}
	}

	function hInput() {
		if (locked) {
			setRatio("w");
		}
	}

	function resizeUndo() {
		imageWidth = firstWidth;
		imageHeight = firstHeight;
		getRatio();
	}
	
	$: if (closeDropdowns) showDropdown = false;

	$: if (locked) {
		getRatio();
	}
</script>

<Button
	{tips}
	{legacy}
	size="12px"
	tiptext={"Resize image"}
	on:click={e => {
		ipcRenderer.send('editImage', {
			type: 'getSize',
			image: fileSelected
		});

		showDropdown = true;
	}}
>	
	<i class="fas fa-expand-arrows" use:dropdownRef></i>
</Button>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<div class="resize">
			<div class="resize-inner">
				<div class="resize-icons">
					<span class="resize-icons-topcorner"></span>
					<button class="aspectratio resize-button" class:locked on:click={() => locked = !locked}>
						<i class="fas fa-link"></i>
					</button>
					<span class="resize-icons-bottomcorner"></span>
				</div>
				<div class="resize-options">
					<div class="resize-option">
						<span class="resize-option-title">Width:</span>
						<input class="resize-option-input" type="number" bind:value={imageWidth} on:input={wInput} />
					</div>
					<div class="resize-option">
						<span class="resize-option-title">Height:</span>
						<input class="resize-option-input" type="number" bind:value={imageHeight} on:input={hInput} />
					</div>
				</div>
			</div>
			<div class="resize-button">
				<button class="button" on:click={resizeUndo}>
					<i class="fas fa-undo"></i>
				</button>
				<button class="button fit-button" on:click={resizeImage}>Resize</button>
			</div>
		</div>
	</Dropdown>
{/if}

<style lang="scss">
	.resize {
		padding: 10px;

		&-button {
			width: 100%;
			display: flex;
			justify-content: flex-end;
		}

		&-inner {
			display: flex;
			margin-bottom: 10px;
		}

		&-icons {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;

			&-topcorner,
			&-bottomcorner {
				display: inline-block;
				border-style: solid;
				border-color: #3A3940;
				border-right: 2px;
				width: 15px;
				height: 5px;
				transform: translateX(9px);
			}

			&-topcorner {
				border-bottom: 2px;
				border-top-left-radius: 3px;
			}

			&-bottomcorner {
				border-top: 2px;
				border-bottom-left-radius: 3px;
			}
		}

		&-options {
			padding: 0 0 0 15px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}

		&-option {
			display: flex;
			width: 100%;
			justify-content: space-between;
			margin-bottom: 18px;
			display: inline-flex;
			height: 25px;

			&:last-child {
				margin-bottom: 0;
			}

			&-title {
				font-size: 12px;
				color: #B7B9BC;
				font-weight: 500;
				display: inline-flex;
				align-items: center;
				margin-right: 6px;
			}

			&-input {
				display: inline-flex;
				font-size: 12px;
				font-weight: 500;
				align-items: center;
				background-color: #2F2E33;
				color: #B7B9BC;
				border-radius: 3px;
				border: 0px;
    			width: 60px;
    			border: 1px solid transparent;
    			padding: 2px 5px;
    			box-sizing: border-box;

    			&:focus {
				    box-shadow: none;
				    outline: none;
				    border-color: #FAA916;
				}

				&::-webkit-outer-spin-button,
				&::-webkit-inner-spin-button {
				  -webkit-appearance: none;
				  margin: 0;
				}

			}
		}
	}	

	.aspectratio {
		box-sizing: border-box;
		color: #171719;
		background: #3A3940;
		border-radius: 3px;
		border: 1px solid transparent;
		margin: 5px 0;
		padding: 2px 0 0;
		height: 20px;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 20px;
		transition: color 0.1s ease-out;
		-webkit-app-region: no-drag;
		font-size: 13px;

		&.locked {
			border-color: #FAA916;
			color: #B7B9BC;
		}

		i {
			transform: translateY(-1px);
		}

		&:focus {
			box-shadow: none;
			outline: none;
			border: 1px solid #FAA916;
		}

		&:first-child {
			margin-top: 0px;
		}

		&:last-child {
			margin-bottom: 0px;
		}

		&:hover {
			background: #FAA916;
			color: #171719;
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
	    margin-left: 5px;

	    &.fit-button {
	    	min-width: 60px;
	    }

	    &:hover {
  			background-color: #FAA916;
  			color: #171719;
	    }
	}
</style>