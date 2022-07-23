<script>
	const { ipcRenderer } = require('electron');
	import { fade } from 'svelte/transition';

	let actions = [];
	let id = 0;

	ipcRenderer.on('action', (event, arg) => {
		/*
		let idname = "action" + id;
		actions[idname] = arg;

		setTimeout(() => {
			delete actions[idname];

			actions = actions;
		}, 3000);

		id++;*/
		//Object.entries(actions) as [actions_name, actions_number]

		actions = [...actions, arg + id];
		id++;
		
		setTimeout(() => {
			if (actions.length > 1) actions = actions.splice(1, actions.length);
			else actions = [];
		}, 3000);
	});
</script>

<div class="actions">
	{#each actions as action}
		<div class="actions-item" in:fade out:fade>
			{action}
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
			color: #2F2E33;
			padding: 2px 6px;
			margin: 5px 0 0;
		}
	}
</style>