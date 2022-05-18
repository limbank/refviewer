<script>
</script>

<div class="dropfield">
	<div class="dropzone-inner-wrapper">
		<div class="dropzone-inner">
			<div class="dropzone-inner-icon">
				<i class="fas fa-upload"></i>
			</div>
			<div class="dropzone-inner-text">
				Drag a file or<br>click to select
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.dropfield {
		flex-grow:1;
	}

	.dropzone-inner {
		border:2px dashed #3A3940;
		box-sizing: border-box;
		border-radius: 3px;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		color: #3A3940;
		user-select: none;

		&-icon {
			font-size: 35px;
			margin-bottom: 10px;
		}

		&-text {
			font-size: 18px;
			font-weight: bold;
			text-align: center;
		}

		&-wrapper {
			padding: 10px;
			width: 100%;
			height: 100%;
			display: flex;
			justify-content: center;
			align-items: center;
			box-sizing: border-box;
		}
	}
</style>
