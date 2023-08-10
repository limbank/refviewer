<script>
	export let instance;
	export let zoomscale = 0.1;

	let elementHeight = 0;

	$: if (zoomscale !== undefined && instance !== undefined) {
		instance.zoom(zoomscale, { animate: true });
	}
</script>

	<div
		class="zoomslider"
		bind:clientHeight={elementHeight}
	>
		<input
			type="range"
			orient="vertical"
			min="0.1"
			max="20"
			step="0.1"
			bind:value={zoomscale}
			style="
				width:{elementHeight}px;
			"
		/>
	</div>

<style lang="scss">
	.zoomslider {
		position: fixed;
		z-index: 2;
		cursor: pointer;
		top: 65px;
		right: 10px;
		bottom: 15px;
		width: 16px;

		input[type=range] {
			position: absolute;
			-webkit-appearance: none;
			transform-origin: top left;
			-webkit-transform:rotate(-90deg);
			position: absolute;
			bottom: -8px;
			left: 4px;
			height: 8px;
			margin: 0 0;
			background: transparent;

			&:focus {
				outline: none;

				&::-webkit-slider-runnable-track {
					background: #3A3940;
				}
			}

			&::-webkit-slider-runnable-track {
				width: 100%;
				height: 6px;
				cursor: pointer;
				background: #3A3940;
				border-radius: 3px;
				-webkit-appearance: none;
				margin: 5px 0;
			}

			&::-webkit-slider-thumb {
				height: 16px;
				width: 10px;
				border-radius: 3px;
				background: #171719;
				cursor: pointer;
				-webkit-appearance: none;
				margin: -5px 0 0;
			}
		}
	}
</style>
