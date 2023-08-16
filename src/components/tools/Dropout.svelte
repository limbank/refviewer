<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Tool from '../common/Tool.svelte';
	import Dropdown from '../common/Dropdown.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;

	export let icon;
	export let closeDropdowns = false;
	export let tips = false;
	export let legacy = false;
	$: if (closeDropdowns) showDropdown = false;
</script>

<Tool
	{tips}
	{legacy}
	size="12px"
	tiptext={"Image effects"}
	on:click={e => {
		showDropdown = true;
		setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
	}}
>
	<i class={icon} use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<div class="dropout">
			<slot></slot>
		</div>
	</Dropdown>
{/if}

<style lang="scss">
	.dropout {
		display: flex;
		flex-direction: column;
		padding: 5px 5px 0 5px;

		:global(.control) {
			&:last-child {
				margin-bottom: 5px;
			}
		}
	}
</style>