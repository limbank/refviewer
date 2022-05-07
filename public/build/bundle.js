
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
    function children(element) {
        return Array.from(element.childNodes);
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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

    // (25:3) {:else}
    function create_else_block$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-bars");
    			add_location(i, file$6, 25, 7, 607);
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
    		source: "(25:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (23:3) {#if settingsOpen}
    function create_if_block_2$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file$6, 23, 7, 558);
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(23:3) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (29:2) {#if !settingsOpen}
    function create_if_block$3(ctx) {
    	let if_block_anchor;
    	let if_block = /*fileSelected*/ ctx[1] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*fileSelected*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(29:2) {#if !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (35:3) {#if fileSelected}
    function create_if_block_1$2(ctx) {
    	let button;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			attr_dev(i, "class", "fas fa-trash");
    			add_location(i, file$6, 36, 8, 917);
    			attr_dev(button, "class", "control control-clear svelte-17o2zni");
    			add_location(button, file$6, 35, 4, 830);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[6], false, false, false);
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(35:3) {#if fileSelected}",
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
    	let span;
    	let t3;
    	let button1;
    	let i0;
    	let t4;
    	let button2;
    	let i1;
    	let t5;
    	let button3;
    	let i2;
    	let t6;
    	let button4;
    	let i3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*settingsOpen*/ ctx[0]) return create_if_block_2$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*settingsOpen*/ ctx[0] && create_if_block$3(ctx);

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
    			span = element("span");
    			span.textContent = "v. 4.0.6";
    			t3 = space();
    			button1 = element("button");
    			i0 = element("i");
    			t4 = space();
    			button2 = element("button");
    			i1 = element("i");
    			t5 = space();
    			button3 = element("button");
    			i2 = element("i");
    			t6 = space();
    			button4 = element("button");
    			i3 = element("i");
    			attr_dev(button0, "class", "control control-menu svelte-17o2zni");
    			add_location(button0, file$6, 18, 2, 388);
    			attr_dev(div0, "class", "titlebar-group svelte-17o2zni");
    			add_location(div0, file$6, 17, 1, 356);
    			attr_dev(span, "class", "version svelte-17o2zni");
    			add_location(span, file$6, 42, 2, 1023);
    			attr_dev(i0, "class", "fas fa-thumbtack svelte-17o2zni");
    			add_location(i0, file$6, 44, 6, 1176);
    			attr_dev(button1, "class", "control control-pin svelte-17o2zni");
    			toggle_class(button1, "pinned", /*pinned*/ ctx[2]);
    			add_location(button1, file$6, 43, 2, 1064);
    			attr_dev(i1, "class", "fas fa-minus");
    			add_location(i1, file$6, 47, 6, 1334);
    			attr_dev(button2, "class", "control control-minimize svelte-17o2zni");
    			add_location(button2, file$6, 46, 2, 1225);
    			attr_dev(i2, "class", "fas fa-plus");
    			add_location(i2, file$6, 50, 6, 1487);
    			attr_dev(button3, "class", "control control-restore svelte-17o2zni");
    			add_location(button3, file$6, 49, 2, 1379);
    			attr_dev(i3, "class", "fas fa-times");
    			add_location(i3, file$6, 53, 6, 1634);
    			attr_dev(button4, "class", "control control-close svelte-17o2zni");
    			add_location(button4, file$6, 52, 2, 1531);
    			attr_dev(div1, "class", "titlebar-group svelte-17o2zni");
    			add_location(div1, file$6, 41, 1, 991);
    			attr_dev(div2, "class", "titlebar svelte-17o2zni");
    			add_location(div2, file$6, 16, 0, 331);
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
    			append_dev(div1, span);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(button1, i0);
    			append_dev(div1, t4);
    			append_dev(div1, button2);
    			append_dev(button2, i1);
    			append_dev(div1, t5);
    			append_dev(div1, button3);
    			append_dev(button3, i2);
    			append_dev(div1, t6);
    			append_dev(div1, button4);
    			append_dev(button4, i3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*click_handler_3*/ ctx[8], false, false, false),
    					listen_dev(button3, "click", /*click_handler_4*/ ctx[9], false, false, false),
    					listen_dev(button4, "click", /*click_handler_5*/ ctx[10], false, false, false)
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
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*pinned*/ 4) {
    				toggle_class(button1, "pinned", /*pinned*/ ctx[2]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if (if_block1) if_block1.d();
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
    	let pinned = false;

    	ipcRenderer.on("pin", (event, arg) => {
    		$$invalidate(2, pinned = arg);
    	});

    	const writable_props = ["fileSelected", "settingsOpen"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Titlebar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(0, settingsOpen = !settingsOpen);
    		dispatch("settingsOpen", settingsOpen);
    	};

    	const click_handler_1 = e => {
    		dispatch("clear");
    	};

    	const click_handler_2 = e => {
    		ipcRenderer.send("window", "pin");
    	};

    	const click_handler_3 = e => {
    		ipcRenderer.send("window", "minimize");
    	};

    	const click_handler_4 = e => {
    		ipcRenderer.send("window", "maximize");
    	};

    	const click_handler_5 = e => {
    		ipcRenderer.send("window", "close");
    	};

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		ipcRenderer,
    		dispatch,
    		fileSelected,
    		settingsOpen,
    		pinned
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    		if ("pinned" in $$props) $$invalidate(2, pinned = $$props.pinned);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		settingsOpen,
    		fileSelected,
    		pinned,
    		ipcRenderer,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class Titlebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { fileSelected: 1, settingsOpen: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Titlebar",
    			options,
    			id: create_fragment$7.name
    		});
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
    }

    /* src\components\Desktop.svelte generated by Svelte v3.38.3 */

    const file$5 = "src\\components\\Desktop.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "desktop svelte-1u368qb");
    			add_location(div, file$5, 3, 0, 23);
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
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], !current ? -1 : dirty, null, null);
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
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Desktop> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Desktop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Desktop",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\Toolbox.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\components\\Toolbox.svelte";

    // (27:1) {#if fileSelected && !settingsOpen}
    function create_if_block$2(ctx) {
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
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(27:1) {#if fileSelected && !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let if_block = /*fileSelected*/ ctx[0] && !/*settingsOpen*/ ctx[1] && create_if_block$2(ctx);

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
    					if_block = create_if_block$2(ctx);
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

    // (126:31) 
    function create_if_block_2(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "v. 4.0.6";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "source.dog © 2018-2022";
    			attr_dev(div0, "class", "settings-container-text svelte-13bbpr8");
    			add_location(div0, file$3, 127, 4, 3280);
    			attr_dev(div1, "class", "settings-container-text svelte-13bbpr8");
    			add_location(div1, file$3, 130, 4, 3350);
    			attr_dev(div2, "class", "settings-container-inner svelte-13bbpr8");
    			add_location(div2, file$3, 126, 3, 3236);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(126:31) ",
    		ctx
    	});

    	return block;
    }

    // (44:34) 
    function create_if_block_1$1(ctx) {
    	let div26;
    	let div3;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let div8;
    	let div6;
    	let div4;
    	let t4;
    	let div5;
    	let label0;
    	let input0;
    	let t5;
    	let span0;
    	let t6;
    	let div7;
    	let t8;
    	let div13;
    	let div11;
    	let div9;
    	let t10;
    	let div10;
    	let label1;
    	let input1;
    	let t11;
    	let span1;
    	let t12;
    	let div12;
    	let t14;
    	let div17;
    	let div16;
    	let div14;
    	let t16;
    	let div15;
    	let label2;
    	let input2;
    	let t17;
    	let span2;
    	let t18;
    	let div21;
    	let div20;
    	let div18;
    	let t20;
    	let div19;
    	let label3;
    	let input3;
    	let t21;
    	let span3;
    	let t22;
    	let div25;
    	let div24;
    	let div22;
    	let t24;
    	let div23;
    	let label4;
    	let input4;
    	let t25;
    	let span4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div26 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Zoom speed";
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			div4.textContent = "Allow overwrite";
    			t4 = space();
    			div5 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t5 = space();
    			span0 = element("span");
    			t6 = space();
    			div7 = element("div");
    			div7.textContent = "Allow selecting a new image while another image is loaded.";
    			t8 = space();
    			div13 = element("div");
    			div11 = element("div");
    			div9 = element("div");
    			div9.textContent = "Legacy file select";
    			t10 = space();
    			div10 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t11 = space();
    			span1 = element("span");
    			t12 = space();
    			div12 = element("div");
    			div12.textContent = "Enable a separate button for clicking to select a file";
    			t14 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div14 = element("div");
    			div14.textContent = "Legacy theme";
    			t16 = space();
    			div15 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t17 = space();
    			span2 = element("span");
    			t18 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Auto-save screenshots";
    			t20 = space();
    			div19 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t21 = space();
    			span3 = element("span");
    			t22 = space();
    			div25 = element("div");
    			div24 = element("div");
    			div22 = element("div");
    			div22.textContent = "Developer mode";
    			t24 = space();
    			div23 = element("div");
    			label4 = element("label");
    			input4 = element("input");
    			t25 = space();
    			span4 = element("span");
    			attr_dev(div0, "class", "setting-title svelte-13bbpr8");
    			add_location(div0, file$3, 47, 6, 1015);
    			attr_dev(div1, "class", "setting-control svelte-13bbpr8");
    			add_location(div1, file$3, 50, 6, 1083);
    			attr_dev(div2, "class", "setting-inner svelte-13bbpr8");
    			add_location(div2, file$3, 46, 5, 980);
    			attr_dev(div3, "class", "setting svelte-13bbpr8");
    			add_location(div3, file$3, 45, 4, 952);
    			attr_dev(div4, "class", "setting-title svelte-13bbpr8");
    			add_location(div4, file$3, 55, 6, 1212);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-13bbpr8");
    			add_location(input0, file$3, 60, 8, 1355);
    			attr_dev(span0, "class", "slider svelte-13bbpr8");
    			add_location(span0, file$3, 61, 8, 1422);
    			attr_dev(label0, "class", "switch svelte-13bbpr8");
    			add_location(label0, file$3, 59, 7, 1323);
    			attr_dev(div5, "class", "setting-control svelte-13bbpr8");
    			add_location(div5, file$3, 58, 6, 1285);
    			attr_dev(div6, "class", "setting-inner svelte-13bbpr8");
    			add_location(div6, file$3, 54, 5, 1177);
    			attr_dev(div7, "class", "setting-description svelte-13bbpr8");
    			add_location(div7, file$3, 65, 5, 1501);
    			attr_dev(div8, "class", "setting svelte-13bbpr8");
    			add_location(div8, file$3, 53, 4, 1149);
    			attr_dev(div9, "class", "setting-title svelte-13bbpr8");
    			add_location(div9, file$3, 71, 6, 1694);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-13bbpr8");
    			add_location(input1, file$3, 76, 8, 1840);
    			attr_dev(span1, "class", "slider svelte-13bbpr8");
    			add_location(span1, file$3, 77, 8, 1904);
    			attr_dev(label1, "class", "switch svelte-13bbpr8");
    			add_location(label1, file$3, 75, 7, 1808);
    			attr_dev(div10, "class", "setting-control svelte-13bbpr8");
    			add_location(div10, file$3, 74, 6, 1770);
    			attr_dev(div11, "class", "setting-inner svelte-13bbpr8");
    			add_location(div11, file$3, 70, 5, 1659);
    			attr_dev(div12, "class", "setting-description svelte-13bbpr8");
    			add_location(div12, file$3, 81, 5, 1983);
    			attr_dev(div13, "class", "setting svelte-13bbpr8");
    			add_location(div13, file$3, 69, 4, 1631);
    			attr_dev(div14, "class", "setting-title svelte-13bbpr8");
    			add_location(div14, file$3, 87, 6, 2172);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-13bbpr8");
    			add_location(input2, file$3, 92, 8, 2312);
    			attr_dev(span2, "class", "slider svelte-13bbpr8");
    			add_location(span2, file$3, 93, 8, 2375);
    			attr_dev(label2, "class", "switch svelte-13bbpr8");
    			add_location(label2, file$3, 91, 7, 2280);
    			attr_dev(div15, "class", "setting-control svelte-13bbpr8");
    			add_location(div15, file$3, 90, 6, 2242);
    			attr_dev(div16, "class", "setting-inner svelte-13bbpr8");
    			add_location(div16, file$3, 86, 5, 2137);
    			attr_dev(div17, "class", "setting svelte-13bbpr8");
    			add_location(div17, file$3, 85, 4, 2109);
    			attr_dev(div18, "class", "setting-title svelte-13bbpr8");
    			add_location(div18, file$3, 100, 6, 2528);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-13bbpr8");
    			add_location(input3, file$3, 105, 8, 2677);
    			attr_dev(span3, "class", "slider svelte-13bbpr8");
    			add_location(span3, file$3, 106, 8, 2743);
    			attr_dev(label3, "class", "switch svelte-13bbpr8");
    			add_location(label3, file$3, 104, 7, 2645);
    			attr_dev(div19, "class", "setting-control svelte-13bbpr8");
    			add_location(div19, file$3, 103, 6, 2607);
    			attr_dev(div20, "class", "setting-inner svelte-13bbpr8");
    			add_location(div20, file$3, 99, 5, 2493);
    			attr_dev(div21, "class", "setting svelte-13bbpr8");
    			add_location(div21, file$3, 98, 4, 2465);
    			attr_dev(div22, "class", "setting-title svelte-13bbpr8");
    			add_location(div22, file$3, 113, 6, 2896);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-13bbpr8");
    			add_location(input4, file$3, 118, 8, 3038);
    			attr_dev(span4, "class", "slider svelte-13bbpr8");
    			add_location(span4, file$3, 119, 8, 3103);
    			attr_dev(label4, "class", "switch svelte-13bbpr8");
    			add_location(label4, file$3, 117, 7, 3006);
    			attr_dev(div23, "class", "setting-control svelte-13bbpr8");
    			add_location(div23, file$3, 116, 6, 2968);
    			attr_dev(div24, "class", "setting-inner svelte-13bbpr8");
    			add_location(div24, file$3, 112, 5, 2861);
    			attr_dev(div25, "class", "setting svelte-13bbpr8");
    			add_location(div25, file$3, 111, 4, 2833);
    			attr_dev(div26, "class", "settings-container-inner svelte-13bbpr8");
    			add_location(div26, file$3, 44, 3, 908);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div26, anchor);
    			append_dev(div26, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div26, t2);
    			append_dev(div26, div8);
    			append_dev(div8, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			append_dev(div5, label0);
    			append_dev(label0, input0);
    			input0.checked = /*settings*/ ctx[0].overwrite;
    			append_dev(label0, t5);
    			append_dev(label0, span0);
    			append_dev(div8, t6);
    			append_dev(div8, div7);
    			append_dev(div26, t8);
    			append_dev(div26, div13);
    			append_dev(div13, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t10);
    			append_dev(div11, div10);
    			append_dev(div10, label1);
    			append_dev(label1, input1);
    			input1.checked = /*settings*/ ctx[0].select;
    			append_dev(label1, t11);
    			append_dev(label1, span1);
    			append_dev(div13, t12);
    			append_dev(div13, div12);
    			append_dev(div26, t14);
    			append_dev(div26, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div14);
    			append_dev(div16, t16);
    			append_dev(div16, div15);
    			append_dev(div15, label2);
    			append_dev(label2, input2);
    			input2.checked = /*settings*/ ctx[0].theme;
    			append_dev(label2, t17);
    			append_dev(label2, span2);
    			append_dev(div26, t18);
    			append_dev(div26, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t20);
    			append_dev(div20, div19);
    			append_dev(div19, label3);
    			append_dev(label3, input3);
    			input3.checked = /*settings*/ ctx[0].autosave;
    			append_dev(label3, t21);
    			append_dev(label3, span3);
    			append_dev(div26, t22);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div24, div22);
    			append_dev(div24, t24);
    			append_dev(div24, div23);
    			append_dev(div23, label4);
    			append_dev(label4, input4);
    			input4.checked = /*settings*/ ctx[0].devmode;
    			append_dev(label4, t25);
    			append_dev(label4, span4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[6]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[7]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[8]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[9]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*settings*/ 1) {
    				input0.checked = /*settings*/ ctx[0].overwrite;
    			}

    			if (dirty & /*settings*/ 1) {
    				input1.checked = /*settings*/ ctx[0].select;
    			}

    			if (dirty & /*settings*/ 1) {
    				input2.checked = /*settings*/ ctx[0].theme;
    			}

    			if (dirty & /*settings*/ 1) {
    				input3.checked = /*settings*/ ctx[0].autosave;
    			}

    			if (dirty & /*settings*/ 1) {
    				input4.checked = /*settings*/ ctx[0].devmode;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div26);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(44:34) ",
    		ctx
    	});

    	return block;
    }

    // (42:2) {#if setWindow=="recent"}
    function create_if_block$1(ctx) {
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(42:2) {#if setWindow==\\\"recent\\\"}",
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
    		if (/*setWindow*/ ctx[1] == "recent") return create_if_block$1;
    		if (/*setWindow*/ ctx[1] == "settings") return create_if_block_1$1;
    		if (/*setWindow*/ ctx[1] == "about") return create_if_block_2;
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
    			attr_dev(li0, "class", "svelte-13bbpr8");
    			toggle_class(li0, "active", /*setWindow*/ ctx[1] == "recent");
    			add_location(li0, file$3, 20, 3, 408);
    			attr_dev(li1, "class", "svelte-13bbpr8");
    			toggle_class(li1, "active", /*setWindow*/ ctx[1] == "settings");
    			add_location(li1, file$3, 26, 3, 529);
    			attr_dev(li2, "class", "svelte-13bbpr8");
    			toggle_class(li2, "active", /*setWindow*/ ctx[1] == "about");
    			add_location(li2, file$3, 32, 3, 656);
    			attr_dev(ul, "class", "settings-container-menu svelte-13bbpr8");
    			add_location(ul, file$3, 19, 2, 367);
    			attr_dev(div0, "class", "settings-container-sidebar svelte-13bbpr8");
    			add_location(div0, file$3, 18, 1, 323);
    			attr_dev(div1, "class", "settings-container-main svelte-13bbpr8");
    			add_location(div1, file$3, 40, 1, 790);
    			attr_dev(div2, "class", "settings-container svelte-13bbpr8");
    			add_location(div2, file$3, 17, 0, 288);
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
    					listen_dev(li0, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(li1, "click", /*click_handler_1*/ ctx[4], false, false, false),
    					listen_dev(li2, "click", /*click_handler_2*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*setWindow*/ 2) {
    				toggle_class(li0, "active", /*setWindow*/ ctx[1] == "recent");
    			}

    			if (dirty & /*setWindow*/ 2) {
    				toggle_class(li1, "active", /*setWindow*/ ctx[1] == "settings");
    			}

    			if (dirty & /*setWindow*/ 2) {
    				toggle_class(li2, "active", /*setWindow*/ ctx[1] == "about");
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
    	let { settings = {} } = $$props;
    	let timeout;
    	const writable_props = ["settings"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(1, setWindow = "recent");
    	};

    	const click_handler_1 = e => {
    		$$invalidate(1, setWindow = "settings");
    	};

    	const click_handler_2 = e => {
    		$$invalidate(1, setWindow = "about");
    	};

    	function input0_change_handler() {
    		settings.overwrite = this.checked;
    		$$invalidate(0, settings);
    	}

    	function input1_change_handler() {
    		settings.select = this.checked;
    		$$invalidate(0, settings);
    	}

    	function input2_change_handler() {
    		settings.theme = this.checked;
    		$$invalidate(0, settings);
    	}

    	function input3_change_handler() {
    		settings.autosave = this.checked;
    		$$invalidate(0, settings);
    	}

    	function input4_change_handler() {
    		settings.devmode = this.checked;
    		$$invalidate(0, settings);
    	}

    	$$self.$$set = $$props => {
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    	};

    	$$self.$capture_state = () => ({
    		ipcRenderer,
    		setWindow,
    		settings,
    		timeout
    	});

    	$$self.$inject_state = $$props => {
    		if ("setWindow" in $$props) $$invalidate(1, setWindow = $$props.setWindow);
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("timeout" in $$props) $$invalidate(2, timeout = $$props.timeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timeout, settings*/ 5) {
    			{
    				clearTimeout(timeout);

    				$$invalidate(2, timeout = setTimeout(
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
    		setWindow,
    		timeout,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { settings: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get settings() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settings(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    const file$2 = "node_modules\\svelte-canvas\\src\\components\\Canvas.svelte";

    function create_fragment$3(ctx) {
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
    			add_location(canvas_1, file$2, 80, 0, 1793);
    			set_style(div, "display", "none");
    			add_location(div, file$2, 90, 0, 2004);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const KEY = {};

    function instance$2($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {
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
    			id: create_fragment$3.name
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
    const file$1 = "node_modules\\svelte-canvas\\src\\components\\Layer.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "data-layer-id", /*layerId*/ ctx[0]);
    			add_location(div, file$1, 24, 0, 548);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { setup: 1, render: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Layer",
    			options,
    			id: create_fragment$2.name
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

    /******************************************************************************
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

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    /** @deprecated */
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    var COMMON_MIME_TYPES = new Map([
        ['avi', 'video/avi'],
        ['gif', 'image/gif'],
        ['ico', 'image/x-icon'],
        ['jpeg', 'image/jpeg'],
        ['jpg', 'image/jpeg'],
        ['mkv', 'video/x-matroska'],
        ['mov', 'video/quicktime'],
        ['mp4', 'video/mp4'],
        ['pdf', 'application/pdf'],
        ['png', 'image/png'],
        ['zip', 'application/zip'],
        ['doc', 'application/msword'],
        ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    ]);
    function toFileWithPath(file, path) {
        var f = withMimeType(file);
        if (typeof f.path !== 'string') { // on electron, path is already set to the absolute path
            var webkitRelativePath = file.webkitRelativePath;
            Object.defineProperty(f, 'path', {
                value: typeof path === 'string'
                    ? path
                    // If <input webkitdirectory> is set,
                    // the File will have a {webkitRelativePath} property
                    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory
                    : typeof webkitRelativePath === 'string' && webkitRelativePath.length > 0
                        ? webkitRelativePath
                        : file.name,
                writable: false,
                configurable: false,
                enumerable: true
            });
        }
        return f;
    }
    function withMimeType(file) {
        var name = file.name;
        var hasExtension = name && name.lastIndexOf('.') !== -1;
        if (hasExtension && !file.type) {
            var ext = name.split('.')
                .pop().toLowerCase();
            var type = COMMON_MIME_TYPES.get(ext);
            if (type) {
                Object.defineProperty(file, 'type', {
                    value: type,
                    writable: false,
                    configurable: false,
                    enumerable: true
                });
            }
        }
        return file;
    }

    var FILES_TO_IGNORE = [
        // Thumbnail cache files for macOS and Windows
        '.DS_Store',
        'Thumbs.db' // Windows
    ];
    /**
     * Convert a DragEvent's DataTrasfer object to a list of File objects
     * NOTE: If some of the items are folders,
     * everything will be flattened and placed in the same list but the paths will be kept as a {path} property.
     * @param evt
     */
    function fromEvent(evt) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isDragEvt(evt) && evt.dataTransfer
                        ? getDataTransferFiles(evt.dataTransfer, evt.type)
                        : getInputFiles(evt)];
            });
        });
    }
    function isDragEvt(value) {
        return !!value.dataTransfer;
    }
    function getInputFiles(evt) {
        var files = isInput(evt.target)
            ? evt.target.files
                ? fromList(evt.target.files)
                : []
            : [];
        return files.map(function (file) { return toFileWithPath(file); });
    }
    function isInput(value) {
        return value !== null;
    }
    function getDataTransferFiles(dt, type) {
        return __awaiter(this, void 0, void 0, function () {
            var items, files;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!dt.items) return [3 /*break*/, 2];
                        items = fromList(dt.items)
                            .filter(function (item) { return item.kind === 'file'; });
                        // According to https://html.spec.whatwg.org/multipage/dnd.html#dndevents,
                        // only 'dragstart' and 'drop' has access to the data (source node)
                        if (type !== 'drop') {
                            return [2 /*return*/, items];
                        }
                        return [4 /*yield*/, Promise.all(items.map(toFilePromises))];
                    case 1:
                        files = _a.sent();
                        return [2 /*return*/, noIgnoredFiles(flatten(files))];
                    case 2: return [2 /*return*/, noIgnoredFiles(fromList(dt.files)
                            .map(function (file) { return toFileWithPath(file); }))];
                }
            });
        });
    }
    function noIgnoredFiles(files) {
        return files.filter(function (file) { return FILES_TO_IGNORE.indexOf(file.name) === -1; });
    }
    // IE11 does not support Array.from()
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Browser_compatibility
    // https://developer.mozilla.org/en-US/docs/Web/API/FileList
    // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList
    function fromList(items) {
        var files = [];
        // tslint:disable: prefer-for-of
        for (var i = 0; i < items.length; i++) {
            var file = items[i];
            files.push(file);
        }
        return files;
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem
    function toFilePromises(item) {
        if (typeof item.webkitGetAsEntry !== 'function') {
            return fromDataTransferItem(item);
        }
        var entry = item.webkitGetAsEntry();
        // Safari supports dropping an image node from a different window and can be retrieved using
        // the DataTransferItem.getAsFile() API
        // NOTE: FileSystemEntry.file() throws if trying to get the file
        if (entry && entry.isDirectory) {
            return fromDirEntry(entry);
        }
        return fromDataTransferItem(item);
    }
    function flatten(items) {
        return items.reduce(function (acc, files) { return __spread(acc, (Array.isArray(files) ? flatten(files) : [files])); }, []);
    }
    function fromDataTransferItem(item) {
        var file = item.getAsFile();
        if (!file) {
            return Promise.reject(item + " is not a File");
        }
        var fwp = toFileWithPath(file);
        return Promise.resolve(fwp);
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry
    function fromEntry(entry) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, entry.isDirectory ? fromDirEntry(entry) : fromFileEntry(entry)];
            });
        });
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry
    function fromDirEntry(entry) {
        var reader = entry.createReader();
        return new Promise(function (resolve, reject) {
            var entries = [];
            function readEntries() {
                var _this = this;
                // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader
                // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries
                reader.readEntries(function (batch) { return __awaiter(_this, void 0, void 0, function () {
                    var files, err_1, items;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!!batch.length) return [3 /*break*/, 5];
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, Promise.all(entries)];
                            case 2:
                                files = _a.sent();
                                resolve(files);
                                return [3 /*break*/, 4];
                            case 3:
                                err_1 = _a.sent();
                                reject(err_1);
                                return [3 /*break*/, 4];
                            case 4: return [3 /*break*/, 6];
                            case 5:
                                items = Promise.all(batch.map(fromEntry));
                                entries.push(items);
                                // Continue reading
                                readEntries();
                                _a.label = 6;
                            case 6: return [2 /*return*/];
                        }
                    });
                }); }, function (err) {
                    reject(err);
                });
            }
            readEntries();
        });
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileEntry
    function fromFileEntry(entry) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        entry.file(function (file) {
                            var fwp = toFileWithPath(file, entry.fullPath);
                            resolve(fwp);
                        }, function (err) {
                            reject(err);
                        });
                    })];
            });
        });
    }

    /**
     * Check if the provided file type should be accepted by the input with accept attribute.
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Input#attr-accept
     *
     * Inspired by https://github.com/enyo/dropzone
     *
     * @param file {File} https://developer.mozilla.org/en-US/docs/Web/API/File
     * @param acceptedFiles {string}
     * @returns {boolean}
     */

    function accepts(file, acceptedFiles) {
      if (file && acceptedFiles) {
        const acceptedFilesArray = Array.isArray(acceptedFiles)
          ? acceptedFiles
          : acceptedFiles.split(",");
        const fileName = file.name || "";
        const mimeType = (file.type || "").toLowerCase();
        const baseMimeType = mimeType.replace(/\/.*$/, "");

        return acceptedFilesArray.some((type) => {
          const validType = type.trim().toLowerCase();
          if (validType.charAt(0) === ".") {
            return fileName.toLowerCase().endsWith(validType);
          } else if (validType.endsWith("/*")) {
            // This is something like a image/* mime type
            return baseMimeType === validType.replace(/\/.*$/, "");
          }
          return mimeType === validType;
        });
      }
      return true;
    }

    // Error codes
    const FILE_INVALID_TYPE = "file-invalid-type";
    const FILE_TOO_LARGE = "file-too-large";
    const FILE_TOO_SMALL = "file-too-small";
    const TOO_MANY_FILES = "too-many-files";

    // File Errors
    const getInvalidTypeRejectionErr = (accept) => {
      accept = Array.isArray(accept) && accept.length === 1 ? accept[0] : accept;
      const messageSuffix = Array.isArray(accept)
        ? `one of ${accept.join(", ")}`
        : accept;
      return {
        code: FILE_INVALID_TYPE,
        message: `File type must be ${messageSuffix}`,
      };
    };

    const getTooLargeRejectionErr = (maxSize) => {
      return {
        code: FILE_TOO_LARGE,
        message: `File is larger than ${maxSize} bytes`,
      };
    };

    const getTooSmallRejectionErr = (minSize) => {
      return {
        code: FILE_TOO_SMALL,
        message: `File is smaller than ${minSize} bytes`,
      };
    };

    const TOO_MANY_FILES_REJECTION = {
      code: TOO_MANY_FILES,
      message: "Too many files",
    };

    // Firefox versions prior to 53 return a bogus MIME type for every file drag, so dragovers with
    // that MIME type will always be accepted
    function fileAccepted(file, accept) {
      const isAcceptable =
        file.type === "application/x-moz-file" || accepts(file, accept);
      return [
        isAcceptable,
        isAcceptable ? null : getInvalidTypeRejectionErr(accept),
      ];
    }

    function fileMatchSize(file, minSize, maxSize) {
      if (isDefined(file.size)) {
        if (isDefined(minSize) && isDefined(maxSize)) {
          if (file.size > maxSize) return [false, getTooLargeRejectionErr(maxSize)];
          if (file.size < minSize) return [false, getTooSmallRejectionErr(minSize)];
        } else if (isDefined(minSize) && file.size < minSize)
          return [false, getTooSmallRejectionErr(minSize)];
        else if (isDefined(maxSize) && file.size > maxSize)
          return [false, getTooLargeRejectionErr(maxSize)];
      }
      return [true, null];
    }

    function isDefined(value) {
      return value !== undefined && value !== null;
    }

    function allFilesAccepted({
      files,
      accept,
      minSize,
      maxSize,
      multiple,
    }) {
      if (!multiple && files.length > 1) {
        return false;
      }

      return files.every((file) => {
        const [accepted] = fileAccepted(file, accept);
        const [sizeMatch] = fileMatchSize(file, minSize, maxSize);
        return accepted && sizeMatch;
      });
    }

    // React's synthetic events has event.isPropagationStopped,
    // but to remain compatibility with other libs (Preact) fall back
    // to check event.cancelBubble
    function isPropagationStopped(event) {
      if (typeof event.isPropagationStopped === "function") {
        return event.isPropagationStopped();
      } else if (typeof event.cancelBubble !== "undefined") {
        return event.cancelBubble;
      }
      return false;
    }

    function isEvtWithFiles(event) {
      if (!event.dataTransfer) {
        return !!event.target && !!event.target.files;
      }
      // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
      // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file
      return Array.prototype.some.call(
        event.dataTransfer.types,
        (type) => type === "Files" || type === "application/x-moz-file"
      );
    }

    // allow the entire document to be a drag target
    function onDocumentDragOver(event) {
      event.preventDefault();
    }

    function isIe(userAgent) {
      return (
        userAgent.indexOf("MSIE") !== -1 || userAgent.indexOf("Trident/") !== -1
      );
    }

    function isEdge(userAgent) {
      return userAgent.indexOf("Edge/") !== -1;
    }

    function isIeOrEdge(userAgent = window.navigator.userAgent) {
      return isIe(userAgent) || isEdge(userAgent);
    }

    /**
     * This is intended to be used to compose event handlers
     * They are executed in order until one of them calls `event.isPropagationStopped()`.
     * Note that the check is done on the first invoke too,
     * meaning that if propagation was stopped before invoking the fns,
     * no handlers will be executed.
     *
     * @param {Function} fns the event hanlder functions
     * @return {Function} the event handler to add to an element
     */
    function composeEventHandlers(...fns) {
      return (event, ...args) =>
        fns.some((fn) => {
          if (!isPropagationStopped(event) && fn) {
            fn(event, ...args);
          }
          return isPropagationStopped(event);
        });
    }

    /* node_modules\svelte-file-dropzone\src\components\Dropzone.svelte generated by Svelte v3.38.3 */
    const file = "node_modules\\svelte-file-dropzone\\src\\components\\Dropzone.svelte";

    // (350:8)       
    function fallback_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Drag 'n' drop some files here, or click to select files";
    			add_location(p, file, 350, 4, 9206);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(350:8)       ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let input;
    	let t;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[28].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[27], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(input, "accept", /*accept*/ ctx[0]);
    			input.multiple = /*multiple*/ ctx[1];
    			attr_dev(input, "type", "file");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "tabindex", "-1");
    			set_style(input, "display", "none");
    			add_location(input, file, 339, 2, 8975);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", div_class_value = "" + ((/*disableDefaultStyles*/ ctx[4] ? "" : "dropzone") + "\r\n  " + /*containerClasses*/ ctx[2] + " svelte-817dg2"));
    			attr_dev(div, "style", /*containerStyles*/ ctx[3]);
    			add_location(div, file, 325, 0, 8444);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			/*input_binding*/ ctx[29](input);
    			append_dev(div, t);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(div, null);
    			}

    			/*div_binding*/ ctx[30](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*onDropCb*/ ctx[14], false, false, false),
    					listen_dev(input, "click", onInputElementClick, false, false, false),
    					listen_dev(div, "keydown", /*composeKeyboardHandler*/ ctx[16](/*onKeyDownCb*/ ctx[7]), false, false, false),
    					listen_dev(div, "focus", /*composeKeyboardHandler*/ ctx[16](/*onFocusCb*/ ctx[8]), false, false, false),
    					listen_dev(div, "blur", /*composeKeyboardHandler*/ ctx[16](/*onBlurCb*/ ctx[9]), false, false, false),
    					listen_dev(div, "click", /*composeHandler*/ ctx[15](/*onClickCb*/ ctx[10]), false, false, false),
    					listen_dev(div, "dragenter", /*composeDragHandler*/ ctx[17](/*onDragEnterCb*/ ctx[11]), false, false, false),
    					listen_dev(div, "dragover", /*composeDragHandler*/ ctx[17](/*onDragOverCb*/ ctx[12]), false, false, false),
    					listen_dev(div, "dragleave", /*composeDragHandler*/ ctx[17](/*onDragLeaveCb*/ ctx[13]), false, false, false),
    					listen_dev(div, "drop", /*composeDragHandler*/ ctx[17](/*onDropCb*/ ctx[14]), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*accept*/ 1) {
    				attr_dev(input, "accept", /*accept*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*multiple*/ 2) {
    				prop_dev(input, "multiple", /*multiple*/ ctx[1]);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 134217728)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[27], !current ? [-1, -1] : dirty, null, null);
    				}
    			}

    			if (!current || dirty[0] & /*disableDefaultStyles, containerClasses*/ 20 && div_class_value !== (div_class_value = "" + ((/*disableDefaultStyles*/ ctx[4] ? "" : "dropzone") + "\r\n  " + /*containerClasses*/ ctx[2] + " svelte-817dg2"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty[0] & /*containerStyles*/ 8) {
    				attr_dev(div, "style", /*containerStyles*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*input_binding*/ ctx[29](null);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			/*div_binding*/ ctx[30](null);
    			mounted = false;
    			run_all(dispose);
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

    function onInputElementClick(event) {
    	event.stopPropagation();
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dropzone", slots, ['default']);
    	let { accept } = $$props; // string or string[]
    	let { disabled = false } = $$props;
    	let { getFilesFromEvent = fromEvent } = $$props;
    	let { maxSize = Infinity } = $$props;
    	let { minSize = 0 } = $$props;
    	let { multiple = true } = $$props;
    	let { preventDropOnDocument = true } = $$props;
    	let { noClick = false } = $$props;
    	let { noKeyboard = false } = $$props;
    	let { noDrag = false } = $$props;
    	let { noDragEventsBubbling = false } = $$props;
    	let { containerClasses = "" } = $$props;
    	let { containerStyles = "" } = $$props;
    	let { disableDefaultStyles = false } = $$props;
    	const dispatch = createEventDispatcher();

    	//state
    	let state = {
    		isFocused: false,
    		isFileDialogActive: false,
    		isDragActive: false,
    		isDragAccept: false,
    		isDragReject: false,
    		draggedFiles: [],
    		acceptedFiles: [],
    		fileRejections: []
    	};

    	let rootRef;
    	let inputRef;

    	function resetState() {
    		state.isFileDialogActive = false;
    		state.isDragActive = false;
    		state.draggedFiles = [];
    		state.acceptedFiles = [];
    		state.fileRejections = [];
    	}

    	// Fn for opening the file dialog programmatically
    	function openFileDialog() {
    		if (inputRef) {
    			$$invalidate(6, inputRef.value = null, inputRef); // TODO check if null needs to be set
    			state.isFileDialogActive = true;
    			inputRef.click();
    		}
    	}

    	// Cb to open the file dialog when SPACE/ENTER occurs on the dropzone
    	function onKeyDownCb(event) {
    		// Ignore keyboard events bubbling up the DOM tree
    		if (!rootRef || !rootRef.isEqualNode(event.target)) {
    			return;
    		}

    		if (event.keyCode === 32 || event.keyCode === 13) {
    			event.preventDefault();
    			openFileDialog();
    		}
    	}

    	// Update focus state for the dropzone
    	function onFocusCb() {
    		state.isFocused = true;
    	}

    	function onBlurCb() {
    		state.isFocused = false;
    	}

    	// Cb to open the file dialog when click occurs on the dropzone
    	function onClickCb() {
    		if (noClick) {
    			return;
    		}

    		// In IE11/Edge the file-browser dialog is blocking, therefore, use setTimeout()
    		// to ensure React can handle state changes
    		// See: https://github.com/react-dropzone/react-dropzone/issues/450
    		if (isIeOrEdge()) {
    			setTimeout(openFileDialog, 0);
    		} else {
    			openFileDialog();
    		}
    	}

    	function onDragEnterCb(event) {
    		event.preventDefault();
    		stopPropagation(event);
    		dragTargetsRef = [...dragTargetsRef, event.target];

    		if (isEvtWithFiles(event)) {
    			Promise.resolve(getFilesFromEvent(event)).then(draggedFiles => {
    				if (isPropagationStopped(event) && !noDragEventsBubbling) {
    					return;
    				}

    				state.draggedFiles = draggedFiles;
    				state.isDragActive = true;
    				dispatch("dragenter", { dragEvent: event });
    			});
    		}
    	}

    	function onDragOverCb(event) {
    		event.preventDefault();
    		stopPropagation(event);

    		if (event.dataTransfer) {
    			try {
    				event.dataTransfer.dropEffect = "copy";
    			} catch {
    				
    			} /* eslint-disable-line no-empty */
    		}

    		if (isEvtWithFiles(event)) {
    			dispatch("dragover", { dragEvent: event });
    		}

    		return false;
    	}

    	function onDragLeaveCb(event) {
    		event.preventDefault();
    		stopPropagation(event);

    		// Only deactivate once the dropzone and all children have been left
    		const targets = dragTargetsRef.filter(target => rootRef && rootRef.contains(target));

    		// Make sure to remove a target present multiple times only once
    		// (Firefox may fire dragenter/dragleave multiple times on the same element)
    		const targetIdx = targets.indexOf(event.target);

    		if (targetIdx !== -1) {
    			targets.splice(targetIdx, 1);
    		}

    		dragTargetsRef = targets;

    		if (targets.length > 0) {
    			return;
    		}

    		state.isDragActive = false;
    		state.draggedFiles = [];

    		if (isEvtWithFiles(event)) {
    			dispatch("dragleave", { dragEvent: event });
    		}
    	}

    	function onDropCb(event) {
    		event.preventDefault();
    		stopPropagation(event);
    		dragTargetsRef = [];

    		if (isEvtWithFiles(event)) {
    			Promise.resolve(getFilesFromEvent(event)).then(files => {
    				if (isPropagationStopped(event) && !noDragEventsBubbling) {
    					return;
    				}

    				const acceptedFiles = [];
    				const fileRejections = [];

    				files.forEach(file => {
    					const [accepted, acceptError] = fileAccepted(file, accept);
    					const [sizeMatch, sizeError] = fileMatchSize(file, minSize, maxSize);

    					if (accepted && sizeMatch) {
    						acceptedFiles.push(file);
    					} else {
    						const errors = [acceptError, sizeError].filter(e => e);
    						fileRejections.push({ file, errors });
    					}
    				});

    				if (!multiple && acceptedFiles.length > 1) {
    					// Reject everything and empty accepted files
    					acceptedFiles.forEach(file => {
    						fileRejections.push({ file, errors: [TOO_MANY_FILES_REJECTION] });
    					});

    					acceptedFiles.splice(0);
    				}

    				state.acceptedFiles = acceptedFiles;
    				state.fileRejections = fileRejections;
    				dispatch("drop", { acceptedFiles, fileRejections, event });

    				if (fileRejections.length > 0) {
    					dispatch("droprejected", { fileRejections, event });
    				}

    				if (acceptedFiles.length > 0) {
    					dispatch("dropaccepted", { acceptedFiles, event });
    				}
    			});
    		}

    		resetState();
    	}

    	function composeHandler(fn) {
    		return disabled ? null : fn;
    	}

    	function composeKeyboardHandler(fn) {
    		return noKeyboard ? null : composeHandler(fn);
    	}

    	function composeDragHandler(fn) {
    		return noDrag ? null : composeHandler(fn);
    	}

    	function stopPropagation(event) {
    		if (noDragEventsBubbling) {
    			event.stopPropagation();
    		}
    	}

    	let dragTargetsRef = [];

    	function onDocumentDrop(event) {
    		if (rootRef && rootRef.contains(event.target)) {
    			// If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
    			return;
    		}

    		event.preventDefault();
    		dragTargetsRef = [];
    	}

    	// Update file dialog active state when the window is focused on
    	function onWindowFocus() {
    		// Execute the timeout only if the file dialog is opened in the browser
    		if (state.isFileDialogActive) {
    			setTimeout(
    				() => {
    					if (inputRef) {
    						const { files } = inputRef;

    						if (!files.length) {
    							state.isFileDialogActive = false;
    							dispatch("filedialogcancel");
    						}
    					}
    				},
    				300
    			);
    		}
    	}

    	onMount(() => {
    		window.addEventListener("focus", onWindowFocus, false);

    		if (preventDropOnDocument) {
    			document.addEventListener("dragover", onDocumentDragOver, false);
    			document.addEventListener("drop", onDocumentDrop, false);
    		}
    	});

    	onDestroy(() => {
    		window.removeEventListener("focus", onWindowFocus, false);

    		if (preventDropOnDocument) {
    			document.removeEventListener("dragover", onDocumentDragOver);
    			document.removeEventListener("drop", onDocumentDrop);
    		}
    	});

    	const writable_props = [
    		"accept",
    		"disabled",
    		"getFilesFromEvent",
    		"maxSize",
    		"minSize",
    		"multiple",
    		"preventDropOnDocument",
    		"noClick",
    		"noKeyboard",
    		"noDrag",
    		"noDragEventsBubbling",
    		"containerClasses",
    		"containerStyles",
    		"disableDefaultStyles"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dropzone> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputRef = $$value;
    			$$invalidate(6, inputRef);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			rootRef = $$value;
    			$$invalidate(5, rootRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("accept" in $$props) $$invalidate(0, accept = $$props.accept);
    		if ("disabled" in $$props) $$invalidate(18, disabled = $$props.disabled);
    		if ("getFilesFromEvent" in $$props) $$invalidate(19, getFilesFromEvent = $$props.getFilesFromEvent);
    		if ("maxSize" in $$props) $$invalidate(20, maxSize = $$props.maxSize);
    		if ("minSize" in $$props) $$invalidate(21, minSize = $$props.minSize);
    		if ("multiple" in $$props) $$invalidate(1, multiple = $$props.multiple);
    		if ("preventDropOnDocument" in $$props) $$invalidate(22, preventDropOnDocument = $$props.preventDropOnDocument);
    		if ("noClick" in $$props) $$invalidate(23, noClick = $$props.noClick);
    		if ("noKeyboard" in $$props) $$invalidate(24, noKeyboard = $$props.noKeyboard);
    		if ("noDrag" in $$props) $$invalidate(25, noDrag = $$props.noDrag);
    		if ("noDragEventsBubbling" in $$props) $$invalidate(26, noDragEventsBubbling = $$props.noDragEventsBubbling);
    		if ("containerClasses" in $$props) $$invalidate(2, containerClasses = $$props.containerClasses);
    		if ("containerStyles" in $$props) $$invalidate(3, containerStyles = $$props.containerStyles);
    		if ("disableDefaultStyles" in $$props) $$invalidate(4, disableDefaultStyles = $$props.disableDefaultStyles);
    		if ("$$scope" in $$props) $$invalidate(27, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		fromEvent,
    		allFilesAccepted,
    		composeEventHandlers,
    		fileAccepted,
    		fileMatchSize,
    		isEvtWithFiles,
    		isIeOrEdge,
    		isPropagationStopped,
    		onDocumentDragOver,
    		TOO_MANY_FILES_REJECTION,
    		onMount,
    		onDestroy,
    		createEventDispatcher,
    		accept,
    		disabled,
    		getFilesFromEvent,
    		maxSize,
    		minSize,
    		multiple,
    		preventDropOnDocument,
    		noClick,
    		noKeyboard,
    		noDrag,
    		noDragEventsBubbling,
    		containerClasses,
    		containerStyles,
    		disableDefaultStyles,
    		dispatch,
    		state,
    		rootRef,
    		inputRef,
    		resetState,
    		openFileDialog,
    		onKeyDownCb,
    		onFocusCb,
    		onBlurCb,
    		onClickCb,
    		onDragEnterCb,
    		onDragOverCb,
    		onDragLeaveCb,
    		onDropCb,
    		composeHandler,
    		composeKeyboardHandler,
    		composeDragHandler,
    		stopPropagation,
    		dragTargetsRef,
    		onDocumentDrop,
    		onWindowFocus,
    		onInputElementClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("accept" in $$props) $$invalidate(0, accept = $$props.accept);
    		if ("disabled" in $$props) $$invalidate(18, disabled = $$props.disabled);
    		if ("getFilesFromEvent" in $$props) $$invalidate(19, getFilesFromEvent = $$props.getFilesFromEvent);
    		if ("maxSize" in $$props) $$invalidate(20, maxSize = $$props.maxSize);
    		if ("minSize" in $$props) $$invalidate(21, minSize = $$props.minSize);
    		if ("multiple" in $$props) $$invalidate(1, multiple = $$props.multiple);
    		if ("preventDropOnDocument" in $$props) $$invalidate(22, preventDropOnDocument = $$props.preventDropOnDocument);
    		if ("noClick" in $$props) $$invalidate(23, noClick = $$props.noClick);
    		if ("noKeyboard" in $$props) $$invalidate(24, noKeyboard = $$props.noKeyboard);
    		if ("noDrag" in $$props) $$invalidate(25, noDrag = $$props.noDrag);
    		if ("noDragEventsBubbling" in $$props) $$invalidate(26, noDragEventsBubbling = $$props.noDragEventsBubbling);
    		if ("containerClasses" in $$props) $$invalidate(2, containerClasses = $$props.containerClasses);
    		if ("containerStyles" in $$props) $$invalidate(3, containerStyles = $$props.containerStyles);
    		if ("disableDefaultStyles" in $$props) $$invalidate(4, disableDefaultStyles = $$props.disableDefaultStyles);
    		if ("state" in $$props) state = $$props.state;
    		if ("rootRef" in $$props) $$invalidate(5, rootRef = $$props.rootRef);
    		if ("inputRef" in $$props) $$invalidate(6, inputRef = $$props.inputRef);
    		if ("dragTargetsRef" in $$props) dragTargetsRef = $$props.dragTargetsRef;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		accept,
    		multiple,
    		containerClasses,
    		containerStyles,
    		disableDefaultStyles,
    		rootRef,
    		inputRef,
    		onKeyDownCb,
    		onFocusCb,
    		onBlurCb,
    		onClickCb,
    		onDragEnterCb,
    		onDragOverCb,
    		onDragLeaveCb,
    		onDropCb,
    		composeHandler,
    		composeKeyboardHandler,
    		composeDragHandler,
    		disabled,
    		getFilesFromEvent,
    		maxSize,
    		minSize,
    		preventDropOnDocument,
    		noClick,
    		noKeyboard,
    		noDrag,
    		noDragEventsBubbling,
    		$$scope,
    		slots,
    		input_binding,
    		div_binding
    	];
    }

    class Dropzone extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				accept: 0,
    				disabled: 18,
    				getFilesFromEvent: 19,
    				maxSize: 20,
    				minSize: 21,
    				multiple: 1,
    				preventDropOnDocument: 22,
    				noClick: 23,
    				noKeyboard: 24,
    				noDrag: 25,
    				noDragEventsBubbling: 26,
    				containerClasses: 2,
    				containerStyles: 3,
    				disableDefaultStyles: 4
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dropzone",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*accept*/ ctx[0] === undefined && !("accept" in props)) {
    			console.warn("<Dropzone> was created without expected prop 'accept'");
    		}
    	}

    	get accept() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set accept(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getFilesFromEvent() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getFilesFromEvent(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxSize() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxSize(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minSize() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minSize(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get multiple() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiple(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get preventDropOnDocument() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set preventDropOnDocument(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noClick() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noClick(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noKeyboard() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noKeyboard(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noDrag() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noDrag(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noDragEventsBubbling() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noDragEventsBubbling(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerClasses() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerClasses(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerStyles() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerStyles(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disableDefaultStyles() {
    		throw new Error("<Dropzone>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disableDefaultStyles(value) {
    		throw new Error("<Dropzone>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

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

    // (153:2) {#if settingsOpen}
    function create_if_block_1(ctx) {
    	let settings_1;
    	let current;

    	settings_1 = new Settings({
    			props: { settings: /*settings*/ ctx[4] },
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
    			if (dirty & /*settings*/ 16) settings_1_changes.settings = /*settings*/ ctx[4];
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
    		source: "(153:2) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (167:2) {:else}
    function create_else_block(ctx) {
    	let dropzone;
    	let current;

    	dropzone = new Dropzone({
    			props: {
    				disableDefaultStyles: "true",
    				multiple: "false",
    				containerClasses: "drop",
    				containerStyles: "flex-grow:1;",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	dropzone.$on("drop", /*handleFilesSelect*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(dropzone.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dropzone, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dropzone_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				dropzone_changes.$$scope = { dirty, ctx };
    			}

    			dropzone.$set(dropzone_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropzone.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropzone.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dropzone, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(167:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (159:2) {#if file}
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
    			attr_dev(div0, "class", "canvas-container-inner svelte-ter9kq");
    			add_location(div0, file_1, 160, 4, 3619);
    			attr_dev(div1, "class", "canvas-container svelte-ter9kq");
    			toggle_class(div1, "pixelated", /*zoomed*/ ctx[3]);
    			add_location(div1, file_1, 159, 3, 3558);
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

    			if (dirty & /*$$scope, render*/ 32896) {
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
    		source: "(159:2) {#if file}",
    		ctx
    	});

    	return block;
    }

    // (168:3) <Dropzone       on:drop={handleFilesSelect}       disableDefaultStyles="true"      multiple="false"      containerClasses="drop"      containerStyles="flex-grow:1;"     >
    function create_default_slot_2(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let i;
    	let t0;
    	let div1;
    	let t1;
    	let br;
    	let t2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div1 = element("div");
    			t1 = text("Drag a file or");
    			br = element("br");
    			t2 = text("click to select");
    			attr_dev(i, "class", "fas fa-upload");
    			add_location(i, file_1, 177, 7, 4081);
    			attr_dev(div0, "class", "dropzone-inner-icon svelte-ter9kq");
    			add_location(div0, file_1, 176, 6, 4039);
    			add_location(br, file_1, 180, 21, 4188);
    			attr_dev(div1, "class", "dropzone-inner-text svelte-ter9kq");
    			add_location(div1, file_1, 179, 6, 4132);
    			attr_dev(div2, "class", "dropzone-inner svelte-ter9kq");
    			add_location(div2, file_1, 175, 5, 4003);
    			attr_dev(div3, "class", "dropzone-inner-wrapper svelte-ter9kq");
    			add_location(div3, file_1, 174, 4, 3960);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, i);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, t1);
    			append_dev(div1, br);
    			append_dev(div1, t2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(168:3) <Dropzone       on:drop={handleFilesSelect}       disableDefaultStyles=\\\"true\\\"      multiple=\\\"false\\\"      containerClasses=\\\"drop\\\"      containerStyles=\\\"flex-grow:1;\\\"     >",
    		ctx
    	});

    	return block;
    }

    // (162:8) <Canvas width={width} height={height}>
    function create_default_slot_1(ctx) {
    	let layer;
    	let current;

    	layer = new Layer({
    			props: { render: /*render*/ ctx[7] },
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
    			if (dirty & /*render*/ 128) layer_changes.render = /*render*/ ctx[7];
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
    		source: "(162:8) <Canvas width={width} height={height}>",
    		ctx
    	});

    	return block;
    }

    // (152:1) <Desktop>
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
    		source: "(152:1) <Desktop>",
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
    				settingsOpen: /*settingsOpen*/ ctx[5]
    			},
    			$$inline: true
    		});

    	titlebar.$on("clear", /*clear_handler*/ ctx[11]);
    	titlebar.$on("settingsOpen", /*settingsOpen_handler*/ ctx[12]);

    	toolbox = new Toolbox({
    			props: {
    				settingsOpen: /*settingsOpen*/ ctx[5],
    				fileSelected: /*file*/ ctx[0]
    			},
    			$$inline: true
    		});

    	desktop = new Desktop({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

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
    			attr_dev(div0, "class", "backdrop-bg backdrop-top svelte-ter9kq");
    			add_location(div0, file_1, 125, 1, 2857);
    			attr_dev(div1, "class", "backdrop-bg backdrop-right svelte-ter9kq");
    			add_location(div1, file_1, 126, 1, 2904);
    			attr_dev(div2, "class", "backdrop-bg backdrop-bottom svelte-ter9kq");
    			add_location(div2, file_1, 127, 1, 2953);
    			attr_dev(div3, "class", "backdrop-bg backdrop-left svelte-ter9kq");
    			add_location(div3, file_1, 128, 1, 3003);
    			attr_dev(div4, "class", "backdrop svelte-ter9kq");
    			add_location(div4, file_1, 124, 0, 2832);
    			attr_dev(main, "class", "svelte-ter9kq");
    			add_location(main, file_1, 130, 0, 3058);
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
    				dispose = listen_dev(window, "paste", /*handlePaste*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const titlebar_changes = {};
    			if (dirty & /*file*/ 1) titlebar_changes.fileSelected = /*file*/ ctx[0];
    			if (dirty & /*settingsOpen*/ 32) titlebar_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			titlebar.$set(titlebar_changes);
    			const toolbox_changes = {};
    			if (dirty & /*settingsOpen*/ 32) toolbox_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			if (dirty & /*file*/ 1) toolbox_changes.fileSelected = /*file*/ ctx[0];
    			toolbox.$set(toolbox_changes);
    			const desktop_changes = {};

    			if (dirty & /*$$scope, zoomed, width, height, render, file, settings, settingsOpen*/ 32959) {
    				desktop_changes.$$scope = { dirty, ctx };
    			}

    			desktop.$set(desktop_changes);
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

    function instance_1($$self, $$props, $$invalidate) {
    	let render;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const { ipcRenderer } = require("electron");
    	let file = false;
    	let width;
    	let height;
    	let zoomed = false;
    	let settings = false;
    	let settingsOpen = false;

    	ipcRenderer.on("settings", (event, arg) => {
    		$$invalidate(4, settings = arg);
    	});

    	let img = new Image();
    	var instance;

    	function initPan(element) {
    		try {
    			console.log("test");
    			instance.destroy();
    		} catch(e) {
    			console.log("errrrr", e);
    		}

    		// And pass it to panzoom
    		$$invalidate(6, instance = Panzoom(element, { maxScale: 10000 }));

    		element.parentElement.addEventListener("wheel", instance.zoomWithWheel);

    		element.addEventListener("panzoomchange", event => {
    			if (event.detail.scale >= 10) $$invalidate(3, zoomed = true); else $$invalidate(3, zoomed = false);
    		});
    	}

    	

    	function handleFilesSelect(e) {
    		const { acceptedFiles } = e.detail;
    		ipcRenderer.send("file", acceptedFiles[0].path);
    	}

    	img.onload = function () {
    		$$invalidate(1, width = img.width);
    		$$invalidate(2, height = img.height);
    	};

    	ipcRenderer.on("deliver", (event, arg) => {
    		console.log("loading file!");
    		$$invalidate(10, img.src = arg, img);
    		$$invalidate(0, file = arg);
    	});

    	/*
    	NOTE!!!
    	Currently the drop zone gets hidden when the image
    	is shown, add overwriting on repeated drop into
    	the settings later.

    	Maybe add a setting that separates clicking
    	into a separate button.

    	Also enable copy paste.
    */
    	function handlePaste(event) {
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
    			if (file) return;
    			$$invalidate(10, img.src = e.target.result, img);
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

    	$$self.$capture_state = () => ({
    		Titlebar,
    		Desktop,
    		Toolbox,
    		Settings,
    		Canvas,
    		Layer,
    		t,
    		Dropzone,
    		Panzoom,
    		ipcRenderer,
    		file,
    		width,
    		height,
    		zoomed,
    		settings,
    		settingsOpen,
    		img,
    		instance,
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
    		if ("img" in $$props) $$invalidate(10, img = $$props.img);
    		if ("instance" in $$props) $$invalidate(6, instance = $$props.instance);
    		if ("render" in $$props) $$invalidate(7, render = $$props.render);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*img*/ 1024) {
    			$$invalidate(7, render = ({ context }) => {
    				context.drawImage(img, 0, 0);

    				// just grab a DOM element
    				let element = document.querySelector(".canvas-container-inner");

    				initPan(element);
    			}); /*
    instance.on('zoom', function(e) {
    	let data = instance.getTransform();
    	if (data.scale >= 10) zoomed = true;
    	else zoomed = false;
    });*/
    		}
    	};

    	return [
    		file,
    		width,
    		height,
    		zoomed,
    		settings,
    		settingsOpen,
    		instance,
    		render,
    		handleFilesSelect,
    		handlePaste,
    		img,
    		clear_handler,
    		settingsOpen_handler
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
