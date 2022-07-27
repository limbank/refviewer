<script>
	const { ipcRenderer } = require('electron');
	import { fade } from 'svelte/transition';
    import { notifications } from "../scripts/notifications.js";

	ipcRenderer.on('action', (event, arg) => {
		notifications.default(arg, 2000);
	});
</script>

<div class="actions">
    {#each $notifications as notification (notification.id)}
        <div
        	class="actions-item"
            transition:fade
        >
            {notification.message}
        </div>
    {/each}
</div>

<style lang="scss">
	.actions {
		position: absolute;
		pointer-events: none;
		z-index: 99;
		right: 15px;
		top: 0;
		bottom: 15px;
		color: white;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: flex-end;

		&-item {
			font-size: 12px;
			border-radius: 3px;
			background: #171719;
			color: #B7B9BC;
			padding: 4px 8px;
			margin: 5px 0 0;
		}
	}
</style>