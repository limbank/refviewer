<script>
	export let instance;
	export let zoomscale;
</script>

{#if zoomscale != 1}
	<div
		class="zoomscale"
    	on:click={() => {
    		instance.zoom(1, { animate: false });
    		instance.pan(0, 0);
    	}}
	>x{zoomscale}</div>
{/if}

<style lang="scss">
	.zoomscale {
		position: fixed;
		z-index: 999;
		cursor: pointer;
		border-radius:5px;
		background: #171719;
		color: #3A3940;
		font-weight: 600;
		font-size: 10px;
		top: 35px;
		right: 10px;
		text-align: center;
		padding: 3px 5px;
	}
</style>
