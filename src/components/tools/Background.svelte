<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import { tt, locale, locales } from "../../stores/i18n.js";
	import settings from '../../stores/settings.js';
	import backdrop from '../../stores/backdrop.js';

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;

	function getBackcolor() {
		return getComputedStyle(document.getElementsByTagName("main")[0])
    		.getPropertyValue('--secondary-bg-color') || "#2F2E33";
	}

	export let closeDropdowns = false;
	$: if (closeDropdowns) showDropdown = false;
</script>

<Button
	tiptext={$tt("toolbar.background")}
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
			bind:hex={$backdrop}
			reset={getBackcolor()}
		/>
	</Dropdown>
{/if}

<style lang="scss">
</style>