<script>
	export let bg;
	export let x;
	export let y;
</script>

<div class="cursor" style="top:{y}px;left:{x}px;">
	<div class="cursor-backdrop">
		<div class="cursor-pointer"></div>
		<div class="cursor-color"></div>
	</div>
	<div class="cursor-content">
		<div class="cursor-pointer"></div>
		<div class="cursor-color" style="background:{bg};"></div>
	</div>
</div>

<style lang="scss">
	.cursor {
		position: fixed;
		z-index: 999;
		pointer-events: none;

		&-pointer {
			width: 8px;
			height: 8px;
			position: absolute;
			z-index: 1;
			background: #171719;
		}

		&-color {
			display: inline-flex;
			position: absolute;
			left: 0;
			top: 0;
			z-index: 2;
			box-sizing: border-box;
			border: 3px solid #171719;
			width: 16px;
			height: 16px;
			border-radius: 8px;
		}

		&-backdrop {
			position: absolute;
			z-index: 1;

			.cursor-pointer {
				background:	#FAA916;
				border-color: #FAA916;
				width: 9px;
				height: 9px;
			}

			.cursor-color {
				background:	#FAA916;
				border-color: #FAA916;
				width: 18px;
				height: 18px;
				border-radius: 9px;
			}
		}

		&-content {
			position: absolute;
			z-index: 2;
			left: 1px;
			top: 1px;
		}
	}
</style>
