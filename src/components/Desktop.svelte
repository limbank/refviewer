<script>
	export let legacy = false;
</script>

<div class="desktop" class:legacy={legacy} on:dragover on:drop>
	<slot ></slot>
</div>

<style lang="scss">
	.desktop {
		/*#2F2E33*/
		background: rgba(47, 46, 51, 1);
		flex-grow: 1;
		border-radius: 3px;
		display: flex;
		overflow: hidden;
		position: relative;

		&.legacy {
			background: #111111;
		}
	}
</style>
