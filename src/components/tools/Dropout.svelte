<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import { tt, locale, locales } from "../stores/i18n.js";

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;

	export let icon;
	export let closeDropdowns = false;
	
	$: if (closeDropdowns) showDropdown = false;
</script>

<Button
	tiptext={$tt("dropout.extrasa")}
	on:click={e => {
		showDropdown = true;
		setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
	}}
>
	<i class={icon} use:dropdownRef></i>
</Button>

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