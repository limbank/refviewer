<script></script>

<div class="backdrop">
	<div class="backdrop-bg backdrop-top"></div>
	<div class="backdrop-bg backdrop-right"></div>
	<div class="backdrop-bg backdrop-bottom"></div>
	<div class="backdrop-bg backdrop-left"></div>
</div>

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

		&-bg {
			background: #111111;
			position: absolute;
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