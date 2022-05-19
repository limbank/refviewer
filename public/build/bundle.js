
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Titlebar.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\components\\Titlebar.svelte";

    // (28:3) {:else}
    function create_else_block$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-bars");
    			add_location(i, file$6, 28, 7, 712);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(28:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:3) {#if settingsOpen}
    function create_if_block_4(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file$6, 26, 7, 663);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(26:3) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (32:2) {#if !settingsOpen}
    function create_if_block_1$2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = (!/*fileSelected*/ ctx[1] || /*overwrite*/ ctx[3]) && create_if_block_3$1(ctx);
    	let if_block1 = /*fileSelected*/ ctx[1] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*fileSelected*/ ctx[1] || /*overwrite*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*fileSelected*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(32:2) {#if !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (33:3) {#if !fileSelected || overwrite}
    function create_if_block_3$1(ctx) {
    	let button0;
    	let i0;
    	let t;
    	let button1;
    	let i1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			i0 = element("i");
    			t = space();
    			button1 = element("button");
    			i1 = element("i");
    			attr_dev(i0, "class", "fas fa-upload");
    			add_location(i0, file$6, 34, 8, 929);
    			attr_dev(button0, "class", "control control-upload svelte-1lk69pn");
    			add_location(button0, file$6, 33, 4, 828);
    			attr_dev(i1, "class", "fas fa-crosshairs");
    			add_location(i1, file$6, 37, 8, 1032);
    			attr_dev(button1, "class", "control control-screenshot svelte-1lk69pn");
    			add_location(button1, file$6, 36, 4, 979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, i0);
    			insert_dev(target, t, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, i1);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", /*click_handler_1*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(33:3) {#if !fileSelected || overwrite}",
    		ctx
    	});

    	return block;
    }

    // (41:3) {#if fileSelected}
    function create_if_block_2$1(ctx) {
    	let button;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			attr_dev(i, "class", "fas fa-trash");
    			add_location(i, file$6, 42, 8, 1206);
    			attr_dev(button, "class", "control control-clear svelte-1lk69pn");
    			add_location(button, file$6, 41, 4, 1119);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(41:3) {#if fileSelected}",
    		ctx
    	});

    	return block;
    }

    // (49:2) {#if version}
    function create_if_block$4(ctx) {
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("v. ");
    			t1 = text(/*version*/ ctx[4]);
    			attr_dev(span, "class", "version svelte-1lk69pn");
    			add_location(span, file$6, 49, 3, 1330);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*version*/ 16) set_data_dev(t1, /*version*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(49:2) {#if version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let button1;
    	let i0;
    	let t3;
    	let button2;
    	let i1;
    	let t4;
    	let button3;
    	let i2;
    	let t5;
    	let button4;
    	let i3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*settingsOpen*/ ctx[0]) return create_if_block_4;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*settingsOpen*/ ctx[0] && create_if_block_1$2(ctx);
    	let if_block2 = /*version*/ ctx[4] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			t2 = space();
    			button1 = element("button");
    			i0 = element("i");
    			t3 = space();
    			button2 = element("button");
    			i1 = element("i");
    			t4 = space();
    			button3 = element("button");
    			i2 = element("i");
    			t5 = space();
    			button4 = element("button");
    			i3 = element("i");
    			attr_dev(button0, "class", "control control-menu svelte-1lk69pn");
    			add_location(button0, file$6, 21, 2, 493);
    			attr_dev(div0, "class", "titlebar-group svelte-1lk69pn");
    			add_location(div0, file$6, 20, 1, 461);
    			attr_dev(i0, "class", "fas fa-thumbtack svelte-1lk69pn");
    			add_location(i0, file$6, 52, 6, 1496);
    			attr_dev(button1, "class", "control control-pin svelte-1lk69pn");
    			toggle_class(button1, "pinned", /*pinned*/ ctx[5]);
    			add_location(button1, file$6, 51, 2, 1384);
    			attr_dev(i1, "class", "fas fa-minus");
    			add_location(i1, file$6, 55, 6, 1654);
    			attr_dev(button2, "class", "control control-minimize svelte-1lk69pn");
    			add_location(button2, file$6, 54, 2, 1545);
    			attr_dev(i2, "class", "fas fa-plus");
    			add_location(i2, file$6, 58, 6, 1807);
    			attr_dev(button3, "class", "control control-restore svelte-1lk69pn");
    			add_location(button3, file$6, 57, 2, 1699);
    			attr_dev(i3, "class", "fas fa-times");
    			add_location(i3, file$6, 61, 6, 1954);
    			attr_dev(button4, "class", "control control-close svelte-1lk69pn");
    			add_location(button4, file$6, 60, 2, 1851);
    			attr_dev(div1, "class", "titlebar-group svelte-1lk69pn");
    			add_location(div1, file$6, 47, 1, 1280);
    			attr_dev(div2, "class", "titlebar svelte-1lk69pn");
    			toggle_class(div2, "legacy", /*legacy*/ ctx[2]);
    			add_location(div2, file$6, 19, 0, 414);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			if_block0.m(button0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(button1, i0);
    			append_dev(div1, t3);
    			append_dev(div1, button2);
    			append_dev(button2, i1);
    			append_dev(div1, t4);
    			append_dev(div1, button3);
    			append_dev(button3, i2);
    			append_dev(div1, t5);
    			append_dev(div1, button4);
    			append_dev(button4, i3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*click_handler_3*/ ctx[11], false, false, false),
    					listen_dev(button2, "click", /*click_handler_4*/ ctx[12], false, false, false),
    					listen_dev(button3, "click", /*click_handler_5*/ ctx[13], false, false, false),
    					listen_dev(button4, "click", /*click_handler_6*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button0, null);
    				}
    			}

    			if (!/*settingsOpen*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*version*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$4(ctx);
    					if_block2.c();
    					if_block2.m(div1, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*pinned*/ 32) {
    				toggle_class(button1, "pinned", /*pinned*/ ctx[5]);
    			}

    			if (dirty & /*legacy*/ 4) {
    				toggle_class(div2, "legacy", /*legacy*/ ctx[2]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Titlebar", slots, []);
    	const { ipcRenderer } = require("electron");
    	const dispatch = createEventDispatcher();
    	let { fileSelected = false } = $$props;
    	let { settingsOpen = false } = $$props;
    	let { legacy = false } = $$props;
    	let { overwrite = false } = $$props;
    	let { version } = $$props;
    	let pinned = false;

    	ipcRenderer.on("pin", (event, arg) => {
    		$$invalidate(5, pinned = arg);
    	});

    	const writable_props = ["fileSelected", "settingsOpen", "legacy", "overwrite", "version"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Titlebar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(0, settingsOpen = !settingsOpen);
    		dispatch("settingsOpen", settingsOpen);
    	};

    	const click_handler_1 = e => {
    		ipcRenderer.send("selectfile");
    	};

    	const click_handler_2 = e => {
    		dispatch("clear");
    	};

    	const click_handler_3 = e => {
    		ipcRenderer.send("window", "pin");
    	};

    	const click_handler_4 = e => {
    		ipcRenderer.send("window", "minimize");
    	};

    	const click_handler_5 = e => {
    		ipcRenderer.send("window", "maximize");
    	};

    	const click_handler_6 = e => {
    		ipcRenderer.send("window", "close");
    	};

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("overwrite" in $$props) $$invalidate(3, overwrite = $$props.overwrite);
    		if ("version" in $$props) $$invalidate(4, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		ipcRenderer,
    		dispatch,
    		fileSelected,
    		settingsOpen,
    		legacy,
    		overwrite,
    		version,
    		pinned
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("overwrite" in $$props) $$invalidate(3, overwrite = $$props.overwrite);
    		if ("version" in $$props) $$invalidate(4, version = $$props.version);
    		if ("pinned" in $$props) $$invalidate(5, pinned = $$props.pinned);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		settingsOpen,
    		fileSelected,
    		legacy,
    		overwrite,
    		version,
    		pinned,
    		ipcRenderer,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class Titlebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$7, safe_not_equal, {
    			fileSelected: 1,
    			settingsOpen: 0,
    			legacy: 2,
    			overwrite: 3,
    			version: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Titlebar",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[4] === undefined && !("version" in props)) {
    			console.warn("<Titlebar> was created without expected prop 'version'");
    		}
    	}

    	get fileSelected() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fileSelected(value) {
    		throw new Error("<Titlebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get settingsOpen() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settingsOpen(value) {
    		throw new Error("<Titlebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Titlebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get overwrite() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set overwrite(value) {
    		throw new Error("<Titlebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<Titlebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Desktop.svelte generated by Svelte v3.38.3 */

    const file$5 = "src\\components\\Desktop.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "desktop svelte-1o7d29u");
    			toggle_class(div, "legacy", /*legacy*/ ctx[0]);
    			add_location(div, file$5, 4, 0, 52);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "dragover", /*dragover_handler*/ ctx[3], false, false, false),
    					listen_dev(div, "drop", /*drop_handler*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*legacy*/ 1) {
    				toggle_class(div, "legacy", /*legacy*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Desktop", slots, ['default']);
    	let { legacy = false } = $$props;
    	const writable_props = ["legacy"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Desktop> was created with unknown prop '${key}'`);
    	});

    	function dragover_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function drop_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ legacy });

    	$$self.$inject_state = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [legacy, $$scope, slots, dragover_handler, drop_handler];
    }

    class Desktop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { legacy: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Desktop",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get legacy() {
    		throw new Error("<Desktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Desktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Toolbox.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\components\\Toolbox.svelte";

    // (27:1) {#if fileSelected && !settingsOpen}
    function create_if_block$3(ctx) {
    	let button0;
    	let i0;
    	let t;
    	let button1;
    	let i1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			i0 = element("i");
    			t = space();
    			button1 = element("button");
    			i1 = element("i");
    			attr_dev(i0, "class", "far fa-save");
    			add_location(i0, file$4, 28, 6, 765);
    			attr_dev(button0, "class", "control svelte-1b6psrh");
    			add_location(button0, file$4, 27, 2, 668);
    			attr_dev(i1, "class", "far fa-clipboard");
    			add_location(i1, file$4, 31, 6, 862);
    			attr_dev(button1, "class", "control svelte-1b6psrh");
    			add_location(button1, file$4, 30, 2, 809);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, i0);
    			insert_dev(target, t, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, i1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*copyImage*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(27:1) {#if fileSelected && !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let if_block = /*fileSelected*/ ctx[0] && !/*settingsOpen*/ ctx[1] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "toolbox svelte-1b6psrh");
    			add_location(div, file$4, 25, 0, 605);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*fileSelected*/ ctx[0] && !/*settingsOpen*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Toolbox", slots, []);
    	const { ipcRenderer } = require("electron");
    	let { fileSelected = false } = $$props;
    	let { settingsOpen = false } = $$props;

    	function copyImage() {
    		var xhr = new XMLHttpRequest();

    		xhr.onload = () => {
    			try {
    				var response = xhr.response.slice(0, xhr.response.size, "image/png");
    				const item = new ClipboardItem({ "image/png": response });
    				navigator.clipboard.write([item]);
    				this.notify("Image copied!");
    			} catch(e) {
    				console.log(e);
    			}
    		};

    		xhr.open("GET", fileSelected);
    		xhr.responseType = "blob";
    		xhr.send();
    	} //NOTIFY THE USER!!

    	const writable_props = ["fileSelected", "settingsOpen"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Toolbox> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		ipcRenderer.send("saveImage", fileSelected);
    	};

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(1, settingsOpen = $$props.settingsOpen);
    	};

    	$$self.$capture_state = () => ({
    		ipcRenderer,
    		fileSelected,
    		settingsOpen,
    		copyImage
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(1, settingsOpen = $$props.settingsOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fileSelected, settingsOpen, ipcRenderer, copyImage, click_handler];
    }

    class Toolbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, { fileSelected: 0, settingsOpen: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toolbox",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get fileSelected() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fileSelected(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get settingsOpen() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settingsOpen(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Settings.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\components\\Settings.svelte";

    // (133:31) 
    function create_if_block_2(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let if_block = /*version*/ ctx[1] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "source.dog © 2018-2022";
    			attr_dev(div0, "class", "settings-container-text svelte-ewc32s");
    			add_location(div0, file$3, 139, 4, 3650);
    			attr_dev(div1, "class", "settings-container-inner svelte-ewc32s");
    			add_location(div1, file$3, 133, 3, 3499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, dirty) {
    			if (/*version*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(133:31) ",
    		ctx
    	});

    	return block;
    }

    // (45:34) 
    function create_if_block_1$1(ctx) {
    	let div14;
    	let div4;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let span0;
    	let t2_value = /*settings*/ ctx[0].zoom + "";
    	let t2;
    	let t3;
    	let div2;
    	let input0;
    	let t4;
    	let div9;
    	let div7;
    	let div5;
    	let t6;
    	let div6;
    	let label0;
    	let input1;
    	let t7;
    	let span1;
    	let t8;
    	let div8;
    	let t10;
    	let div13;
    	let div12;
    	let div10;
    	let t12;
    	let div11;
    	let label1;
    	let input2;
    	let t13;
    	let span2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Zoom amount";
    			t1 = space();
    			div1 = element("div");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t4 = space();
    			div9 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			div5.textContent = "Allow overwrite";
    			t6 = space();
    			div6 = element("div");
    			label0 = element("label");
    			input1 = element("input");
    			t7 = space();
    			span1 = element("span");
    			t8 = space();
    			div8 = element("div");
    			div8.textContent = "Allow selecting a new image while another image is loaded.";
    			t10 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div10 = element("div");
    			div10.textContent = "Legacy theme";
    			t12 = space();
    			div11 = element("div");
    			label1 = element("label");
    			input2 = element("input");
    			t13 = space();
    			span2 = element("span");
    			attr_dev(div0, "class", "setting-title svelte-ewc32s");
    			add_location(div0, file$3, 48, 6, 1048);
    			attr_dev(span0, "class", "setting-control-info svelte-ewc32s");
    			add_location(span0, file$3, 52, 7, 1155);
    			attr_dev(div1, "class", "setting-control svelte-ewc32s");
    			add_location(div1, file$3, 51, 6, 1117);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "step", "0.1");
    			attr_dev(input0, "max", "1");
    			attr_dev(input0, "min", "0.1");
    			attr_dev(input0, "class", "svelte-ewc32s");
    			add_location(input0, file$3, 55, 7, 1278);
    			attr_dev(div2, "class", "setting-control-large svelte-ewc32s");
    			add_location(div2, file$3, 54, 6, 1234);
    			attr_dev(div3, "class", "setting-inner svelte-ewc32s");
    			add_location(div3, file$3, 47, 5, 1013);
    			attr_dev(div4, "class", "setting svelte-ewc32s");
    			add_location(div4, file$3, 46, 4, 985);
    			attr_dev(div5, "class", "setting-title svelte-ewc32s");
    			add_location(div5, file$3, 61, 6, 1462);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-ewc32s");
    			add_location(input1, file$3, 66, 8, 1605);
    			attr_dev(span1, "class", "slider svelte-ewc32s");
    			add_location(span1, file$3, 67, 8, 1672);
    			attr_dev(label0, "class", "switch svelte-ewc32s");
    			add_location(label0, file$3, 65, 7, 1573);
    			attr_dev(div6, "class", "setting-control svelte-ewc32s");
    			add_location(div6, file$3, 64, 6, 1535);
    			attr_dev(div7, "class", "setting-inner svelte-ewc32s");
    			add_location(div7, file$3, 60, 5, 1427);
    			attr_dev(div8, "class", "setting-description svelte-ewc32s");
    			add_location(div8, file$3, 71, 5, 1751);
    			attr_dev(div9, "class", "setting svelte-ewc32s");
    			add_location(div9, file$3, 59, 4, 1399);
    			attr_dev(div10, "class", "setting-title svelte-ewc32s");
    			add_location(div10, file$3, 77, 6, 1944);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-ewc32s");
    			add_location(input2, file$3, 82, 8, 2084);
    			attr_dev(span2, "class", "slider svelte-ewc32s");
    			add_location(span2, file$3, 83, 8, 2147);
    			attr_dev(label1, "class", "switch svelte-ewc32s");
    			add_location(label1, file$3, 81, 7, 2052);
    			attr_dev(div11, "class", "setting-control svelte-ewc32s");
    			add_location(div11, file$3, 80, 6, 2014);
    			attr_dev(div12, "class", "setting-inner svelte-ewc32s");
    			add_location(div12, file$3, 76, 5, 1909);
    			attr_dev(div13, "class", "setting svelte-ewc32s");
    			add_location(div13, file$3, 75, 4, 1881);
    			attr_dev(div14, "class", "settings-container-inner svelte-ewc32s");
    			add_location(div14, file$3, 45, 3, 941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, span0);
    			append_dev(span0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*settings*/ ctx[0].zoom);
    			append_dev(div14, t4);
    			append_dev(div14, div9);
    			append_dev(div9, div7);
    			append_dev(div7, div5);
    			append_dev(div7, t6);
    			append_dev(div7, div6);
    			append_dev(div6, label0);
    			append_dev(label0, input1);
    			input1.checked = /*settings*/ ctx[0].overwrite;
    			append_dev(label0, t7);
    			append_dev(label0, span1);
    			append_dev(div9, t8);
    			append_dev(div9, div8);
    			append_dev(div14, t10);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div12, t12);
    			append_dev(div12, div11);
    			append_dev(div11, label1);
    			append_dev(label1, input2);
    			input2.checked = /*settings*/ ctx[0].theme;
    			append_dev(label1, t13);
    			append_dev(label1, span2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[8]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*settings*/ 1 && t2_value !== (t2_value = /*settings*/ ctx[0].zoom + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*settings*/ 1) {
    				set_input_value(input0, /*settings*/ ctx[0].zoom);
    			}

    			if (dirty & /*settings*/ 1) {
    				input1.checked = /*settings*/ ctx[0].overwrite;
    			}

    			if (dirty & /*settings*/ 1) {
    				input2.checked = /*settings*/ ctx[0].theme;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(45:34) ",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if setWindow=="recent"}
    function create_if_block$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("recent");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(43:2) {#if setWindow==\\\"recent\\\"}",
    		ctx
    	});

    	return block;
    }

    // (135:4) {#if version}
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("v. ");
    			t1 = text(/*version*/ ctx[1]);
    			attr_dev(div, "class", "settings-container-text svelte-ewc32s");
    			add_location(div, file$3, 135, 5, 3563);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*version*/ 2) set_data_dev(t1, /*version*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(135:4) {#if version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let ul;
    	let li0;
    	let t1;
    	let li1;
    	let t3;
    	let li2;
    	let t5;
    	let div1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*setWindow*/ ctx[2] == "recent") return create_if_block$2;
    		if (/*setWindow*/ ctx[2] == "settings") return create_if_block_1$1;
    		if (/*setWindow*/ ctx[2] == "about") return create_if_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Recent";
    			t1 = space();
    			li1 = element("li");
    			li1.textContent = "Settings";
    			t3 = space();
    			li2 = element("li");
    			li2.textContent = "About";
    			t5 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(li0, "class", "svelte-ewc32s");
    			toggle_class(li0, "active", /*setWindow*/ ctx[2] == "recent");
    			add_location(li0, file$3, 21, 3, 441);
    			attr_dev(li1, "class", "svelte-ewc32s");
    			toggle_class(li1, "active", /*setWindow*/ ctx[2] == "settings");
    			add_location(li1, file$3, 27, 3, 562);
    			attr_dev(li2, "class", "svelte-ewc32s");
    			toggle_class(li2, "active", /*setWindow*/ ctx[2] == "about");
    			add_location(li2, file$3, 33, 3, 689);
    			attr_dev(ul, "class", "settings-container-menu svelte-ewc32s");
    			add_location(ul, file$3, 20, 2, 400);
    			attr_dev(div0, "class", "settings-container-sidebar svelte-ewc32s");
    			add_location(div0, file$3, 19, 1, 356);
    			attr_dev(div1, "class", "settings-container-main svelte-ewc32s");
    			add_location(div1, file$3, 41, 1, 823);
    			attr_dev(div2, "class", "settings-container svelte-ewc32s");
    			add_location(div2, file$3, 18, 0, 321);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(li0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(li1, "click", /*click_handler_1*/ ctx[5], false, false, false),
    					listen_dev(li2, "click", /*click_handler_2*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*setWindow*/ 4) {
    				toggle_class(li0, "active", /*setWindow*/ ctx[2] == "recent");
    			}

    			if (dirty & /*setWindow*/ 4) {
    				toggle_class(li1, "active", /*setWindow*/ ctx[2] == "settings");
    			}

    			if (dirty & /*setWindow*/ 4) {
    				toggle_class(li2, "active", /*setWindow*/ ctx[2] == "about");
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Settings", slots, []);
    	const { ipcRenderer } = require("electron");
    	let setWindow = "recent";
    	let { settings = { zoom: 0.3 } } = $$props;
    	let { version } = $$props;
    	let timeout;
    	const writable_props = ["settings", "version"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(2, setWindow = "recent");
    	};

    	const click_handler_1 = e => {
    		$$invalidate(2, setWindow = "settings");
    	};

    	const click_handler_2 = e => {
    		$$invalidate(2, setWindow = "about");
    	};

    	function input0_change_input_handler() {
    		settings.zoom = to_number(this.value);
    		$$invalidate(0, settings);
    	}

    	function input1_change_handler() {
    		settings.overwrite = this.checked;
    		$$invalidate(0, settings);
    	}

    	function input2_change_handler() {
    		settings.theme = this.checked;
    		$$invalidate(0, settings);
    	}

    	$$self.$$set = $$props => {
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("version" in $$props) $$invalidate(1, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		ipcRenderer,
    		setWindow,
    		settings,
    		version,
    		timeout
    	});

    	$$self.$inject_state = $$props => {
    		if ("setWindow" in $$props) $$invalidate(2, setWindow = $$props.setWindow);
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("version" in $$props) $$invalidate(1, version = $$props.version);
    		if ("timeout" in $$props) $$invalidate(3, timeout = $$props.timeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timeout, settings*/ 9) {
    			{
    				clearTimeout(timeout);

    				$$invalidate(3, timeout = setTimeout(
    					() => {
    						ipcRenderer.send("settings:write", settings);
    					},
    					500
    				));
    			}
    		}
    	};

    	return [
    		settings,
    		version,
    		setWindow,
    		timeout,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_change_input_handler,
    		input1_change_handler,
    		input2_change_handler
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { settings: 0, version: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[1] === undefined && !("version" in props)) {
    			console.warn("<Settings> was created without expected prop 'version'");
    		}
    	}

    	get settings() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settings(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Dropfield.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\components\\Dropfield.svelte";

    // (11:3) {#if !legacy}
    function create_if_block$1(ctx) {
    	let div;
    	let i;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fas fa-upload");
    			add_location(i, file$2, 12, 5, 331);
    			attr_dev(div, "class", "dropfield-inner-icon svelte-165i5wg");
    			add_location(div, file$2, 11, 4, 290);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(11:3) {#if !legacy}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let t0;
    	let div1;
    	let div0;
    	let if_block = !/*legacy*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Drop image here";
    			attr_dev(div0, "class", "dropfield-inner-text-line");
    			add_location(div0, file$2, 16, 4, 427);
    			attr_dev(div1, "class", "dropfield-inner-text svelte-165i5wg");
    			add_location(div1, file$2, 15, 3, 387);
    			attr_dev(div2, "class", "dropfield-inner svelte-165i5wg");
    			add_location(div2, file$2, 9, 2, 237);
    			attr_dev(div3, "class", "dropfield-inner-wrapper svelte-165i5wg");
    			add_location(div3, file$2, 8, 1, 196);
    			attr_dev(div4, "class", "dropfield svelte-165i5wg");
    			toggle_class(div4, "legacy", /*legacy*/ ctx[0]);
    			add_location(div4, file$2, 7, 0, 148);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*legacy*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div2, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*legacy*/ 1) {
    				toggle_class(div4, "legacy", /*legacy*/ ctx[0]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dropfield", slots, []);
    	let { legacy = false } = $$props;
    	const dispatch = createEventDispatcher();
    	const writable_props = ["legacy"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dropfield> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    	};

    	$$self.$capture_state = () => ({ createEventDispatcher, legacy, dispatch });

    	$$self.$inject_state = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [legacy];
    }

    class Dropfield extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { legacy: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dropfield",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get legacy() {
    		throw new Error("<Dropfield>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Dropfield>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Adapted from https://github.com/hperrin/svelte-material-ui/blob/master/packages/common/forwardEvents.js

    // prettier-ignore
    const events$1 = [
        'focus', 'blur',
        'fullscreenchange', 'fullscreenerror', 'scroll',
        'cut', 'copy', 'paste',
        'keydown', 'keypress', 'keyup',
        'auxclick', 'click', 'contextmenu', 'dblclick',
        'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup',
        'pointerlockchange', 'pointerlockerror', 'select', 'wheel',
        'drag', 'dragend', 'dragenter', 'dragstart', 'dragleave', 'dragover', 'drop',
        'touchcancel', 'touchend', 'touchmove', 'touchstart',
        'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave', 
        'gotpointercapture', 'lostpointercapture'
      ];

    function forwardEventsBuilder() {
      const component = get_current_component();

      return node => {
        const destructors = events$1.map(event =>
          listen(node, event, e => bubble(component, e))
        );

        return {
          destroy: () => destructors.forEach(destroy => destroy())
        };
      };
    }

    class RenderManager {
      constructor() {
        this.register = this.register.bind(this);
        this.unregister = this.unregister.bind(this);
        this.redraw = this.redraw.bind(this);
        this.resize = this.resize.bind(this);
        this.render = this.render.bind(this);

        this.currentLayerId = 0;
        this.setups = new Map();
        this.renderers = new Map();

        this.needsSetup = false;
        this.needsResize = true;
        this.needsRedraw = true;

        this.layerSequence = [];
      }

      redraw() {
        this.needsRedraw = true;
      }

      resize() {
        this.needsResize = true;
        this.needsRedraw = true;
      }

      register({ setup, render }) {
        if (setup) {
          this.setups.set(this.currentLayerId, setup);
          this.needsSetup = true;
        }

        this.renderers.set(this.currentLayerId, render);

        this.needsRedraw = true;
        return this.currentLayerId++;
      }

      unregister(layerId) {
        this.renderers.delete(layerId);
        this.needsRedraw = true;
      }

      render({ autoclear, pixelRatio, context, width, height }) {
        const renderProps = { context, width, height };

        if (this.needsResize) {
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          this.needsResize = false;
        }

        if (this.needsSetup) {
          for (const [layerId, setup] of this.setups) {
            setup(renderProps);
            this.setups.delete(layerId);
          }

          this.needsSetup = false;
        }

        if (this.needsRedraw) {
          if (autoclear) {
            context.clearRect(0, 0, width, height);
          }

          for (const layerId of this.layerSequence) {
            this.renderers.get(layerId)(renderProps);
          }

          this.needsRedraw = false;
        }
      }
    }

    /* node_modules\svelte-canvas\src\components\Canvas.svelte generated by Svelte v3.38.3 */
    const file$1 = "node_modules\\svelte-canvas\\src\\components\\Canvas.svelte";

    function create_fragment$2(ctx) {
    	let canvas_1;
    	let canvas_1_style_value;
    	let canvas_1_width_value;
    	let canvas_1_height_value;
    	let t;
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			t = space();
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(canvas_1, "style", canvas_1_style_value = "display: block; width: " + /*width*/ ctx[1] + "px; height: " + /*height*/ ctx[2] + "px;" + (/*style*/ ctx[3] ? ` ${/*style*/ ctx[3]}` : ""));
    			attr_dev(canvas_1, "width", canvas_1_width_value = /*width*/ ctx[1] * /*pixelRatio*/ ctx[0]);
    			attr_dev(canvas_1, "height", canvas_1_height_value = /*height*/ ctx[2] * /*pixelRatio*/ ctx[0]);
    			add_location(canvas_1, file$1, 80, 0, 1793);
    			set_style(div, "display", "none");
    			add_location(div, file$1, 90, 0, 2004);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[14](canvas_1);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[15](div);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(/*forwardEvents*/ ctx[6].call(null, canvas_1));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*width, height, style*/ 14 && canvas_1_style_value !== (canvas_1_style_value = "display: block; width: " + /*width*/ ctx[1] + "px; height: " + /*height*/ ctx[2] + "px;" + (/*style*/ ctx[3] ? ` ${/*style*/ ctx[3]}` : ""))) {
    				attr_dev(canvas_1, "style", canvas_1_style_value);
    			}

    			if (!current || dirty & /*width, pixelRatio*/ 3 && canvas_1_width_value !== (canvas_1_width_value = /*width*/ ctx[1] * /*pixelRatio*/ ctx[0])) {
    				attr_dev(canvas_1, "width", canvas_1_width_value);
    			}

    			if (!current || dirty & /*height, pixelRatio*/ 5 && canvas_1_height_value !== (canvas_1_height_value = /*height*/ ctx[2] * /*pixelRatio*/ ctx[0])) {
    				attr_dev(canvas_1, "height", canvas_1_height_value);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4096)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[14](null);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[15](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const KEY = {};

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", slots, ['default']);

    	let { width = 640 } = $$props,
    		{ height = 640 } = $$props,
    		{ pixelRatio = undefined } = $$props,
    		{ style = null } = $$props,
    		{ autoclear = true } = $$props;

    	let canvas, context, animationLoop, layerRef, layerObserver;
    	const forwardEvents = forwardEventsBuilder();
    	const manager = new RenderManager();

    	function redraw() {
    		manager.redraw();
    	}

    	function getCanvas() {
    		return canvas;
    	}

    	function getContext() {
    		return context;
    	}

    	if (pixelRatio === undefined) {
    		if (typeof window === "undefined") {
    			pixelRatio = 2;
    		} else {
    			pixelRatio = window.devicePixelRatio;
    		}
    	}

    	function draw() {
    		manager.render({
    			context,
    			width,
    			height,
    			pixelRatio,
    			autoclear
    		});

    		animationLoop = window.requestAnimationFrame(draw);
    	}

    	setContext(KEY, {
    		register: manager.register,
    		unregister: manager.unregister,
    		redraw: manager.redraw
    	});

    	onMount(() => {
    		context = canvas.getContext("2d");
    		layerObserver = new MutationObserver(getLayerSequence);
    		layerObserver.observe(layerRef, { childList: true });
    		getLayerSequence();
    		draw();

    		function getLayerSequence() {
    			const sequence = [...layerRef.children].map(layer => +layer.dataset.layerId);
    			$$invalidate(11, manager.layerSequence = sequence, manager);
    			manager.redraw();
    		}
    	});

    	onDestroy(() => {
    		if (typeof window === "undefined") return;
    		window.cancelAnimationFrame(animationLoop);
    		layerObserver.disconnect();
    	});

    	const writable_props = ["width", "height", "pixelRatio", "style", "autoclear"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(4, canvas);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			layerRef = $$value;
    			$$invalidate(5, layerRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("pixelRatio" in $$props) $$invalidate(0, pixelRatio = $$props.pixelRatio);
    		if ("style" in $$props) $$invalidate(3, style = $$props.style);
    		if ("autoclear" in $$props) $$invalidate(7, autoclear = $$props.autoclear);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		KEY,
    		onMount,
    		onDestroy,
    		setContext,
    		forwardEventsBuilder,
    		RenderManager,
    		width,
    		height,
    		pixelRatio,
    		style,
    		autoclear,
    		canvas,
    		context,
    		animationLoop,
    		layerRef,
    		layerObserver,
    		forwardEvents,
    		manager,
    		redraw,
    		getCanvas,
    		getContext,
    		draw
    	});

    	$$self.$inject_state = $$props => {
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("pixelRatio" in $$props) $$invalidate(0, pixelRatio = $$props.pixelRatio);
    		if ("style" in $$props) $$invalidate(3, style = $$props.style);
    		if ("autoclear" in $$props) $$invalidate(7, autoclear = $$props.autoclear);
    		if ("canvas" in $$props) $$invalidate(4, canvas = $$props.canvas);
    		if ("context" in $$props) context = $$props.context;
    		if ("animationLoop" in $$props) animationLoop = $$props.animationLoop;
    		if ("layerRef" in $$props) $$invalidate(5, layerRef = $$props.layerRef);
    		if ("layerObserver" in $$props) layerObserver = $$props.layerObserver;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width, height, pixelRatio, autoclear, manager*/ 2183) {
    			(manager.resize());
    		}
    	};

    	return [
    		pixelRatio,
    		width,
    		height,
    		style,
    		canvas,
    		layerRef,
    		forwardEvents,
    		autoclear,
    		redraw,
    		getCanvas,
    		getContext,
    		manager,
    		$$scope,
    		slots,
    		canvas_1_binding,
    		div_binding
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$2, safe_not_equal, {
    			width: 1,
    			height: 2,
    			pixelRatio: 0,
    			style: 3,
    			autoclear: 7,
    			redraw: 8,
    			getCanvas: 9,
    			getContext: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get width() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pixelRatio() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pixelRatio(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoclear() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoclear(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redraw() {
    		return this.$$.ctx[8];
    	}

    	set redraw(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getCanvas() {
    		return this.$$.ctx[9];
    	}

    	set getCanvas(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getContext() {
    		return this.$$.ctx[10];
    	}

    	set getContext(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-canvas\src\components\Layer.svelte generated by Svelte v3.38.3 */

    const { Error: Error_1 } = globals;
    const file = "node_modules\\svelte-canvas\\src\\components\\Layer.svelte";

    function create_fragment$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "data-layer-id", /*layerId*/ ctx[0]);
    			add_location(div, file, 24, 0, 548);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Layer", slots, []);
    	const { register, unregister, redraw } = getContext(KEY);

    	let { setup = undefined } = $$props,
    		{ render = () => {
    			
    		} } = $$props;

    	if (typeof setup !== "function" && setup !== undefined) {
    		throw new Error("setup must be a function");
    	}

    	if (typeof render !== "function") {
    		throw new Error("render must be a function");
    	}

    	const layerId = register({ setup, render });
    	onDestroy(() => unregister(layerId));
    	const writable_props = ["setup", "render"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("setup" in $$props) $$invalidate(1, setup = $$props.setup);
    		if ("render" in $$props) $$invalidate(2, render = $$props.render);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		KEY,
    		register,
    		unregister,
    		redraw,
    		setup,
    		render,
    		layerId
    	});

    	$$self.$inject_state = $$props => {
    		if ("setup" in $$props) $$invalidate(1, setup = $$props.setup);
    		if ("render" in $$props) $$invalidate(2, render = $$props.render);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*render*/ 4) {
    			(redraw());
    		}
    	};

    	return [layerId, setup, render];
    }

    class Layer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, { setup: 1, render: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Layer",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get setup() {
    		throw new Error_1("<Layer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setup(value) {
    		throw new Error_1("<Layer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get render() {
    		throw new Error_1("<Layer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set render(value) {
    		throw new Error_1("<Layer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop$1;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let frame;

    const now = Date.now();

    function start(set) {
      set(Date.now() - now);

      frame = window.requestAnimationFrame(() => start(set));
      return () => window.cancelAnimationFrame(frame);
    }

    function noop() {}

    var t = readable(
      Date.now() - now,
      typeof window === 'undefined' ? noop : start
    );

    /**
    * Panzoom for panning and zooming elements using CSS transforms
    * Copyright Timmy Willison and other contributors
    * https://github.com/timmywil/panzoom/blob/main/MIT-License.txt
    */
    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    /* eslint-disable no-var */
    if (typeof window !== 'undefined') {
      // Support: IE11 only
      if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
      }
      // Support: IE11 only
      // CustomEvent is an object instead of a constructor
      if (typeof window.CustomEvent !== 'function') {
        window.CustomEvent = function CustomEvent(event, params) {
          params = params || { bubbles: false, cancelable: false, detail: null };
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
          return evt
        };
      }
    }

    /**
     * Utilites for working with multiple pointer events
     */
    function findEventIndex(pointers, event) {
        var i = pointers.length;
        while (i--) {
            if (pointers[i].pointerId === event.pointerId) {
                return i;
            }
        }
        return -1;
    }
    function addPointer(pointers, event) {
        var i;
        // Add touches if applicable
        if (event.touches) {
            i = 0;
            for (var _i = 0, _a = event.touches; _i < _a.length; _i++) {
                var touch = _a[_i];
                touch.pointerId = i++;
                addPointer(pointers, touch);
            }
            return;
        }
        i = findEventIndex(pointers, event);
        // Update if already present
        if (i > -1) {
            pointers.splice(i, 1);
        }
        pointers.push(event);
    }
    function removePointer(pointers, event) {
        // Add touches if applicable
        if (event.touches) {
            // Remove all touches
            while (pointers.length) {
                pointers.pop();
            }
            return;
        }
        var i = findEventIndex(pointers, event);
        if (i > -1) {
            pointers.splice(i, 1);
        }
    }
    /**
     * Calculates a center point between
     * the given pointer events, for panning
     * with multiple pointers.
     */
    function getMiddle(pointers) {
        // Copy to avoid changing by reference
        pointers = pointers.slice(0);
        var event1 = pointers.pop();
        var event2;
        while ((event2 = pointers.pop())) {
            event1 = {
                clientX: (event2.clientX - event1.clientX) / 2 + event1.clientX,
                clientY: (event2.clientY - event1.clientY) / 2 + event1.clientY
            };
        }
        return event1;
    }
    /**
     * Calculates the distance between two points
     * for pinch zooming.
     * Limits to the first 2
     */
    function getDistance(pointers) {
        if (pointers.length < 2) {
            return 0;
        }
        var event1 = pointers[0];
        var event2 = pointers[1];
        return Math.sqrt(Math.pow(Math.abs(event2.clientX - event1.clientX), 2) +
            Math.pow(Math.abs(event2.clientY - event1.clientY), 2));
    }

    var events = {
        down: 'mousedown',
        move: 'mousemove',
        up: 'mouseup mouseleave'
    };
    if (typeof window !== 'undefined') {
        if (typeof window.PointerEvent === 'function') {
            events = {
                down: 'pointerdown',
                move: 'pointermove',
                up: 'pointerup pointerleave pointercancel'
            };
        }
        else if (typeof window.TouchEvent === 'function') {
            events = {
                down: 'touchstart',
                move: 'touchmove',
                up: 'touchend touchcancel'
            };
        }
    }
    function onPointer(event, elem, handler, eventOpts) {
        events[event].split(' ').forEach(function (name) {
            elem.addEventListener(name, handler, eventOpts);
        });
    }
    function destroyPointer(event, elem, handler) {
        events[event].split(' ').forEach(function (name) {
            elem.removeEventListener(name, handler);
        });
    }

    var isIE = typeof document !== 'undefined' && !!document.documentMode;
    /**
     * Lazy creation of a CSS style declaration
     */
    var divStyle;
    function createStyle() {
        if (divStyle) {
            return divStyle;
        }
        return (divStyle = document.createElement('div').style);
    }
    /**
     * Proper prefixing for cross-browser compatibility
     */
    var prefixes = ['webkit', 'moz', 'ms'];
    var prefixCache = {};
    function getPrefixedName(name) {
        if (prefixCache[name]) {
            return prefixCache[name];
        }
        var divStyle = createStyle();
        if (name in divStyle) {
            return (prefixCache[name] = name);
        }
        var capName = name[0].toUpperCase() + name.slice(1);
        var i = prefixes.length;
        while (i--) {
            var prefixedName = "" + prefixes[i] + capName;
            if (prefixedName in divStyle) {
                return (prefixCache[name] = prefixedName);
            }
        }
    }
    /**
     * Gets a style value expected to be a number
     */
    function getCSSNum(name, style) {
        return parseFloat(style[getPrefixedName(name)]) || 0;
    }
    function getBoxStyle(elem, name, style) {
        if (style === void 0) { style = window.getComputedStyle(elem); }
        // Support: FF 68+
        // Firefox requires specificity for border
        var suffix = name === 'border' ? 'Width' : '';
        return {
            left: getCSSNum(name + "Left" + suffix, style),
            right: getCSSNum(name + "Right" + suffix, style),
            top: getCSSNum(name + "Top" + suffix, style),
            bottom: getCSSNum(name + "Bottom" + suffix, style)
        };
    }
    /**
     * Set a style using the properly prefixed name
     */
    function setStyle(elem, name, value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elem.style[getPrefixedName(name)] = value;
    }
    /**
     * Constructs the transition from panzoom options
     * and takes care of prefixing the transition and transform
     */
    function setTransition(elem, options) {
        var transform = getPrefixedName('transform');
        setStyle(elem, 'transition', transform + " " + options.duration + "ms " + options.easing);
    }
    /**
     * Set the transform using the proper prefix
     *
     * Override the transform setter.
     * This is exposed mostly so the user could
     * set other parts of a transform
     * aside from scale and translate.
     * Default is defined in src/css.ts.
     *
     * ```js
     * // This example always sets a rotation
     * // when setting the scale and translation
     * const panzoom = Panzoom(elem, {
     *   setTransform: (elem, { scale, x, y }) => {
     *     panzoom.setStyle('transform', `rotate(0.5turn) scale(${scale}) translate(${x}px, ${y}px)`)
     *   }
     * })
     * ```
     */
    function setTransform(elem, _a, _options) {
        var x = _a.x, y = _a.y, scale = _a.scale, isSVG = _a.isSVG;
        setStyle(elem, 'transform', "scale(" + scale + ") translate(" + x + "px, " + y + "px)");
        if (isSVG && isIE) {
            var matrixValue = window.getComputedStyle(elem).getPropertyValue('transform');
            elem.setAttribute('transform', matrixValue);
        }
    }
    /**
     * Dimensions used in containment and focal point zooming
     */
    function getDimensions(elem) {
        var parent = elem.parentNode;
        var style = window.getComputedStyle(elem);
        var parentStyle = window.getComputedStyle(parent);
        var rectElem = elem.getBoundingClientRect();
        var rectParent = parent.getBoundingClientRect();
        return {
            elem: {
                style: style,
                width: rectElem.width,
                height: rectElem.height,
                top: rectElem.top,
                bottom: rectElem.bottom,
                left: rectElem.left,
                right: rectElem.right,
                margin: getBoxStyle(elem, 'margin', style),
                border: getBoxStyle(elem, 'border', style)
            },
            parent: {
                style: parentStyle,
                width: rectParent.width,
                height: rectParent.height,
                top: rectParent.top,
                bottom: rectParent.bottom,
                left: rectParent.left,
                right: rectParent.right,
                padding: getBoxStyle(parent, 'padding', parentStyle),
                border: getBoxStyle(parent, 'border', parentStyle)
            }
        };
    }

    /**
     * Determine if an element is attached to the DOM
     * Panzoom requires this so events work properly
     */
    function isAttached(elem) {
        var doc = elem.ownerDocument;
        var parent = elem.parentNode;
        return (doc &&
            parent &&
            doc.nodeType === 9 &&
            parent.nodeType === 1 &&
            doc.documentElement.contains(parent));
    }

    function getClass(elem) {
        return (elem.getAttribute('class') || '').trim();
    }
    function hasClass(elem, className) {
        return elem.nodeType === 1 && (" " + getClass(elem) + " ").indexOf(" " + className + " ") > -1;
    }
    function isExcluded(elem, options) {
        for (var cur = elem; cur != null; cur = cur.parentNode) {
            if (hasClass(cur, options.excludeClass) || options.exclude.indexOf(cur) > -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determine if an element is SVG by checking the namespace
     * Exception: the <svg> element itself should be treated like HTML
     */
    var rsvg = /^http:[\w\.\/]+svg$/;
    function isSVGElement(elem) {
        return rsvg.test(elem.namespaceURI) && elem.nodeName.toLowerCase() !== 'svg';
    }

    function shallowClone(obj) {
        var clone = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = obj[key];
            }
        }
        return clone;
    }

    var defaultOptions = {
        animate: false,
        canvas: false,
        cursor: 'move',
        disablePan: false,
        disableZoom: false,
        disableXAxis: false,
        disableYAxis: false,
        duration: 200,
        easing: 'ease-in-out',
        exclude: [],
        excludeClass: 'panzoom-exclude',
        handleStartEvent: function (e) {
            e.preventDefault();
            e.stopPropagation();
        },
        maxScale: 4,
        minScale: 0.125,
        overflow: 'hidden',
        panOnlyWhenZoomed: false,
        relative: false,
        setTransform: setTransform,
        startX: 0,
        startY: 0,
        startScale: 1,
        step: 0.3,
        touchAction: 'none'
    };
    function Panzoom(elem, options) {
        if (!elem) {
            throw new Error('Panzoom requires an element as an argument');
        }
        if (elem.nodeType !== 1) {
            throw new Error('Panzoom requires an element with a nodeType of 1');
        }
        if (!isAttached(elem)) {
            throw new Error('Panzoom should be called on elements that have been attached to the DOM');
        }
        options = __assign(__assign({}, defaultOptions), options);
        var isSVG = isSVGElement(elem);
        var parent = elem.parentNode;
        // Set parent styles
        parent.style.overflow = options.overflow;
        parent.style.userSelect = 'none';
        // This is important for mobile to
        // prevent scrolling while panning
        parent.style.touchAction = options.touchAction;
        (options.canvas ? parent : elem).style.cursor = options.cursor;
        // Set element styles
        elem.style.userSelect = 'none';
        elem.style.touchAction = options.touchAction;
        // The default for HTML is '50% 50%'
        // The default for SVG is '0 0'
        // SVG can't be changed in IE
        setStyle(elem, 'transformOrigin', typeof options.origin === 'string' ? options.origin : isSVG ? '0 0' : '50% 50%');
        function resetStyle() {
            parent.style.overflow = '';
            parent.style.userSelect = '';
            parent.style.touchAction = '';
            parent.style.cursor = '';
            elem.style.cursor = '';
            elem.style.userSelect = '';
            elem.style.touchAction = '';
            setStyle(elem, 'transformOrigin', '');
        }
        function setOptions(opts) {
            if (opts === void 0) { opts = {}; }
            for (var key in opts) {
                if (opts.hasOwnProperty(key)) {
                    options[key] = opts[key];
                }
            }
            // Handle option side-effects
            if (opts.hasOwnProperty('cursor') || opts.hasOwnProperty('canvas')) {
                parent.style.cursor = elem.style.cursor = '';
                (options.canvas ? parent : elem).style.cursor = options.cursor;
            }
            if (opts.hasOwnProperty('overflow')) {
                parent.style.overflow = opts.overflow;
            }
            if (opts.hasOwnProperty('touchAction')) {
                parent.style.touchAction = opts.touchAction;
                elem.style.touchAction = opts.touchAction;
            }
        }
        var x = 0;
        var y = 0;
        var scale = 1;
        var isPanning = false;
        zoom(options.startScale, { animate: false, force: true });
        // Wait for scale to update
        // for accurate dimensions
        // to constrain initial values
        setTimeout(function () {
            pan(options.startX, options.startY, { animate: false, force: true });
        });
        function trigger(eventName, detail, opts) {
            if (opts.silent) {
                return;
            }
            var event = new CustomEvent(eventName, { detail: detail });
            elem.dispatchEvent(event);
        }
        function setTransformWithEvent(eventName, opts, originalEvent) {
            var value = { x: x, y: y, scale: scale, isSVG: isSVG, originalEvent: originalEvent };
            requestAnimationFrame(function () {
                if (typeof opts.animate === 'boolean') {
                    if (opts.animate) {
                        setTransition(elem, opts);
                    }
                    else {
                        setStyle(elem, 'transition', 'none');
                    }
                }
                opts.setTransform(elem, value, opts);
                trigger(eventName, value, opts);
                trigger('panzoomchange', value, opts);
            });
            return value;
        }
        function constrainXY(toX, toY, toScale, panOptions) {
            var opts = __assign(__assign({}, options), panOptions);
            var result = { x: x, y: y, opts: opts };
            if (!opts.force && (opts.disablePan || (opts.panOnlyWhenZoomed && scale === opts.startScale))) {
                return result;
            }
            toX = parseFloat(toX);
            toY = parseFloat(toY);
            if (!opts.disableXAxis) {
                result.x = (opts.relative ? x : 0) + toX;
            }
            if (!opts.disableYAxis) {
                result.y = (opts.relative ? y : 0) + toY;
            }
            if (opts.contain) {
                var dims = getDimensions(elem);
                var realWidth = dims.elem.width / scale;
                var realHeight = dims.elem.height / scale;
                var scaledWidth = realWidth * toScale;
                var scaledHeight = realHeight * toScale;
                var diffHorizontal = (scaledWidth - realWidth) / 2;
                var diffVertical = (scaledHeight - realHeight) / 2;
                if (opts.contain === 'inside') {
                    var minX = (-dims.elem.margin.left - dims.parent.padding.left + diffHorizontal) / toScale;
                    var maxX = (dims.parent.width -
                        scaledWidth -
                        dims.parent.padding.left -
                        dims.elem.margin.left -
                        dims.parent.border.left -
                        dims.parent.border.right +
                        diffHorizontal) /
                        toScale;
                    result.x = Math.max(Math.min(result.x, maxX), minX);
                    var minY = (-dims.elem.margin.top - dims.parent.padding.top + diffVertical) / toScale;
                    var maxY = (dims.parent.height -
                        scaledHeight -
                        dims.parent.padding.top -
                        dims.elem.margin.top -
                        dims.parent.border.top -
                        dims.parent.border.bottom +
                        diffVertical) /
                        toScale;
                    result.y = Math.max(Math.min(result.y, maxY), minY);
                }
                else if (opts.contain === 'outside') {
                    var minX = (-(scaledWidth - dims.parent.width) -
                        dims.parent.padding.left -
                        dims.parent.border.left -
                        dims.parent.border.right +
                        diffHorizontal) /
                        toScale;
                    var maxX = (diffHorizontal - dims.parent.padding.left) / toScale;
                    result.x = Math.max(Math.min(result.x, maxX), minX);
                    var minY = (-(scaledHeight - dims.parent.height) -
                        dims.parent.padding.top -
                        dims.parent.border.top -
                        dims.parent.border.bottom +
                        diffVertical) /
                        toScale;
                    var maxY = (diffVertical - dims.parent.padding.top) / toScale;
                    result.y = Math.max(Math.min(result.y, maxY), minY);
                }
            }
            if (opts.roundPixels) {
                result.x = Math.round(result.x);
                result.y = Math.round(result.y);
            }
            return result;
        }
        function constrainScale(toScale, zoomOptions) {
            var opts = __assign(__assign({}, options), zoomOptions);
            var result = { scale: scale, opts: opts };
            if (!opts.force && opts.disableZoom) {
                return result;
            }
            var minScale = options.minScale;
            var maxScale = options.maxScale;
            if (opts.contain) {
                var dims = getDimensions(elem);
                var elemWidth = dims.elem.width / scale;
                var elemHeight = dims.elem.height / scale;
                if (elemWidth > 1 && elemHeight > 1) {
                    var parentWidth = dims.parent.width - dims.parent.border.left - dims.parent.border.right;
                    var parentHeight = dims.parent.height - dims.parent.border.top - dims.parent.border.bottom;
                    var elemScaledWidth = parentWidth / elemWidth;
                    var elemScaledHeight = parentHeight / elemHeight;
                    if (options.contain === 'inside') {
                        maxScale = Math.min(maxScale, elemScaledWidth, elemScaledHeight);
                    }
                    else if (options.contain === 'outside') {
                        minScale = Math.max(minScale, elemScaledWidth, elemScaledHeight);
                    }
                }
            }
            result.scale = Math.min(Math.max(toScale, minScale), maxScale);
            return result;
        }
        function pan(toX, toY, panOptions, originalEvent) {
            var result = constrainXY(toX, toY, scale, panOptions);
            // Only try to set if the result is somehow different
            if (x !== result.x || y !== result.y) {
                x = result.x;
                y = result.y;
                return setTransformWithEvent('panzoompan', result.opts, originalEvent);
            }
            return { x: x, y: y, scale: scale, isSVG: isSVG, originalEvent: originalEvent };
        }
        function zoom(toScale, zoomOptions, originalEvent) {
            var result = constrainScale(toScale, zoomOptions);
            var opts = result.opts;
            if (!opts.force && opts.disableZoom) {
                return;
            }
            toScale = result.scale;
            var toX = x;
            var toY = y;
            if (opts.focal) {
                // The difference between the point after the scale and the point before the scale
                // plus the current translation after the scale
                // neutralized to no scale (as the transform scale will apply to the translation)
                var focal = opts.focal;
                toX = (focal.x / toScale - focal.x / scale + x * toScale) / toScale;
                toY = (focal.y / toScale - focal.y / scale + y * toScale) / toScale;
            }
            var panResult = constrainXY(toX, toY, toScale, { relative: false, force: true });
            x = panResult.x;
            y = panResult.y;
            scale = toScale;
            return setTransformWithEvent('panzoomzoom', opts, originalEvent);
        }
        function zoomInOut(isIn, zoomOptions) {
            var opts = __assign(__assign(__assign({}, options), { animate: true }), zoomOptions);
            return zoom(scale * Math.exp((isIn ? 1 : -1) * opts.step), opts);
        }
        function zoomIn(zoomOptions) {
            return zoomInOut(true, zoomOptions);
        }
        function zoomOut(zoomOptions) {
            return zoomInOut(false, zoomOptions);
        }
        function zoomToPoint(toScale, point, zoomOptions, originalEvent) {
            var dims = getDimensions(elem);
            // Instead of thinking of operating on the panzoom element,
            // think of operating on the area inside the panzoom
            // element's parent
            // Subtract padding and border
            var effectiveArea = {
                width: dims.parent.width -
                    dims.parent.padding.left -
                    dims.parent.padding.right -
                    dims.parent.border.left -
                    dims.parent.border.right,
                height: dims.parent.height -
                    dims.parent.padding.top -
                    dims.parent.padding.bottom -
                    dims.parent.border.top -
                    dims.parent.border.bottom
            };
            // Adjust the clientX/clientY to ignore the area
            // outside the effective area
            var clientX = point.clientX -
                dims.parent.left -
                dims.parent.padding.left -
                dims.parent.border.left -
                dims.elem.margin.left;
            var clientY = point.clientY -
                dims.parent.top -
                dims.parent.padding.top -
                dims.parent.border.top -
                dims.elem.margin.top;
            // Adjust the clientX/clientY for HTML elements,
            // because they have a transform-origin of 50% 50%
            if (!isSVG) {
                clientX -= dims.elem.width / scale / 2;
                clientY -= dims.elem.height / scale / 2;
            }
            // Convert the mouse point from it's position over the
            // effective area before the scale to the position
            // over the effective area after the scale.
            var focal = {
                x: (clientX / effectiveArea.width) * (effectiveArea.width * toScale),
                y: (clientY / effectiveArea.height) * (effectiveArea.height * toScale)
            };
            return zoom(toScale, __assign(__assign({ animate: false }, zoomOptions), { focal: focal }), originalEvent);
        }
        function zoomWithWheel(event, zoomOptions) {
            // Need to prevent the default here
            // or it conflicts with regular page scroll
            event.preventDefault();
            var opts = __assign(__assign(__assign({}, options), zoomOptions), { animate: false });
            // Normalize to deltaX in case shift modifier is used on Mac
            var delta = event.deltaY === 0 && event.deltaX ? event.deltaX : event.deltaY;
            var wheel = delta < 0 ? 1 : -1;
            var toScale = constrainScale(scale * Math.exp((wheel * opts.step) / 3), opts).scale;
            return zoomToPoint(toScale, event, opts);
        }
        function reset(resetOptions) {
            var opts = __assign(__assign(__assign({}, options), { animate: true, force: true }), resetOptions);
            scale = constrainScale(opts.startScale, opts).scale;
            var panResult = constrainXY(opts.startX, opts.startY, scale, opts);
            x = panResult.x;
            y = panResult.y;
            return setTransformWithEvent('panzoomreset', opts);
        }
        var origX;
        var origY;
        var startClientX;
        var startClientY;
        var startScale;
        var startDistance;
        var pointers = [];
        function handleDown(event) {
            // Don't handle this event if the target is excluded
            if (isExcluded(event.target, options)) {
                return;
            }
            addPointer(pointers, event);
            isPanning = true;
            options.handleStartEvent(event);
            origX = x;
            origY = y;
            trigger('panzoomstart', { x: x, y: y, scale: scale, isSVG: isSVG, originalEvent: event }, options);
            // This works whether there are multiple
            // pointers or not
            var point = getMiddle(pointers);
            startClientX = point.clientX;
            startClientY = point.clientY;
            startScale = scale;
            startDistance = getDistance(pointers);
        }
        function move(event) {
            if (!isPanning ||
                origX === undefined ||
                origY === undefined ||
                startClientX === undefined ||
                startClientY === undefined) {
                return;
            }
            addPointer(pointers, event);
            var current = getMiddle(pointers);
            if (pointers.length > 1) {
                // A startDistance of 0 means
                // that there weren't 2 pointers
                // handled on start
                if (startDistance === 0) {
                    startDistance = getDistance(pointers);
                }
                // Use the distance between the first 2 pointers
                // to determine the current scale
                var diff = getDistance(pointers) - startDistance;
                var toScale = constrainScale((diff * options.step) / 80 + startScale).scale;
                zoomToPoint(toScale, current);
            }
            else {
                // Panning during pinch zoom can cause issues
                // because the zoom has not always rendered in time
                // for accurate calculations
                // See https://github.com/timmywil/panzoom/issues/512
                pan(origX + (current.clientX - startClientX) / scale, origY + (current.clientY - startClientY) / scale, {
                    animate: false
                }, event);
            }
        }
        function handleUp(event) {
            // Don't call panzoomend when panning with 2 touches
            // until both touches end
            if (pointers.length === 1) {
                trigger('panzoomend', { x: x, y: y, scale: scale, isSVG: isSVG, originalEvent: event }, options);
            }
            // Note: don't remove all pointers
            // Can restart without having to reinitiate all of them
            // Remove the pointer regardless of the isPanning state
            removePointer(pointers, event);
            if (!isPanning) {
                return;
            }
            isPanning = false;
            origX = origY = startClientX = startClientY = undefined;
        }
        var bound = false;
        function bind() {
            if (bound) {
                return;
            }
            bound = true;
            onPointer('down', options.canvas ? parent : elem, handleDown);
            onPointer('move', document, move, { passive: true });
            onPointer('up', document, handleUp, { passive: true });
        }
        function destroy() {
            bound = false;
            destroyPointer('down', options.canvas ? parent : elem, handleDown);
            destroyPointer('move', document, move);
            destroyPointer('up', document, handleUp);
        }
        if (!options.noBind) {
            bind();
        }
        return {
            bind: bind,
            destroy: destroy,
            eventNames: events,
            getPan: function () { return ({ x: x, y: y }); },
            getScale: function () { return scale; },
            getOptions: function () { return shallowClone(options); },
            pan: pan,
            reset: reset,
            resetStyle: resetStyle,
            setOptions: setOptions,
            setStyle: function (name, value) { return setStyle(elem, name, value); },
            zoom: zoom,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            zoomToPoint: zoomToPoint,
            zoomWithWheel: zoomWithWheel
        };
    }
    Panzoom.defaultOptions = defaultOptions;

    /* src\App.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file_1 = "src\\App.svelte";

    // (172:2) {#if settingsOpen}
    function create_if_block_1(ctx) {
    	let settings_1;
    	let current;

    	settings_1 = new Settings({
    			props: {
    				settings: /*proxySettings*/ ctx[6],
    				version: /*version*/ ctx[9]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(settings_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(settings_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const settings_1_changes = {};
    			if (dirty & /*proxySettings*/ 64) settings_1_changes.settings = /*proxySettings*/ ctx[6];
    			settings_1.$set(settings_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(settings_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(settings_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(settings_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(172:2) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (187:2) {:else}
    function create_else_block(ctx) {
    	let dropfield;
    	let current;

    	dropfield = new Dropfield({
    			props: { legacy: /*settings*/ ctx[4].theme },
    			$$inline: true
    		});

    	dropfield.$on("select", /*select_handler*/ ctx[15]);

    	const block = {
    		c: function create() {
    			create_component(dropfield.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dropfield, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dropfield_changes = {};
    			if (dirty & /*settings*/ 16) dropfield_changes.legacy = /*settings*/ ctx[4].theme;
    			dropfield.$set(dropfield_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropfield.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropfield.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dropfield, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(187:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (179:2) {#if file}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let canvas;
    	let current;

    	canvas = new Canvas({
    			props: {
    				width: /*width*/ ctx[1],
    				height: /*height*/ ctx[2],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(canvas.$$.fragment);
    			attr_dev(div0, "class", "canvas-container-inner svelte-7mf9vn");
    			add_location(div0, file_1, 180, 4, 4273);
    			attr_dev(div1, "class", "canvas-container svelte-7mf9vn");
    			toggle_class(div1, "pixelated", /*zoomed*/ ctx[3]);
    			add_location(div1, file_1, 179, 3, 4212);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(canvas, div0, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const canvas_changes = {};
    			if (dirty & /*width*/ 2) canvas_changes.width = /*width*/ ctx[1];
    			if (dirty & /*height*/ 4) canvas_changes.height = /*height*/ ctx[2];

    			if (dirty & /*$$scope, render*/ 524544) {
    				canvas_changes.$$scope = { dirty, ctx };
    			}

    			canvas.$set(canvas_changes);

    			if (dirty & /*zoomed*/ 8) {
    				toggle_class(div1, "pixelated", /*zoomed*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(canvas);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(179:2) {#if file}",
    		ctx
    	});

    	return block;
    }

    // (182:8) <Canvas width={width} height={height}>
    function create_default_slot_1(ctx) {
    	let layer;
    	let current;

    	layer = new Layer({
    			props: { render: /*render*/ ctx[8] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(layer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(layer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const layer_changes = {};
    			if (dirty & /*render*/ 256) layer_changes.render = /*render*/ ctx[8];
    			layer.$set(layer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(layer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(layer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(layer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(182:8) <Canvas width={width} height={height}>",
    		ctx
    	});

    	return block;
    }

    // (167:1) <Desktop    legacy={settings.theme}    on:dragover={(e) => { e.preventDefault(); }}    on:drop={handleFilesSelect}   >
    function create_default_slot(ctx) {
    	let t_1;
    	let current_block_type_index;
    	let if_block1;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*settingsOpen*/ ctx[5] && create_if_block_1(ctx);
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*file*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t_1 = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t_1, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*settingsOpen*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*settingsOpen*/ 32) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t_1.parentNode, t_1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				} else {
    					if_block1.p(ctx, dirty);
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t_1);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(167:1) <Desktop    legacy={settings.theme}    on:dragover={(e) => { e.preventDefault(); }}    on:drop={handleFilesSelect}   >",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let t3;
    	let main;
    	let titlebar;
    	let t4;
    	let toolbox;
    	let t5;
    	let desktop;
    	let current;
    	let mounted;
    	let dispose;

    	titlebar = new Titlebar({
    			props: {
    				fileSelected: /*file*/ ctx[0],
    				settingsOpen: /*settingsOpen*/ ctx[5],
    				overwrite: /*settings*/ ctx[4].overwrite,
    				legacy: /*settings*/ ctx[4].theme,
    				version: /*version*/ ctx[9]
    			},
    			$$inline: true
    		});

    	titlebar.$on("clear", /*clear_handler*/ ctx[13]);
    	titlebar.$on("settingsOpen", /*settingsOpen_handler*/ ctx[14]);

    	toolbox = new Toolbox({
    			props: {
    				settingsOpen: /*settingsOpen*/ ctx[5],
    				fileSelected: /*file*/ ctx[0]
    			},
    			$$inline: true
    		});

    	desktop = new Desktop({
    			props: {
    				legacy: /*settings*/ ctx[4].theme,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	desktop.$on("dragover", dragover_handler);
    	desktop.$on("drop", /*handleFilesSelect*/ ctx[10]);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			main = element("main");
    			create_component(titlebar.$$.fragment);
    			t4 = space();
    			create_component(toolbox.$$.fragment);
    			t5 = space();
    			create_component(desktop.$$.fragment);
    			attr_dev(div0, "class", "backdrop-bg backdrop-top svelte-7mf9vn");
    			add_location(div0, file_1, 135, 1, 3257);
    			attr_dev(div1, "class", "backdrop-bg backdrop-right svelte-7mf9vn");
    			add_location(div1, file_1, 136, 1, 3304);
    			attr_dev(div2, "class", "backdrop-bg backdrop-bottom svelte-7mf9vn");
    			add_location(div2, file_1, 137, 1, 3353);
    			attr_dev(div3, "class", "backdrop-bg backdrop-left svelte-7mf9vn");
    			add_location(div3, file_1, 138, 1, 3403);
    			attr_dev(div4, "class", "backdrop svelte-7mf9vn");
    			toggle_class(div4, "legacy", /*settings*/ ctx[4].theme);
    			add_location(div4, file_1, 134, 0, 3202);
    			attr_dev(main, "class", "svelte-7mf9vn");
    			toggle_class(main, "legacy", /*settings*/ ctx[4].theme);
    			add_location(main, file_1, 141, 0, 3460);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(titlebar, main, null);
    			append_dev(main, t4);
    			mount_component(toolbox, main, null);
    			append_dev(main, t5);
    			mount_component(desktop, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window, "paste", /*handlePaste*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*settings*/ 16) {
    				toggle_class(div4, "legacy", /*settings*/ ctx[4].theme);
    			}

    			const titlebar_changes = {};
    			if (dirty & /*file*/ 1) titlebar_changes.fileSelected = /*file*/ ctx[0];
    			if (dirty & /*settingsOpen*/ 32) titlebar_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			if (dirty & /*settings*/ 16) titlebar_changes.overwrite = /*settings*/ ctx[4].overwrite;
    			if (dirty & /*settings*/ 16) titlebar_changes.legacy = /*settings*/ ctx[4].theme;
    			titlebar.$set(titlebar_changes);
    			const toolbox_changes = {};
    			if (dirty & /*settingsOpen*/ 32) toolbox_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			if (dirty & /*file*/ 1) toolbox_changes.fileSelected = /*file*/ ctx[0];
    			toolbox.$set(toolbox_changes);
    			const desktop_changes = {};
    			if (dirty & /*settings*/ 16) desktop_changes.legacy = /*settings*/ ctx[4].theme;

    			if (dirty & /*$$scope, zoomed, width, height, render, file, settings, proxySettings, settingsOpen*/ 524671) {
    				desktop_changes.$$scope = { dirty, ctx };
    			}

    			desktop.$set(desktop_changes);

    			if (dirty & /*settings*/ 16) {
    				toggle_class(main, "legacy", /*settings*/ ctx[4].theme);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(toolbox.$$.fragment, local);
    			transition_in(desktop.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(toolbox.$$.fragment, local);
    			transition_out(desktop.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    			destroy_component(titlebar);
    			destroy_component(toolbox);
    			destroy_component(desktop);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const dragover_handler = e => {
    	e.preventDefault();
    };

    function instance_1($$self, $$props, $$invalidate) {
    	let render;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const { ipcRenderer } = require("electron");
    	let file = false;
    	let width;
    	let height;
    	let zoomed = false;
    	let settings = {};
    	let settingsOpen = false;
    	let proxySettings;
    	let initUpdate = 0;
    	let instance;
    	let version = "4.0.12";

    	ipcRenderer.on("settings", (event, arg) => {
    		if (settings.zoom && settings.zoom != arg.zoom && instance) {
    			let element = document.querySelector(".canvas-container-inner");
    			initPan(element, arg.zoom);
    		}

    		$$invalidate(4, settings = arg);
    		initUpdate++;

    		if (initUpdate < 2) {
    			console.log("REPEATED UPDATE FAILED!", initUpdate);
    			$$invalidate(6, proxySettings = settings);
    		}
    	});

    	let img = new Image();

    	function initPan(element, customZoom = false) {
    		if (!element) return;

    		try {
    			console.log("test");
    			instance.destroy();
    		} catch(e) {
    			
    		} /*console.log("errrrr", e);*/

    		// And pass it to panzoom
    		$$invalidate(7, instance = Panzoom(element, {
    			maxScale: 10000,
    			step: customZoom || settings.zoom
    		}));

    		element.parentElement.addEventListener("wheel", instance.zoomWithWheel);

    		element.addEventListener("panzoomchange", event => {
    			if (event.detail.scale >= 10) $$invalidate(3, zoomed = true); else $$invalidate(3, zoomed = false);
    		});
    	}

    	

    	function handleFilesSelect(e) {
    		if (!settings.overwrite && file || settingsOpen) return;
    		const acceptedFiles = Array.from(e.dataTransfer.files);
    		ipcRenderer.send("file", acceptedFiles[0].path);
    	}

    	img.onload = function () {
    		$$invalidate(1, width = img.width);
    		$$invalidate(2, height = img.height);
    	};

    	ipcRenderer.on("deliver", (event, arg) => {
    		console.log("loading file!");
    		$$invalidate(12, img.src = arg, img);
    		$$invalidate(0, file = arg);
    	});

    	/*
    	NOTE!!!

    	Maybe add a setting that separates clicking
    	into a separate button.

    	Add image selection by dropping text in
    */
    	function handlePaste(event) {
    		if (!settings.overwrite && file || settingsOpen) return;

    		if (event.clipboardData.getData("Text") != "") {
    			console.log("test pasted! handle URL?");
    		}

    		let items = (event.clipboardData || event.originalEvent.clipboardData).items;
    		let blob = null;

    		for (let i = 0; i < items.length; i++) {
    			if (items[i].type.indexOf("image") === 0) blob = items[i].getAsFile(); //afaik you can't really paste PSD here
    		}

    		if (blob == null) return;

    		/*
    	Electron doesn't want us sending blob objects via ipc
    	so we'll handle it in-house instead.

    */
    		var a = new FileReader();

    		a.onload = function (e) {
    			$$invalidate(12, img.src = e.target.result, img);
    			$$invalidate(0, file = e.target.result);
    		};

    		a.readAsDataURL(blob);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const clear_handler = e => {
    		$$invalidate(0, file = false);

    		try {
    			console.log("destroying");
    			instance.destroy();
    		} catch(e) {
    			console.log("err", e);
    		}
    	};

    	const settingsOpen_handler = e => {
    		$$invalidate(5, settingsOpen = e.detail);
    	};

    	const select_handler = e => {
    		alert("woop");
    	};

    	$$self.$capture_state = () => ({
    		Titlebar,
    		Desktop,
    		Toolbox,
    		Settings,
    		Dropfield,
    		Canvas,
    		Layer,
    		t,
    		Panzoom,
    		ipcRenderer,
    		file,
    		width,
    		height,
    		zoomed,
    		settings,
    		settingsOpen,
    		proxySettings,
    		initUpdate,
    		instance,
    		version,
    		img,
    		initPan,
    		handleFilesSelect,
    		handlePaste,
    		render
    	});

    	$$self.$inject_state = $$props => {
    		if ("file" in $$props) $$invalidate(0, file = $$props.file);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("zoomed" in $$props) $$invalidate(3, zoomed = $$props.zoomed);
    		if ("settings" in $$props) $$invalidate(4, settings = $$props.settings);
    		if ("settingsOpen" in $$props) $$invalidate(5, settingsOpen = $$props.settingsOpen);
    		if ("proxySettings" in $$props) $$invalidate(6, proxySettings = $$props.proxySettings);
    		if ("initUpdate" in $$props) initUpdate = $$props.initUpdate;
    		if ("instance" in $$props) $$invalidate(7, instance = $$props.instance);
    		if ("version" in $$props) $$invalidate(9, version = $$props.version);
    		if ("img" in $$props) $$invalidate(12, img = $$props.img);
    		if ("render" in $$props) $$invalidate(8, render = $$props.render);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*img*/ 4096) {
    			$$invalidate(8, render = ({ context }) => {
    				context.drawImage(img, 0, 0);
    				let element = document.querySelector(".canvas-container-inner");
    				initPan(element);
    			});
    		}
    	};

    	return [
    		file,
    		width,
    		height,
    		zoomed,
    		settings,
    		settingsOpen,
    		proxySettings,
    		instance,
    		render,
    		version,
    		handleFilesSelect,
    		handlePaste,
    		img,
    		clear_handler,
    		settingsOpen_handler,
    		select_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance_1, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
