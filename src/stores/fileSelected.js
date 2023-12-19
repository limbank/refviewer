import { writable } from 'svelte/store';

const store = () => {
  let state = false;

  const { subscribe, set, update } = writable(state);

  return {
    subscribe,
    set
  };
}

export default store()