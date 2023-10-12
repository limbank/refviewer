<script>
	const { ipcRenderer } = require('electron');

	import ColorPicker from 'svelte-awesome-color-picker';
	import tinycolor from 'tinycolor2';
	import Control from '../common/Control.svelte';

	export let legacy = false;
	export let tips = false;
	export let hashsign = true;
	export let reset;
	export let alpha = true;

	let hexIntermediate;

	$: if (hexIntermediate) {
		hex = hexIntermediate;
	}
	
	function hexInput() {
		if (tinycolor(hex).isValid()) hexIntermediate = hex;
	}

	function copyClick() {
		let tempHex = hex;

		if (hashsign && tempHex.startsWith("#")) tempHex = tempHex.substring(1);

		navigator.clipboard.writeText(tempHex).then(() => {
		    ipcRenderer.send('action', "Color copied!");
		}, () => {
		    ipcRenderer.send('action', "Failed to copy color");
		});
	}

	export let hex;
	export let rgb = tinycolor(hex).toRgb();
</script>

<div class="picker-wrapper">
	<ColorPicker bind:rgb bind:hex={hexIntermediate} isOpen isInput={false} isAlpha={alpha} isTextInput={false} />
	<div class="picker-split">
		<div class="picker-controls">
			<div class="picker-controls-row">
				<label>
					<span>R:</span>
					<input placeholder="R" type="number" bind:value={rgb.r}>
				</label>
				<label>
					<span>G:</span>
					<input placeholder="G" type="number" bind:value={rgb.g}>
				</label>
				<label>
					<span>B:</span>
					<input placeholder="B" type="number" bind:value={rgb.b}>
				</label>
				{#if alpha}
					<label>
						<span>A:</span>
						<input placeholder="A" type="number" bind:value={rgb.a}>
					</label>
				{/if}
			</div>
			<div class="picker-controls-row">
				<label>
					<span>HEX:</span>
					<input placeholder="Hex" type="text" bind:value={hex} on:input={hexInput}>
					<Control
						{tips}
						{legacy}
						size="12px"
						tiptext="Copy"
						on:click={copyClick}
					>
						<i class="far fa-clipboard" style="transform: translateY(-1px);"></i>
					</Control>
					{#if reset}
						<Control
							{tips}
							{legacy}
							size="12px"
							tiptext="Reset"
							on:click={e => {
								hex = reset;
							}}
						>
							<i class="fas fa-redo"></i>
						</Control>
					{/if}
				</label>
			</div>
		</div>
	</div>
</div>

<style lang="scss" global>
	.picker {
		&-wrapper {
			--picker-height: 150px;
			--picker-width: 150px;
			--slider-width: 15px;

			user-select: none;

			background: #171719;
			display: flex;
			flex-direction: column;
			border-radius: 3px;
		    box-sizing: border-box;

			.wrapper.isOpen {
				margin: 0;
				background: transparent;
				border: 0px;
				padding: 12px 12px 6px;
				position: static;
			    box-sizing: border-box;

				.slider>div, .alpha>div {
					width: 25px;
				}
			}
		}

	    &-split {
	    	display: flex;
			padding: 0 12px 12px;
			box-sizing: border-box;
			width: 100%;
			overflow: hidden;
	    }

		&-controls {
			display: flex;
			flex-grow: 1;
			flex-direction: column;
		    box-sizing: border-box;

			&-row {
				display: flex;
				margin-bottom: 5px;
				justify-content: space-between;

				&:last-child {
					margin-bottom: 0;
				}
			}

			label {
				display: inline-flex;
				flex-grow: 1;
				width: 100%;
				margin: 0 3px 0;

				&:first-child {
					margin-left: -3px;
				}

				&:last-child {
					margin-right: 0;
				}

			    span {
					display: inline-flex;
					color: #B7B9BC;
					font-weight: 600;
				    font-size: 11px;
				    padding: 2px 3px;
				    margin-right: 2px;
			    	box-sizing: border-box;
				    height: 20px;
				    flex-shrink: 0;
			    }

				input {
					width: 60px;
				    background-color: #2F2E33;
				    color: #B7B9BC;
				    font-size: 11px;
				    border-radius: 3px;
				    height: 20px;
				    padding: 3px 3px;
				    box-sizing: border-box;
				    font-weight: 500;
				    text-align: center;
				    border: 0;
					width: 30px;
			    	flex-grow: 1;

			    	&::-webkit-outer-spin-button,
					&::-webkit-inner-spin-button {
					  	-webkit-appearance: none;
					  	margin: 0;
					}


					&:focus {
						outline: none;
					}
				}
			}
		}
	}
</style>