<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Tool from './Tool.svelte';
	import Dropdown from './Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	export let backdropColor = "#000000";

	let showDropdown = false;

	export let tips = false;
	export let legacy = false;
</script>

<Tool
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Change background"}
	on:click={e => {
		showDropdown = true;
		//dispatch('pickColor');
	}}
>
	<i class="fas fa-fill" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<Colorpicker
			bind:hex={backdropColor}
			reset="#2F2E33"
			legacy={legacy}
			tips={tips} />
	</Dropdown>
{/if}

<style lang="scss">
</style>