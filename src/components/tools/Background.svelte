<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	export let backdropColor = legacy ? "#111111" : "#2F2E33";

	let showDropdown = false;

	export let closeDropdowns = false;
	export let tips = false;
	export let hashsign = true;
	export let legacy = false;
	$: if (closeDropdowns) showDropdown = false;
</script>

<Button
	{tips}
	{legacy}
	size="12px"
	tiptext={"Change background"}
	on:click={e => {
		showDropdown = true;
	}}
>
	<i class="fas fa-fill" use:dropdownRef></i>
</Button>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<Colorpicker
			{tips}
			{legacy}
			{hashsign}
			bind:hex={backdropColor}
			reset={legacy ? "#111111" : "#2F2E33"}
		/>
	</Dropdown>
{/if}

<style lang="scss">
</style>