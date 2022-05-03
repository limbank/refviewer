<script>
</script>

<div class="toolbox">
	<button class="control control-screenshot">
    	<i class="fas fa-crosshairs"></i>
	</button>
	<button class="control control-">
    	<i class="far fa-save"></i>
	</button>
	<button class="control control-">
    	<i class="far fa-clipboard"></i>
	</button>
	<button class="control control-">
    	<i class="fas fa-sync-alt"></i>
	</button>
	<button class="control control-">
    	<i class="fas fa-redo"></i>
	</button>
	<button class="control control-">
    	<i class="fas fa-eye-dropper"></i>
	</button>
	<button class="control control-">
    	<i class="fas fa-fill"></i>
	</button>
	<button class="control control-">
    	<i class="fas fa-palette"></i>
	</button>
</div>

<style lang="scss">
	.toolbox {
		width: 35px;
		min-width: 35px;
		flex-shrink: 0;
		box-sizing: border-box;
		margin-top: -1px;
	}

	.control {
		box-sizing: border-box;
		color: #171719;
		background: #3A3940;
		border-radius: 3px;
		border: 0;
		margin: 0;
		padding: 2px 0 0;
		height: 20px;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		transition: color 0.1s ease-out;
		margin-bottom: 5px;
		font-size: 14px;

		&:first-child {
			margin-top: 0px;
		}

		&:last-child {
			margin-bottom: 0px;
		}

		&:hover {
			background: #FAA916;
		}

		/*
		&-close {
			&:hover {
				background: #F75825;
			}
		}*/
	}
</style>
