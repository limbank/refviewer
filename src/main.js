import App from './App.svelte';
import { VERSION } from 'svelte/compiler';

import './addons.scss';

const app = new App({
    target: document.body,
    props: {
        version: VERSION,
    },
});

export default app;
