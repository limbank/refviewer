
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    const identity = x => x;
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop$1;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
    }

    const is_client = typeof window !== 'undefined';
    let now$1 = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop$1;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
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

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash$2(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash$2(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop$1, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now$1() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop$1, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now$1() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    var top = 'top';
    var bottom = 'bottom';
    var right = 'right';
    var left = 'left';
    var auto = 'auto';
    var basePlacements = [top, bottom, right, left];
    var start$1 = 'start';
    var end = 'end';
    var clippingParents = 'clippingParents';
    var viewport = 'viewport';
    var popper = 'popper';
    var reference = 'reference';
    var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
      return acc.concat([placement + "-" + start$1, placement + "-" + end]);
    }, []);
    var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
      return acc.concat([placement, placement + "-" + start$1, placement + "-" + end]);
    }, []); // modifiers that need to read the DOM

    var beforeRead = 'beforeRead';
    var read = 'read';
    var afterRead = 'afterRead'; // pure-logic modifiers

    var beforeMain = 'beforeMain';
    var main = 'main';
    var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

    var beforeWrite = 'beforeWrite';
    var write = 'write';
    var afterWrite = 'afterWrite';
    var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

    function getNodeName(element) {
      return element ? (element.nodeName || '').toLowerCase() : null;
    }

    function getWindow(node) {
      if (node == null) {
        return window;
      }

      if (node.toString() !== '[object Window]') {
        var ownerDocument = node.ownerDocument;
        return ownerDocument ? ownerDocument.defaultView || window : window;
      }

      return node;
    }

    function isElement(node) {
      var OwnElement = getWindow(node).Element;
      return node instanceof OwnElement || node instanceof Element;
    }

    function isHTMLElement(node) {
      var OwnElement = getWindow(node).HTMLElement;
      return node instanceof OwnElement || node instanceof HTMLElement;
    }

    function isShadowRoot(node) {
      // IE 11 has no ShadowRoot
      if (typeof ShadowRoot === 'undefined') {
        return false;
      }

      var OwnElement = getWindow(node).ShadowRoot;
      return node instanceof OwnElement || node instanceof ShadowRoot;
    }

    // and applies them to the HTMLElements such as popper and arrow

    function applyStyles(_ref) {
      var state = _ref.state;
      Object.keys(state.elements).forEach(function (name) {
        var style = state.styles[name] || {};
        var attributes = state.attributes[name] || {};
        var element = state.elements[name]; // arrow is optional + virtual elements

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        } // Flow doesn't support to extend this property, but it's the most
        // effective way to apply styles to an HTMLElement
        // $FlowFixMe[cannot-write]


        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function (name) {
          var value = attributes[name];

          if (value === false) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value === true ? '' : value);
          }
        });
      });
    }

    function effect$2(_ref2) {
      var state = _ref2.state;
      var initialStyles = {
        popper: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        arrow: {
          position: 'absolute'
        },
        reference: {}
      };
      Object.assign(state.elements.popper.style, initialStyles.popper);
      state.styles = initialStyles;

      if (state.elements.arrow) {
        Object.assign(state.elements.arrow.style, initialStyles.arrow);
      }

      return function () {
        Object.keys(state.elements).forEach(function (name) {
          var element = state.elements[name];
          var attributes = state.attributes[name] || {};
          var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

          var style = styleProperties.reduce(function (style, property) {
            style[property] = '';
            return style;
          }, {}); // arrow is optional + virtual elements

          if (!isHTMLElement(element) || !getNodeName(element)) {
            return;
          }

          Object.assign(element.style, style);
          Object.keys(attributes).forEach(function (attribute) {
            element.removeAttribute(attribute);
          });
        });
      };
    } // eslint-disable-next-line import/no-unused-modules


    var applyStyles$1 = {
      name: 'applyStyles',
      enabled: true,
      phase: 'write',
      fn: applyStyles,
      effect: effect$2,
      requires: ['computeStyles']
    };

    function getBasePlacement(placement) {
      return placement.split('-')[0];
    }

    var max = Math.max;
    var min = Math.min;
    var round = Math.round;

    function getBoundingClientRect(element, includeScale) {
      if (includeScale === void 0) {
        includeScale = false;
      }

      var rect = element.getBoundingClientRect();
      var scaleX = 1;
      var scaleY = 1;

      if (isHTMLElement(element) && includeScale) {
        var offsetHeight = element.offsetHeight;
        var offsetWidth = element.offsetWidth; // Do not attempt to divide by 0, otherwise we get `Infinity` as scale
        // Fallback to 1 in case both values are `0`

        if (offsetWidth > 0) {
          scaleX = round(rect.width) / offsetWidth || 1;
        }

        if (offsetHeight > 0) {
          scaleY = round(rect.height) / offsetHeight || 1;
        }
      }

      return {
        width: rect.width / scaleX,
        height: rect.height / scaleY,
        top: rect.top / scaleY,
        right: rect.right / scaleX,
        bottom: rect.bottom / scaleY,
        left: rect.left / scaleX,
        x: rect.left / scaleX,
        y: rect.top / scaleY
      };
    }

    // means it doesn't take into account transforms.

    function getLayoutRect(element) {
      var clientRect = getBoundingClientRect(element); // Use the clientRect sizes if it's not been transformed.
      // Fixes https://github.com/popperjs/popper-core/issues/1223

      var width = element.offsetWidth;
      var height = element.offsetHeight;

      if (Math.abs(clientRect.width - width) <= 1) {
        width = clientRect.width;
      }

      if (Math.abs(clientRect.height - height) <= 1) {
        height = clientRect.height;
      }

      return {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: width,
        height: height
      };
    }

    function contains(parent, child) {
      var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

      if (parent.contains(child)) {
        return true;
      } // then fallback to custom implementation with Shadow DOM support
      else if (rootNode && isShadowRoot(rootNode)) {
          var next = child;

          do {
            if (next && parent.isSameNode(next)) {
              return true;
            } // $FlowFixMe[prop-missing]: need a better way to handle this...


            next = next.parentNode || next.host;
          } while (next);
        } // Give up, the result is false


      return false;
    }

    function getComputedStyle$1(element) {
      return getWindow(element).getComputedStyle(element);
    }

    function isTableElement(element) {
      return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
    }

    function getDocumentElement(element) {
      // $FlowFixMe[incompatible-return]: assume body is always available
      return ((isElement(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
      element.document) || window.document).documentElement;
    }

    function getParentNode(element) {
      if (getNodeName(element) === 'html') {
        return element;
      }

      return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
        // $FlowFixMe[incompatible-return]
        // $FlowFixMe[prop-missing]
        element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
        element.parentNode || ( // DOM Element detected
        isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
        // $FlowFixMe[incompatible-call]: HTMLElement is a Node
        getDocumentElement(element) // fallback

      );
    }

    function getTrueOffsetParent(element) {
      if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
      getComputedStyle$1(element).position === 'fixed') {
        return null;
      }

      return element.offsetParent;
    } // `.offsetParent` reports `null` for fixed elements, while absolute elements
    // return the containing block


    function getContainingBlock(element) {
      var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
      var isIE = navigator.userAgent.indexOf('Trident') !== -1;

      if (isIE && isHTMLElement(element)) {
        // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
        var elementCss = getComputedStyle$1(element);

        if (elementCss.position === 'fixed') {
          return null;
        }
      }

      var currentNode = getParentNode(element);

      if (isShadowRoot(currentNode)) {
        currentNode = currentNode.host;
      }

      while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
        var css = getComputedStyle$1(currentNode); // This is non-exhaustive but covers the most common CSS properties that
        // create a containing block.
        // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

        if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
          return currentNode;
        } else {
          currentNode = currentNode.parentNode;
        }
      }

      return null;
    } // Gets the closest ancestor positioned element. Handles some edge cases,
    // such as table ancestors and cross browser bugs.


    function getOffsetParent(element) {
      var window = getWindow(element);
      var offsetParent = getTrueOffsetParent(element);

      while (offsetParent && isTableElement(offsetParent) && getComputedStyle$1(offsetParent).position === 'static') {
        offsetParent = getTrueOffsetParent(offsetParent);
      }

      if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle$1(offsetParent).position === 'static')) {
        return window;
      }

      return offsetParent || getContainingBlock(element) || window;
    }

    function getMainAxisFromPlacement(placement) {
      return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
    }

    function within(min$1, value, max$1) {
      return max(min$1, min(value, max$1));
    }
    function withinMaxClamp(min, value, max) {
      var v = within(min, value, max);
      return v > max ? max : v;
    }

    function getFreshSideObject() {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }

    function mergePaddingObject(paddingObject) {
      return Object.assign({}, getFreshSideObject(), paddingObject);
    }

    function expandToHashMap(value, keys) {
      return keys.reduce(function (hashMap, key) {
        hashMap[key] = value;
        return hashMap;
      }, {});
    }

    var toPaddingObject = function toPaddingObject(padding, state) {
      padding = typeof padding === 'function' ? padding(Object.assign({}, state.rects, {
        placement: state.placement
      })) : padding;
      return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
    };

    function arrow(_ref) {
      var _state$modifiersData$;

      var state = _ref.state,
          name = _ref.name,
          options = _ref.options;
      var arrowElement = state.elements.arrow;
      var popperOffsets = state.modifiersData.popperOffsets;
      var basePlacement = getBasePlacement(state.placement);
      var axis = getMainAxisFromPlacement(basePlacement);
      var isVertical = [left, right].indexOf(basePlacement) >= 0;
      var len = isVertical ? 'height' : 'width';

      if (!arrowElement || !popperOffsets) {
        return;
      }

      var paddingObject = toPaddingObject(options.padding, state);
      var arrowRect = getLayoutRect(arrowElement);
      var minProp = axis === 'y' ? top : left;
      var maxProp = axis === 'y' ? bottom : right;
      var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
      var startDiff = popperOffsets[axis] - state.rects.reference[axis];
      var arrowOffsetParent = getOffsetParent(arrowElement);
      var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
      var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
      // outside of the popper bounds

      var min = paddingObject[minProp];
      var max = clientSize - arrowRect[len] - paddingObject[maxProp];
      var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
      var offset = within(min, center, max); // Prevents breaking syntax highlighting...

      var axisProp = axis;
      state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
    }

    function effect$1(_ref2) {
      var state = _ref2.state,
          options = _ref2.options;
      var _options$element = options.element,
          arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element;

      if (arrowElement == null) {
        return;
      } // CSS selector


      if (typeof arrowElement === 'string') {
        arrowElement = state.elements.popper.querySelector(arrowElement);

        if (!arrowElement) {
          return;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        if (!isHTMLElement(arrowElement)) {
          console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
        }
      }

      if (!contains(state.elements.popper, arrowElement)) {
        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
        }

        return;
      }

      state.elements.arrow = arrowElement;
    } // eslint-disable-next-line import/no-unused-modules


    var arrow$1 = {
      name: 'arrow',
      enabled: true,
      phase: 'main',
      fn: arrow,
      effect: effect$1,
      requires: ['popperOffsets'],
      requiresIfExists: ['preventOverflow']
    };

    function getVariation(placement) {
      return placement.split('-')[1];
    }

    var unsetSides = {
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto'
    }; // Round the offsets to the nearest suitable subpixel based on the DPR.
    // Zooming can change the DPR, but it seems to report a value that will
    // cleanly divide the values into the appropriate subpixels.

    function roundOffsetsByDPR(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var win = window;
      var dpr = win.devicePixelRatio || 1;
      return {
        x: round(x * dpr) / dpr || 0,
        y: round(y * dpr) / dpr || 0
      };
    }

    function mapToStyles(_ref2) {
      var _Object$assign2;

      var popper = _ref2.popper,
          popperRect = _ref2.popperRect,
          placement = _ref2.placement,
          variation = _ref2.variation,
          offsets = _ref2.offsets,
          position = _ref2.position,
          gpuAcceleration = _ref2.gpuAcceleration,
          adaptive = _ref2.adaptive,
          roundOffsets = _ref2.roundOffsets,
          isFixed = _ref2.isFixed;
      var _offsets$x = offsets.x,
          x = _offsets$x === void 0 ? 0 : _offsets$x,
          _offsets$y = offsets.y,
          y = _offsets$y === void 0 ? 0 : _offsets$y;

      var _ref3 = typeof roundOffsets === 'function' ? roundOffsets({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref3.x;
      y = _ref3.y;
      var hasX = offsets.hasOwnProperty('x');
      var hasY = offsets.hasOwnProperty('y');
      var sideX = left;
      var sideY = top;
      var win = window;

      if (adaptive) {
        var offsetParent = getOffsetParent(popper);
        var heightProp = 'clientHeight';
        var widthProp = 'clientWidth';

        if (offsetParent === getWindow(popper)) {
          offsetParent = getDocumentElement(popper);

          if (getComputedStyle$1(offsetParent).position !== 'static' && position === 'absolute') {
            heightProp = 'scrollHeight';
            widthProp = 'scrollWidth';
          }
        } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it


        offsetParent = offsetParent;

        if (placement === top || (placement === left || placement === right) && variation === end) {
          sideY = bottom;
          var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : // $FlowFixMe[prop-missing]
          offsetParent[heightProp];
          y -= offsetY - popperRect.height;
          y *= gpuAcceleration ? 1 : -1;
        }

        if (placement === left || (placement === top || placement === bottom) && variation === end) {
          sideX = right;
          var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : // $FlowFixMe[prop-missing]
          offsetParent[widthProp];
          x -= offsetX - popperRect.width;
          x *= gpuAcceleration ? 1 : -1;
        }
      }

      var commonStyles = Object.assign({
        position: position
      }, adaptive && unsetSides);

      var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref4.x;
      y = _ref4.y;

      if (gpuAcceleration) {
        var _Object$assign;

        return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
      }

      return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
    }

    function computeStyles(_ref5) {
      var state = _ref5.state,
          options = _ref5.options;
      var _options$gpuAccelerat = options.gpuAcceleration,
          gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
          _options$adaptive = options.adaptive,
          adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
          _options$roundOffsets = options.roundOffsets,
          roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

      if (process.env.NODE_ENV !== "production") {
        var transitionProperty = getComputedStyle$1(state.elements.popper).transitionProperty || '';

        if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
          return transitionProperty.indexOf(property) >= 0;
        })) {
          console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
        }
      }

      var commonStyles = {
        placement: getBasePlacement(state.placement),
        variation: getVariation(state.placement),
        popper: state.elements.popper,
        popperRect: state.rects.popper,
        gpuAcceleration: gpuAcceleration,
        isFixed: state.options.strategy === 'fixed'
      };

      if (state.modifiersData.popperOffsets != null) {
        state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.popperOffsets,
          position: state.options.strategy,
          adaptive: adaptive,
          roundOffsets: roundOffsets
        })));
      }

      if (state.modifiersData.arrow != null) {
        state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.arrow,
          position: 'absolute',
          adaptive: false,
          roundOffsets: roundOffsets
        })));
      }

      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-placement': state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var computeStyles$1 = {
      name: 'computeStyles',
      enabled: true,
      phase: 'beforeWrite',
      fn: computeStyles,
      data: {}
    };

    var passive = {
      passive: true
    };

    function effect(_ref) {
      var state = _ref.state,
          instance = _ref.instance,
          options = _ref.options;
      var _options$scroll = options.scroll,
          scroll = _options$scroll === void 0 ? true : _options$scroll,
          _options$resize = options.resize,
          resize = _options$resize === void 0 ? true : _options$resize;
      var window = getWindow(state.elements.popper);
      var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

      if (scroll) {
        scrollParents.forEach(function (scrollParent) {
          scrollParent.addEventListener('scroll', instance.update, passive);
        });
      }

      if (resize) {
        window.addEventListener('resize', instance.update, passive);
      }

      return function () {
        if (scroll) {
          scrollParents.forEach(function (scrollParent) {
            scrollParent.removeEventListener('scroll', instance.update, passive);
          });
        }

        if (resize) {
          window.removeEventListener('resize', instance.update, passive);
        }
      };
    } // eslint-disable-next-line import/no-unused-modules


    var eventListeners = {
      name: 'eventListeners',
      enabled: true,
      phase: 'write',
      fn: function fn() {},
      effect: effect,
      data: {}
    };

    var hash$1 = {
      left: 'right',
      right: 'left',
      bottom: 'top',
      top: 'bottom'
    };
    function getOppositePlacement(placement) {
      return placement.replace(/left|right|bottom|top/g, function (matched) {
        return hash$1[matched];
      });
    }

    var hash = {
      start: 'end',
      end: 'start'
    };
    function getOppositeVariationPlacement(placement) {
      return placement.replace(/start|end/g, function (matched) {
        return hash[matched];
      });
    }

    function getWindowScroll(node) {
      var win = getWindow(node);
      var scrollLeft = win.pageXOffset;
      var scrollTop = win.pageYOffset;
      return {
        scrollLeft: scrollLeft,
        scrollTop: scrollTop
      };
    }

    function getWindowScrollBarX(element) {
      // If <html> has a CSS width greater than the viewport, then this will be
      // incorrect for RTL.
      // Popper 1 is broken in this case and never had a bug report so let's assume
      // it's not an issue. I don't think anyone ever specifies width on <html>
      // anyway.
      // Browsers where the left scrollbar doesn't cause an issue report `0` for
      // this (e.g. Edge 2019, IE11, Safari)
      return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
    }

    function getViewportRect(element) {
      var win = getWindow(element);
      var html = getDocumentElement(element);
      var visualViewport = win.visualViewport;
      var width = html.clientWidth;
      var height = html.clientHeight;
      var x = 0;
      var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
      // can be obscured underneath it.
      // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
      // if it isn't open, so if this isn't available, the popper will be detected
      // to overflow the bottom of the screen too early.

      if (visualViewport) {
        width = visualViewport.width;
        height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
        // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
        // errors due to floating point numbers, so we need to check precision.
        // Safari returns a number <= 0, usually < -1 when pinch-zoomed
        // Feature detection fails in mobile emulation mode in Chrome.
        // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
        // 0.001
        // Fallback here: "Not Safari" userAgent

        if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          x = visualViewport.offsetLeft;
          y = visualViewport.offsetTop;
        }
      }

      return {
        width: width,
        height: height,
        x: x + getWindowScrollBarX(element),
        y: y
      };
    }

    // of the `<html>` and `<body>` rect bounds if horizontally scrollable

    function getDocumentRect(element) {
      var _element$ownerDocumen;

      var html = getDocumentElement(element);
      var winScroll = getWindowScroll(element);
      var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
      var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
      var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
      var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
      var y = -winScroll.scrollTop;

      if (getComputedStyle$1(body || html).direction === 'rtl') {
        x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
      }

      return {
        width: width,
        height: height,
        x: x,
        y: y
      };
    }

    function isScrollParent(element) {
      // Firefox wants us to check `-x` and `-y` variations as well
      var _getComputedStyle = getComputedStyle$1(element),
          overflow = _getComputedStyle.overflow,
          overflowX = _getComputedStyle.overflowX,
          overflowY = _getComputedStyle.overflowY;

      return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
    }

    function getScrollParent(node) {
      if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
        // $FlowFixMe[incompatible-return]: assume body is always available
        return node.ownerDocument.body;
      }

      if (isHTMLElement(node) && isScrollParent(node)) {
        return node;
      }

      return getScrollParent(getParentNode(node));
    }

    /*
    given a DOM element, return the list of all scroll parents, up the list of ancesors
    until we get to the top window object. This list is what we attach scroll listeners
    to, because if any of these parent elements scroll, we'll need to re-calculate the
    reference element's position.
    */

    function listScrollParents(element, list) {
      var _element$ownerDocumen;

      if (list === void 0) {
        list = [];
      }

      var scrollParent = getScrollParent(element);
      var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
      var win = getWindow(scrollParent);
      var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
      var updatedList = list.concat(target);
      return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
      updatedList.concat(listScrollParents(getParentNode(target)));
    }

    function rectToClientRect(rect) {
      return Object.assign({}, rect, {
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height
      });
    }

    function getInnerBoundingClientRect(element) {
      var rect = getBoundingClientRect(element);
      rect.top = rect.top + element.clientTop;
      rect.left = rect.left + element.clientLeft;
      rect.bottom = rect.top + element.clientHeight;
      rect.right = rect.left + element.clientWidth;
      rect.width = element.clientWidth;
      rect.height = element.clientHeight;
      rect.x = rect.left;
      rect.y = rect.top;
      return rect;
    }

    function getClientRectFromMixedType(element, clippingParent) {
      return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
    } // A "clipping parent" is an overflowable container with the characteristic of
    // clipping (or hiding) overflowing elements with a position different from
    // `initial`


    function getClippingParents(element) {
      var clippingParents = listScrollParents(getParentNode(element));
      var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle$1(element).position) >= 0;
      var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

      if (!isElement(clipperElement)) {
        return [];
      } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


      return clippingParents.filter(function (clippingParent) {
        return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
      });
    } // Gets the maximum area that the element is visible in due to any number of
    // clipping parents


    function getClippingRect(element, boundary, rootBoundary) {
      var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
      var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
      var firstClippingParent = clippingParents[0];
      var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
        var rect = getClientRectFromMixedType(element, clippingParent);
        accRect.top = max(rect.top, accRect.top);
        accRect.right = min(rect.right, accRect.right);
        accRect.bottom = min(rect.bottom, accRect.bottom);
        accRect.left = max(rect.left, accRect.left);
        return accRect;
      }, getClientRectFromMixedType(element, firstClippingParent));
      clippingRect.width = clippingRect.right - clippingRect.left;
      clippingRect.height = clippingRect.bottom - clippingRect.top;
      clippingRect.x = clippingRect.left;
      clippingRect.y = clippingRect.top;
      return clippingRect;
    }

    function computeOffsets(_ref) {
      var reference = _ref.reference,
          element = _ref.element,
          placement = _ref.placement;
      var basePlacement = placement ? getBasePlacement(placement) : null;
      var variation = placement ? getVariation(placement) : null;
      var commonX = reference.x + reference.width / 2 - element.width / 2;
      var commonY = reference.y + reference.height / 2 - element.height / 2;
      var offsets;

      switch (basePlacement) {
        case top:
          offsets = {
            x: commonX,
            y: reference.y - element.height
          };
          break;

        case bottom:
          offsets = {
            x: commonX,
            y: reference.y + reference.height
          };
          break;

        case right:
          offsets = {
            x: reference.x + reference.width,
            y: commonY
          };
          break;

        case left:
          offsets = {
            x: reference.x - element.width,
            y: commonY
          };
          break;

        default:
          offsets = {
            x: reference.x,
            y: reference.y
          };
      }

      var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

      if (mainAxis != null) {
        var len = mainAxis === 'y' ? 'height' : 'width';

        switch (variation) {
          case start$1:
            offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
            break;

          case end:
            offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
            break;
        }
      }

      return offsets;
    }

    function detectOverflow(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          _options$placement = _options.placement,
          placement = _options$placement === void 0 ? state.placement : _options$placement,
          _options$boundary = _options.boundary,
          boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
          _options$rootBoundary = _options.rootBoundary,
          rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
          _options$elementConte = _options.elementContext,
          elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
          _options$altBoundary = _options.altBoundary,
          altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
          _options$padding = _options.padding,
          padding = _options$padding === void 0 ? 0 : _options$padding;
      var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
      var altContext = elementContext === popper ? reference : popper;
      var popperRect = state.rects.popper;
      var element = state.elements[altBoundary ? altContext : elementContext];
      var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
      var referenceClientRect = getBoundingClientRect(state.elements.reference);
      var popperOffsets = computeOffsets({
        reference: referenceClientRect,
        element: popperRect,
        strategy: 'absolute',
        placement: placement
      });
      var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
      var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
      // 0 or negative = within the clipping rect

      var overflowOffsets = {
        top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
        bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
        left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
        right: elementClientRect.right - clippingClientRect.right + paddingObject.right
      };
      var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

      if (elementContext === popper && offsetData) {
        var offset = offsetData[placement];
        Object.keys(overflowOffsets).forEach(function (key) {
          var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
          var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
          overflowOffsets[key] += offset[axis] * multiply;
        });
      }

      return overflowOffsets;
    }

    function computeAutoPlacement(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          placement = _options.placement,
          boundary = _options.boundary,
          rootBoundary = _options.rootBoundary,
          padding = _options.padding,
          flipVariations = _options.flipVariations,
          _options$allowedAutoP = _options.allowedAutoPlacements,
          allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
      var variation = getVariation(placement);
      var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
        return getVariation(placement) === variation;
      }) : basePlacements;
      var allowedPlacements = placements$1.filter(function (placement) {
        return allowedAutoPlacements.indexOf(placement) >= 0;
      });

      if (allowedPlacements.length === 0) {
        allowedPlacements = placements$1;

        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '));
        }
      } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


      var overflows = allowedPlacements.reduce(function (acc, placement) {
        acc[placement] = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding
        })[getBasePlacement(placement)];
        return acc;
      }, {});
      return Object.keys(overflows).sort(function (a, b) {
        return overflows[a] - overflows[b];
      });
    }

    function getExpandedFallbackPlacements(placement) {
      if (getBasePlacement(placement) === auto) {
        return [];
      }

      var oppositePlacement = getOppositePlacement(placement);
      return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
    }

    function flip(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;

      if (state.modifiersData[name]._skip) {
        return;
      }

      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
          specifiedFallbackPlacements = options.fallbackPlacements,
          padding = options.padding,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          _options$flipVariatio = options.flipVariations,
          flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
          allowedAutoPlacements = options.allowedAutoPlacements;
      var preferredPlacement = state.options.placement;
      var basePlacement = getBasePlacement(preferredPlacement);
      var isBasePlacement = basePlacement === preferredPlacement;
      var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
      var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
        return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding,
          flipVariations: flipVariations,
          allowedAutoPlacements: allowedAutoPlacements
        }) : placement);
      }, []);
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var checksMap = new Map();
      var makeFallbackChecks = true;
      var firstFittingPlacement = placements[0];

      for (var i = 0; i < placements.length; i++) {
        var placement = placements[i];

        var _basePlacement = getBasePlacement(placement);

        var isStartVariation = getVariation(placement) === start$1;
        var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
        var len = isVertical ? 'width' : 'height';
        var overflow = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          altBoundary: altBoundary,
          padding: padding
        });
        var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

        if (referenceRect[len] > popperRect[len]) {
          mainVariationSide = getOppositePlacement(mainVariationSide);
        }

        var altVariationSide = getOppositePlacement(mainVariationSide);
        var checks = [];

        if (checkMainAxis) {
          checks.push(overflow[_basePlacement] <= 0);
        }

        if (checkAltAxis) {
          checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
        }

        if (checks.every(function (check) {
          return check;
        })) {
          firstFittingPlacement = placement;
          makeFallbackChecks = false;
          break;
        }

        checksMap.set(placement, checks);
      }

      if (makeFallbackChecks) {
        // `2` may be desired in some cases – research later
        var numberOfChecks = flipVariations ? 3 : 1;

        var _loop = function _loop(_i) {
          var fittingPlacement = placements.find(function (placement) {
            var checks = checksMap.get(placement);

            if (checks) {
              return checks.slice(0, _i).every(function (check) {
                return check;
              });
            }
          });

          if (fittingPlacement) {
            firstFittingPlacement = fittingPlacement;
            return "break";
          }
        };

        for (var _i = numberOfChecks; _i > 0; _i--) {
          var _ret = _loop(_i);

          if (_ret === "break") break;
        }
      }

      if (state.placement !== firstFittingPlacement) {
        state.modifiersData[name]._skip = true;
        state.placement = firstFittingPlacement;
        state.reset = true;
      }
    } // eslint-disable-next-line import/no-unused-modules


    var flip$1 = {
      name: 'flip',
      enabled: true,
      phase: 'main',
      fn: flip,
      requiresIfExists: ['offset'],
      data: {
        _skip: false
      }
    };

    function getSideOffsets(overflow, rect, preventedOffsets) {
      if (preventedOffsets === void 0) {
        preventedOffsets = {
          x: 0,
          y: 0
        };
      }

      return {
        top: overflow.top - rect.height - preventedOffsets.y,
        right: overflow.right - rect.width + preventedOffsets.x,
        bottom: overflow.bottom - rect.height + preventedOffsets.y,
        left: overflow.left - rect.width - preventedOffsets.x
      };
    }

    function isAnySideFullyClipped(overflow) {
      return [top, right, bottom, left].some(function (side) {
        return overflow[side] >= 0;
      });
    }

    function hide(_ref) {
      var state = _ref.state,
          name = _ref.name;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var preventedOffsets = state.modifiersData.preventOverflow;
      var referenceOverflow = detectOverflow(state, {
        elementContext: 'reference'
      });
      var popperAltOverflow = detectOverflow(state, {
        altBoundary: true
      });
      var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
      var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
      var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
      var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
      state.modifiersData[name] = {
        referenceClippingOffsets: referenceClippingOffsets,
        popperEscapeOffsets: popperEscapeOffsets,
        isReferenceHidden: isReferenceHidden,
        hasPopperEscaped: hasPopperEscaped
      };
      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-reference-hidden': isReferenceHidden,
        'data-popper-escaped': hasPopperEscaped
      });
    } // eslint-disable-next-line import/no-unused-modules


    var hide$1 = {
      name: 'hide',
      enabled: true,
      phase: 'main',
      requiresIfExists: ['preventOverflow'],
      fn: hide
    };

    function distanceAndSkiddingToXY(placement, rects, offset) {
      var basePlacement = getBasePlacement(placement);
      var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

      var _ref = typeof offset === 'function' ? offset(Object.assign({}, rects, {
        placement: placement
      })) : offset,
          skidding = _ref[0],
          distance = _ref[1];

      skidding = skidding || 0;
      distance = (distance || 0) * invertDistance;
      return [left, right].indexOf(basePlacement) >= 0 ? {
        x: distance,
        y: skidding
      } : {
        x: skidding,
        y: distance
      };
    }

    function offset(_ref2) {
      var state = _ref2.state,
          options = _ref2.options,
          name = _ref2.name;
      var _options$offset = options.offset,
          offset = _options$offset === void 0 ? [0, 0] : _options$offset;
      var data = placements.reduce(function (acc, placement) {
        acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
        return acc;
      }, {});
      var _data$state$placement = data[state.placement],
          x = _data$state$placement.x,
          y = _data$state$placement.y;

      if (state.modifiersData.popperOffsets != null) {
        state.modifiersData.popperOffsets.x += x;
        state.modifiersData.popperOffsets.y += y;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var offset$1 = {
      name: 'offset',
      enabled: true,
      phase: 'main',
      requires: ['popperOffsets'],
      fn: offset
    };

    function popperOffsets(_ref) {
      var state = _ref.state,
          name = _ref.name;
      // Offsets are the actual position the popper needs to have to be
      // properly positioned near its reference element
      // This is the most basic placement, and will be adjusted by
      // the modifiers in the next step
      state.modifiersData[name] = computeOffsets({
        reference: state.rects.reference,
        element: state.rects.popper,
        strategy: 'absolute',
        placement: state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var popperOffsets$1 = {
      name: 'popperOffsets',
      enabled: true,
      phase: 'read',
      fn: popperOffsets,
      data: {}
    };

    function getAltAxis(axis) {
      return axis === 'x' ? 'y' : 'x';
    }

    function preventOverflow(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;
      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          padding = options.padding,
          _options$tether = options.tether,
          tether = _options$tether === void 0 ? true : _options$tether,
          _options$tetherOffset = options.tetherOffset,
          tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
      var overflow = detectOverflow(state, {
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding,
        altBoundary: altBoundary
      });
      var basePlacement = getBasePlacement(state.placement);
      var variation = getVariation(state.placement);
      var isBasePlacement = !variation;
      var mainAxis = getMainAxisFromPlacement(basePlacement);
      var altAxis = getAltAxis(mainAxis);
      var popperOffsets = state.modifiersData.popperOffsets;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign({}, state.rects, {
        placement: state.placement
      })) : tetherOffset;
      var normalizedTetherOffsetValue = typeof tetherOffsetValue === 'number' ? {
        mainAxis: tetherOffsetValue,
        altAxis: tetherOffsetValue
      } : Object.assign({
        mainAxis: 0,
        altAxis: 0
      }, tetherOffsetValue);
      var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
      var data = {
        x: 0,
        y: 0
      };

      if (!popperOffsets) {
        return;
      }

      if (checkMainAxis) {
        var _offsetModifierState$;

        var mainSide = mainAxis === 'y' ? top : left;
        var altSide = mainAxis === 'y' ? bottom : right;
        var len = mainAxis === 'y' ? 'height' : 'width';
        var offset = popperOffsets[mainAxis];
        var min$1 = offset + overflow[mainSide];
        var max$1 = offset - overflow[altSide];
        var additive = tether ? -popperRect[len] / 2 : 0;
        var minLen = variation === start$1 ? referenceRect[len] : popperRect[len];
        var maxLen = variation === start$1 ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
        // outside the reference bounds

        var arrowElement = state.elements.arrow;
        var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
          width: 0,
          height: 0
        };
        var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
        var arrowPaddingMin = arrowPaddingObject[mainSide];
        var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
        // to include its full size in the calculation. If the reference is small
        // and near the edge of a boundary, the popper can overflow even if the
        // reference is not overflowing as well (e.g. virtual elements with no
        // width or height)

        var arrowLen = within(0, referenceRect[len], arrowRect[len]);
        var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
        var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
        var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
        var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
        var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
        var tetherMin = offset + minOffset - offsetModifierValue - clientOffset;
        var tetherMax = offset + maxOffset - offsetModifierValue;
        var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
        popperOffsets[mainAxis] = preventedOffset;
        data[mainAxis] = preventedOffset - offset;
      }

      if (checkAltAxis) {
        var _offsetModifierState$2;

        var _mainSide = mainAxis === 'x' ? top : left;

        var _altSide = mainAxis === 'x' ? bottom : right;

        var _offset = popperOffsets[altAxis];

        var _len = altAxis === 'y' ? 'height' : 'width';

        var _min = _offset + overflow[_mainSide];

        var _max = _offset - overflow[_altSide];

        var isOriginSide = [top, left].indexOf(basePlacement) !== -1;

        var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;

        var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;

        var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;

        var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);

        popperOffsets[altAxis] = _preventedOffset;
        data[altAxis] = _preventedOffset - _offset;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var preventOverflow$1 = {
      name: 'preventOverflow',
      enabled: true,
      phase: 'main',
      fn: preventOverflow,
      requiresIfExists: ['offset']
    };

    function getHTMLElementScroll(element) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }

    function getNodeScroll(node) {
      if (node === getWindow(node) || !isHTMLElement(node)) {
        return getWindowScroll(node);
      } else {
        return getHTMLElementScroll(node);
      }
    }

    function isElementScaled(element) {
      var rect = element.getBoundingClientRect();
      var scaleX = round(rect.width) / element.offsetWidth || 1;
      var scaleY = round(rect.height) / element.offsetHeight || 1;
      return scaleX !== 1 || scaleY !== 1;
    } // Returns the composite rect of an element relative to its offsetParent.
    // Composite means it takes into account transforms as well as layout.


    function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
      if (isFixed === void 0) {
        isFixed = false;
      }

      var isOffsetParentAnElement = isHTMLElement(offsetParent);
      var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
      var documentElement = getDocumentElement(offsetParent);
      var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled);
      var scroll = {
        scrollLeft: 0,
        scrollTop: 0
      };
      var offsets = {
        x: 0,
        y: 0
      };

      if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
        if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
        isScrollParent(documentElement)) {
          scroll = getNodeScroll(offsetParent);
        }

        if (isHTMLElement(offsetParent)) {
          offsets = getBoundingClientRect(offsetParent, true);
          offsets.x += offsetParent.clientLeft;
          offsets.y += offsetParent.clientTop;
        } else if (documentElement) {
          offsets.x = getWindowScrollBarX(documentElement);
        }
      }

      return {
        x: rect.left + scroll.scrollLeft - offsets.x,
        y: rect.top + scroll.scrollTop - offsets.y,
        width: rect.width,
        height: rect.height
      };
    }

    function order(modifiers) {
      var map = new Map();
      var visited = new Set();
      var result = [];
      modifiers.forEach(function (modifier) {
        map.set(modifier.name, modifier);
      }); // On visiting object, check for its dependencies and visit them recursively

      function sort(modifier) {
        visited.add(modifier.name);
        var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
        requires.forEach(function (dep) {
          if (!visited.has(dep)) {
            var depModifier = map.get(dep);

            if (depModifier) {
              sort(depModifier);
            }
          }
        });
        result.push(modifier);
      }

      modifiers.forEach(function (modifier) {
        if (!visited.has(modifier.name)) {
          // check for visited object
          sort(modifier);
        }
      });
      return result;
    }

    function orderModifiers(modifiers) {
      // order based on dependencies
      var orderedModifiers = order(modifiers); // order based on phase

      return modifierPhases.reduce(function (acc, phase) {
        return acc.concat(orderedModifiers.filter(function (modifier) {
          return modifier.phase === phase;
        }));
      }, []);
    }

    function debounce(fn) {
      var pending;
      return function () {
        if (!pending) {
          pending = new Promise(function (resolve) {
            Promise.resolve().then(function () {
              pending = undefined;
              resolve(fn());
            });
          });
        }

        return pending;
      };
    }

    function format(str) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return [].concat(args).reduce(function (p, c) {
        return p.replace(/%s/, c);
      }, str);
    }

    var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
    var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
    var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
    function validateModifiers(modifiers) {
      modifiers.forEach(function (modifier) {
        [].concat(Object.keys(modifier), VALID_PROPERTIES) // IE11-compatible replacement for `new Set(iterable)`
        .filter(function (value, index, self) {
          return self.indexOf(value) === index;
        }).forEach(function (key) {
          switch (key) {
            case 'name':
              if (typeof modifier.name !== 'string') {
                console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
              }

              break;

            case 'enabled':
              if (typeof modifier.enabled !== 'boolean') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
              }

              break;

            case 'phase':
              if (modifierPhases.indexOf(modifier.phase) < 0) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
              }

              break;

            case 'fn':
              if (typeof modifier.fn !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'effect':
              if (modifier.effect != null && typeof modifier.effect !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'requires':
              if (modifier.requires != null && !Array.isArray(modifier.requires)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
              }

              break;

            case 'requiresIfExists':
              if (!Array.isArray(modifier.requiresIfExists)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
              }

              break;

            case 'options':
            case 'data':
              break;

            default:
              console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
                return "\"" + s + "\"";
              }).join(', ') + "; but \"" + key + "\" was provided.");
          }

          modifier.requires && modifier.requires.forEach(function (requirement) {
            if (modifiers.find(function (mod) {
              return mod.name === requirement;
            }) == null) {
              console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
            }
          });
        });
      });
    }

    function uniqueBy(arr, fn) {
      var identifiers = new Set();
      return arr.filter(function (item) {
        var identifier = fn(item);

        if (!identifiers.has(identifier)) {
          identifiers.add(identifier);
          return true;
        }
      });
    }

    function mergeByName(modifiers) {
      var merged = modifiers.reduce(function (merged, current) {
        var existing = merged[current.name];
        merged[current.name] = existing ? Object.assign({}, existing, current, {
          options: Object.assign({}, existing.options, current.options),
          data: Object.assign({}, existing.data, current.data)
        }) : current;
        return merged;
      }, {}); // IE11 does not support Object.values

      return Object.keys(merged).map(function (key) {
        return merged[key];
      });
    }

    var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
    var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
    var DEFAULT_OPTIONS = {
      placement: 'bottom',
      modifiers: [],
      strategy: 'absolute'
    };

    function areValidElements() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return !args.some(function (element) {
        return !(element && typeof element.getBoundingClientRect === 'function');
      });
    }

    function popperGenerator(generatorOptions) {
      if (generatorOptions === void 0) {
        generatorOptions = {};
      }

      var _generatorOptions = generatorOptions,
          _generatorOptions$def = _generatorOptions.defaultModifiers,
          defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
          _generatorOptions$def2 = _generatorOptions.defaultOptions,
          defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
      return function createPopper(reference, popper, options) {
        if (options === void 0) {
          options = defaultOptions;
        }

        var state = {
          placement: 'bottom',
          orderedModifiers: [],
          options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
          modifiersData: {},
          elements: {
            reference: reference,
            popper: popper
          },
          attributes: {},
          styles: {}
        };
        var effectCleanupFns = [];
        var isDestroyed = false;
        var instance = {
          state: state,
          setOptions: function setOptions(setOptionsAction) {
            var options = typeof setOptionsAction === 'function' ? setOptionsAction(state.options) : setOptionsAction;
            cleanupModifierEffects();
            state.options = Object.assign({}, defaultOptions, state.options, options);
            state.scrollParents = {
              reference: isElement(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
              popper: listScrollParents(popper)
            }; // Orders the modifiers based on their dependencies and `phase`
            // properties

            var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

            state.orderedModifiers = orderedModifiers.filter(function (m) {
              return m.enabled;
            }); // Validate the provided modifiers so that the consumer will get warned
            // if one of the modifiers is invalid for any reason

            if (process.env.NODE_ENV !== "production") {
              var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
                var name = _ref.name;
                return name;
              });
              validateModifiers(modifiers);

              if (getBasePlacement(state.options.placement) === auto) {
                var flipModifier = state.orderedModifiers.find(function (_ref2) {
                  var name = _ref2.name;
                  return name === 'flip';
                });

                if (!flipModifier) {
                  console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
                }
              }

              var _getComputedStyle = getComputedStyle$1(popper),
                  marginTop = _getComputedStyle.marginTop,
                  marginRight = _getComputedStyle.marginRight,
                  marginBottom = _getComputedStyle.marginBottom,
                  marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
              // cause bugs with positioning, so we'll warn the consumer


              if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
                return parseFloat(margin);
              })) {
                console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
              }
            }

            runModifierEffects();
            return instance.update();
          },
          // Sync update – it will always be executed, even if not necessary. This
          // is useful for low frequency updates where sync behavior simplifies the
          // logic.
          // For high frequency updates (e.g. `resize` and `scroll` events), always
          // prefer the async Popper#update method
          forceUpdate: function forceUpdate() {
            if (isDestroyed) {
              return;
            }

            var _state$elements = state.elements,
                reference = _state$elements.reference,
                popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
            // anymore

            if (!areValidElements(reference, popper)) {
              if (process.env.NODE_ENV !== "production") {
                console.error(INVALID_ELEMENT_ERROR);
              }

              return;
            } // Store the reference and popper rects to be read by modifiers


            state.rects = {
              reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
              popper: getLayoutRect(popper)
            }; // Modifiers have the ability to reset the current update cycle. The
            // most common use case for this is the `flip` modifier changing the
            // placement, which then needs to re-run all the modifiers, because the
            // logic was previously ran for the previous placement and is therefore
            // stale/incorrect

            state.reset = false;
            state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
            // is filled with the initial data specified by the modifier. This means
            // it doesn't persist and is fresh on each update.
            // To ensure persistent data, use `${name}#persistent`

            state.orderedModifiers.forEach(function (modifier) {
              return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
            });
            var __debug_loops__ = 0;

            for (var index = 0; index < state.orderedModifiers.length; index++) {
              if (process.env.NODE_ENV !== "production") {
                __debug_loops__ += 1;

                if (__debug_loops__ > 100) {
                  console.error(INFINITE_LOOP_ERROR);
                  break;
                }
              }

              if (state.reset === true) {
                state.reset = false;
                index = -1;
                continue;
              }

              var _state$orderedModifie = state.orderedModifiers[index],
                  fn = _state$orderedModifie.fn,
                  _state$orderedModifie2 = _state$orderedModifie.options,
                  _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
                  name = _state$orderedModifie.name;

              if (typeof fn === 'function') {
                state = fn({
                  state: state,
                  options: _options,
                  name: name,
                  instance: instance
                }) || state;
              }
            }
          },
          // Async and optimistically optimized update – it will not be executed if
          // not necessary (debounced to run at most once-per-tick)
          update: debounce(function () {
            return new Promise(function (resolve) {
              instance.forceUpdate();
              resolve(state);
            });
          }),
          destroy: function destroy() {
            cleanupModifierEffects();
            isDestroyed = true;
          }
        };

        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== "production") {
            console.error(INVALID_ELEMENT_ERROR);
          }

          return instance;
        }

        instance.setOptions(options).then(function (state) {
          if (!isDestroyed && options.onFirstUpdate) {
            options.onFirstUpdate(state);
          }
        }); // Modifiers have the ability to execute arbitrary code before the first
        // update cycle runs. They will be executed in the same order as the update
        // cycle. This is useful when a modifier adds some persistent data that
        // other modifiers need to use, but the modifier is run after the dependent
        // one.

        function runModifierEffects() {
          state.orderedModifiers.forEach(function (_ref3) {
            var name = _ref3.name,
                _ref3$options = _ref3.options,
                options = _ref3$options === void 0 ? {} : _ref3$options,
                effect = _ref3.effect;

            if (typeof effect === 'function') {
              var cleanupFn = effect({
                state: state,
                name: name,
                instance: instance,
                options: options
              });

              var noopFn = function noopFn() {};

              effectCleanupFns.push(cleanupFn || noopFn);
            }
          });
        }

        function cleanupModifierEffects() {
          effectCleanupFns.forEach(function (fn) {
            return fn();
          });
          effectCleanupFns = [];
        }

        return instance;
      };
    }

    var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
    var createPopper = /*#__PURE__*/popperGenerator({
      defaultModifiers: defaultModifiers
    }); // eslint-disable-next-line import/no-unused-modules

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

    var __assign$1 = function() {
        __assign$1 = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign$1.apply(this, arguments);
    };

    function createPopperActions(initOptions) {
        var popperInstance = null;
        var referenceNode;
        var contentNode;
        var options = initOptions;
        var initPopper = function () {
            if (referenceNode && contentNode) {
                popperInstance = createPopper(referenceNode, contentNode, options);
            }
        };
        var deinitPopper = function () {
            if (popperInstance) {
                popperInstance.destroy();
                popperInstance = null;
            }
        };
        var referenceAction = function (node) {
            referenceNode = node;
            initPopper();
            return {
                destroy: function () {
                    deinitPopper();
                },
            };
        };
        var contentAction = function (node, contentOptions) {
            contentNode = node;
            options = __assign$1(__assign$1({}, initOptions), contentOptions);
            initPopper();
            return {
                update: function (newContentOptions) {
                    options = __assign$1(__assign$1({}, initOptions), newContentOptions);
                    if (popperInstance && options) {
                        popperInstance.setOptions(options);
                    }
                },
                destroy: function () {
                    deinitPopper();
                },
            };
        };
        return [referenceAction, contentAction, function () { return popperInstance; }];
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\components\Tooltip.svelte generated by Svelte v3.38.3 */
    const file$t = "src\\components\\Tooltip.svelte";

    // (22:0) {#if show}
    function create_if_block$g(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let content_action;
    	let div2_intro;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "tooltip-content");
    			add_location(div0, file$t, 29, 2, 499);
    			attr_dev(div1, "id", "arrow");
    			attr_dev(div1, "class", "arrow");
    			attr_dev(div1, "data-popper-arrow", "");
    			add_location(div1, file$t, 32, 2, 560);
    			attr_dev(div2, "id", "tooltip");
    			attr_dev(div2, "class", "tooltip");
    			add_location(div2, file$t, 22, 1, 357);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append_dev(div2, t);
    			append_dev(div2, div1);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(content_action = /*content*/ ctx[0].call(null, div2, /*options*/ ctx[1]));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (content_action && is_function(content_action.update) && dirty & /*options*/ 2) content_action.update.call(null, /*options*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, fade, { duration: 200 });
    				div2_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			if (div2_intro) div2_intro.invalidate();
    			div2_outro = create_out_transition(div2, fade, { duration: 50 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$g.name,
    		type: "if",
    		source: "(22:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$w(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[2] && create_if_block$g(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$g(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tooltip", slots, ['default']);
    	let { content } = $$props;

    	let { options = {
    		modifiers: [
    			{
    				name: "offset",
    				options: { offset: [0, 6] }
    			}
    		]
    	} } = $$props;

    	let timeout;
    	let show;

    	onMount(async () => {
    		setTimeout(
    			() => {
    				$$invalidate(2, show = true);
    			},
    			1200
    		);
    	});

    	const writable_props = ["content", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tooltip> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		content,
    		options,
    		timeout,
    		show
    	});

    	$$self.$inject_state = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("show" in $$props) $$invalidate(2, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [content, options, show, $$scope, slots];
    }

    class Tooltip extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$w, safe_not_equal, { content: 0, options: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tooltip",
    			options,
    			id: create_fragment$w.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*content*/ ctx[0] === undefined && !("content" in props)) {
    			console.warn("<Tooltip> was created without expected prop 'content'");
    		}
    	}

    	get content() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Control.svelte generated by Svelte v3.38.3 */
    const file$s = "src\\components\\Control.svelte";

    // (32:0) {#if showTooltip && !tips && tiptext}
    function create_if_block$f(ctx) {
    	let tooltip;
    	let current;

    	tooltip = new Tooltip({
    			props: {
    				content: /*popperContent*/ ctx[7],
    				$$slots: { default: [create_default_slot$c] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tooltip.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tooltip, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tooltip_changes = {};

    			if (dirty & /*$$scope, tiptext*/ 4104) {
    				tooltip_changes.$$scope = { dirty, ctx };
    			}

    			tooltip.$set(tooltip_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tooltip.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tooltip.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tooltip, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$f.name,
    		type: "if",
    		source: "(32:0) {#if showTooltip && !tips && tiptext}",
    		ctx
    	});

    	return block;
    }

    // (33:1) <Tooltip content={popperContent}>
    function create_default_slot$c(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*tiptext*/ ctx[3]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tiptext*/ 8) set_data_dev(t, /*tiptext*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$c.name,
    		type: "slot",
    		source: "(33:1) <Tooltip content={popperContent}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$v(ctx) {
    	let button;
    	let t;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);
    	let if_block = /*showTooltip*/ ctx[5] && !/*tips*/ ctx[0] && /*tiptext*/ ctx[3] && create_if_block$f(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			set_style(button, "font-size", /*size*/ ctx[2]);
    			attr_dev(button, "class", "control svelte-emr3ky");
    			toggle_class(button, "legacy", /*legacy*/ ctx[1]);
    			toggle_class(button, "persistent", /*persistent*/ ctx[4]);
    			add_location(button, file$s, 18, 0, 415);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*popperRef*/ ctx[6].call(null, button)),
    					listen_dev(button, "mouseenter", /*mouseenter_handler*/ ctx[10], false, false, false),
    					listen_dev(button, "mouseleave", /*mouseleave_handler*/ ctx[11], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4096)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*size*/ 4) {
    				set_style(button, "font-size", /*size*/ ctx[2]);
    			}

    			if (dirty & /*legacy*/ 2) {
    				toggle_class(button, "legacy", /*legacy*/ ctx[1]);
    			}

    			if (dirty & /*persistent*/ 16) {
    				toggle_class(button, "persistent", /*persistent*/ ctx[4]);
    			}

    			if (/*showTooltip*/ ctx[5] && !/*tips*/ ctx[0] && /*tiptext*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showTooltip, tips, tiptext*/ 41) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$f(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Control", slots, ['default']);
    	const [popperRef, popperContent] = createPopperActions({ placement: "bottom", strategy: "fixed" });
    	let showTooltip = false;
    	let { tips = false } = $$props;
    	let { legacy = false } = $$props;
    	let { size = 14 } = $$props;
    	let { tiptext = false } = $$props;
    	let { persistent = false } = $$props;
    	const writable_props = ["tips", "legacy", "size", "tiptext", "persistent"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Control> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const mouseenter_handler = () => $$invalidate(5, showTooltip = true);
    	const mouseleave_handler = () => $$invalidate(5, showTooltip = false);

    	$$self.$$set = $$props => {
    		if ("tips" in $$props) $$invalidate(0, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(1, legacy = $$props.legacy);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("tiptext" in $$props) $$invalidate(3, tiptext = $$props.tiptext);
    		if ("persistent" in $$props) $$invalidate(4, persistent = $$props.persistent);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createPopperActions,
    		Tooltip,
    		popperRef,
    		popperContent,
    		showTooltip,
    		tips,
    		legacy,
    		size,
    		tiptext,
    		persistent
    	});

    	$$self.$inject_state = $$props => {
    		if ("showTooltip" in $$props) $$invalidate(5, showTooltip = $$props.showTooltip);
    		if ("tips" in $$props) $$invalidate(0, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(1, legacy = $$props.legacy);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("tiptext" in $$props) $$invalidate(3, tiptext = $$props.tiptext);
    		if ("persistent" in $$props) $$invalidate(4, persistent = $$props.persistent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tips,
    		legacy,
    		size,
    		tiptext,
    		persistent,
    		showTooltip,
    		popperRef,
    		popperContent,
    		slots,
    		click_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		$$scope
    	];
    }

    class Control extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$t, create_fragment$v, safe_not_equal, {
    			tips: 0,
    			legacy: 1,
    			size: 2,
    			tiptext: 3,
    			persistent: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Control",
    			options,
    			id: create_fragment$v.name
    		});
    	}

    	get tips() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tiptext() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tiptext(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get persistent() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set persistent(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Titlebar.svelte generated by Svelte v3.38.3 */
    const file$r = "src\\components\\Titlebar.svelte";

    // (54:3) {:else}
    function create_else_block$2(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-bars");
    			add_location(i, file$r, 54, 7, 1277);
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(54:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (52:3) {#if settingsOpen}
    function create_if_block_4(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file$r, 52, 7, 1228);
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
    		source: "(52:3) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (42:2) <Control     tips={tips}     legacy={legacy}     size="12px"     tiptext={settingsOpen?"Close menu":"Main menu"}     on:click={e => {      settingsOpen = !settingsOpen;      dispatch('settingsOpen', settingsOpen);     }}    >
    function create_default_slot_7(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*settingsOpen*/ ctx[0]) return create_if_block_4;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(42:2) <Control     tips={tips}     legacy={legacy}     size=\\\"12px\\\"     tiptext={settingsOpen?\\\"Close menu\\\":\\\"Main menu\\\"}     on:click={e => {      settingsOpen = !settingsOpen;      dispatch('settingsOpen', settingsOpen);     }}    >",
    		ctx
    	});

    	return block;
    }

    // (59:2) {#if !settingsOpen}
    function create_if_block_1$4(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = (!/*fileSelected*/ ctx[1] || /*overwrite*/ ctx[4]) && create_if_block_3$1(ctx);
    	let if_block1 = /*fileSelected*/ ctx[1] && create_if_block_2$2(ctx);

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
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!/*fileSelected*/ ctx[1] || /*overwrite*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*fileSelected, overwrite*/ 18) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*fileSelected*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*fileSelected*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
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
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(59:2) {#if !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (60:3) {#if !fileSelected || overwrite}
    function create_if_block_3$1(ctx) {
    	let control0;
    	let t;
    	let control1;
    	let current;

    	control0 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: "Select file",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control0.$on("click", /*click_handler_1*/ ctx[10]);

    	control1 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: "Screenshot",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control1.$on("click", /*click_handler_2*/ ctx[11]);

    	const block = {
    		c: function create() {
    			create_component(control0.$$.fragment);
    			t = space();
    			create_component(control1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(control0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(control1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const control0_changes = {};
    			if (dirty & /*tips*/ 8) control0_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control0_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control0_changes.$$scope = { dirty, ctx };
    			}

    			control0.$set(control0_changes);
    			const control1_changes = {};
    			if (dirty & /*tips*/ 8) control1_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control1_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control1_changes.$$scope = { dirty, ctx };
    			}

    			control1.$set(control1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control0.$$.fragment, local);
    			transition_in(control1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control0.$$.fragment, local);
    			transition_out(control1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(control1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(60:3) {#if !fileSelected || overwrite}",
    		ctx
    	});

    	return block;
    }

    // (61:4) <Control       tips={tips}       legacy={legacy}       size="12px"       tiptext="Select file"       on:click={e => { ipcRenderer.send('selectfile'); }}      >
    function create_default_slot_6(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-file-upload");
    			add_location(i, file$r, 67, 5, 1562);
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
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(61:4) <Control       tips={tips}       legacy={legacy}       size=\\\"12px\\\"       tiptext=\\\"Select file\\\"       on:click={e => { ipcRenderer.send('selectfile'); }}      >",
    		ctx
    	});

    	return block;
    }

    // (71:4) <Control       tips={tips}       legacy={legacy}       size="12px"       tiptext="Screenshot"       on:click={e => { ipcRenderer.send('screenshot'); }}      >
    function create_default_slot_5(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-crosshairs");
    			add_location(i, file$r, 77, 8, 1788);
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
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(71:4) <Control       tips={tips}       legacy={legacy}       size=\\\"12px\\\"       tiptext=\\\"Screenshot\\\"       on:click={e => { ipcRenderer.send('screenshot'); }}      >",
    		ctx
    	});

    	return block;
    }

    // (81:3) {#if fileSelected}
    function create_if_block_2$2(ctx) {
    	let control;
    	let current;

    	control = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: "Clear",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control.$on("click", /*click_handler_3*/ ctx[12]);

    	const block = {
    		c: function create() {
    			create_component(control.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const control_changes = {};
    			if (dirty & /*tips*/ 8) control_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(81:3) {#if fileSelected}",
    		ctx
    	});

    	return block;
    }

    // (82:4) <Control       tips={tips}       legacy={legacy}       size="12px"       tiptext="Clear"       on:click={e => { dispatch('clear'); }}      >
    function create_default_slot_4(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-trash");
    			add_location(i, file$r, 88, 8, 2026);
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(82:4) <Control       tips={tips}       legacy={legacy}       size=\\\"12px\\\"       tiptext=\\\"Clear\\\"       on:click={e => { dispatch('clear'); }}      >",
    		ctx
    	});

    	return block;
    }

    // (95:2) {#if version}
    function create_if_block$e(ctx) {
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("v. ");
    			t1 = text(/*version*/ ctx[5]);
    			attr_dev(span, "class", "version svelte-1y8gu7w");
    			add_location(span, file$r, 95, 3, 2151);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*version*/ 32) set_data_dev(t1, /*version*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$e.name,
    		type: "if",
    		source: "(95:2) {#if version}",
    		ctx
    	});

    	return block;
    }

    // (98:2) <Control     tips={tips}     legacy={legacy}     size="13px"     tiptext="Pin to top"      on:click={e => { ipcRenderer.send('window', 'pin'); }}    >
    function create_default_slot_3$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-thumbtack svelte-1y8gu7w");
    			toggle_class(i, "pinned", /*pinned*/ ctx[6]);
    			add_location(i, file$r, 104, 6, 2363);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pinned*/ 64) {
    				toggle_class(i, "pinned", /*pinned*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(98:2) <Control     tips={tips}     legacy={legacy}     size=\\\"13px\\\"     tiptext=\\\"Pin to top\\\"      on:click={e => { ipcRenderer.send('window', 'pin'); }}    >",
    		ctx
    	});

    	return block;
    }

    // (107:2) <Control     tips={tips}     legacy={legacy}     tiptext="Minimize"     on:click={e => { ipcRenderer.send('window', 'minimize'); }}    >
    function create_default_slot_2$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-minus");
    			add_location(i, file$r, 112, 6, 2570);
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
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(107:2) <Control     tips={tips}     legacy={legacy}     tiptext=\\\"Minimize\\\"     on:click={e => { ipcRenderer.send('window', 'minimize'); }}    >",
    		ctx
    	});

    	return block;
    }

    // (115:2) <Control     tips={tips}     legacy={legacy}     tiptext="Maximize"     on:click={e => { ipcRenderer.send('window', 'maximize'); }}    >
    function create_default_slot_1$6(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-plus");
    			add_location(i, file$r, 120, 3, 2757);
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
    		id: create_default_slot_1$6.name,
    		type: "slot",
    		source: "(115:2) <Control     tips={tips}     legacy={legacy}     tiptext=\\\"Maximize\\\"     on:click={e => { ipcRenderer.send('window', 'maximize'); }}    >",
    		ctx
    	});

    	return block;
    }

    // (123:2) <Control     tips={tips}     legacy={legacy}     persistent={true}     tiptext="Close"     on:click={e => { ipcRenderer.send('window', 'close'); }}    >
    function create_default_slot$b(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file$r, 129, 6, 2962);
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
    		id: create_default_slot$b.name,
    		type: "slot",
    		source: "(123:2) <Control     tips={tips}     legacy={legacy}     persistent={true}     tiptext=\\\"Close\\\"     on:click={e => { ipcRenderer.send('window', 'close'); }}    >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$u(ctx) {
    	let div2;
    	let div0;
    	let control0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let control1;
    	let t3;
    	let control2;
    	let t4;
    	let control3;
    	let t5;
    	let control4;
    	let current;

    	control0 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: /*settingsOpen*/ ctx[0] ? "Close menu" : "Main menu",
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control0.$on("click", /*click_handler*/ ctx[9]);
    	let if_block0 = !/*settingsOpen*/ ctx[0] && create_if_block_1$4(ctx);
    	let if_block1 = /*version*/ ctx[5] && create_if_block$e(ctx);

    	control1 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "13px",
    				tiptext: "Pin to top",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control1.$on("click", /*click_handler_4*/ ctx[13]);

    	control2 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				tiptext: "Minimize",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control2.$on("click", /*click_handler_5*/ ctx[14]);

    	control3 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				tiptext: "Maximize",
    				$$slots: { default: [create_default_slot_1$6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control3.$on("click", /*click_handler_6*/ ctx[15]);

    	control4 = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				persistent: true,
    				tiptext: "Close",
    				$$slots: { default: [create_default_slot$b] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control4.$on("click", /*click_handler_7*/ ctx[16]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(control0.$$.fragment);
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			create_component(control1.$$.fragment);
    			t3 = space();
    			create_component(control2.$$.fragment);
    			t4 = space();
    			create_component(control3.$$.fragment);
    			t5 = space();
    			create_component(control4.$$.fragment);
    			attr_dev(div0, "class", "titlebar-group svelte-1y8gu7w");
    			add_location(div0, file$r, 20, 1, 523);
    			attr_dev(div1, "class", "titlebar-group svelte-1y8gu7w");
    			add_location(div1, file$r, 93, 1, 2101);
    			attr_dev(div2, "class", "titlebar svelte-1y8gu7w");
    			toggle_class(div2, "legacy", /*legacy*/ ctx[2]);
    			add_location(div2, file$r, 19, 0, 476);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(control0, div0, null);
    			append_dev(div0, t0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t2);
    			mount_component(control1, div1, null);
    			append_dev(div1, t3);
    			mount_component(control2, div1, null);
    			append_dev(div1, t4);
    			mount_component(control3, div1, null);
    			append_dev(div1, t5);
    			mount_component(control4, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const control0_changes = {};
    			if (dirty & /*tips*/ 8) control0_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control0_changes.legacy = /*legacy*/ ctx[2];
    			if (dirty & /*settingsOpen*/ 1) control0_changes.tiptext = /*settingsOpen*/ ctx[0] ? "Close menu" : "Main menu";

    			if (dirty & /*$$scope, settingsOpen*/ 131073) {
    				control0_changes.$$scope = { dirty, ctx };
    			}

    			control0.$set(control0_changes);

    			if (!/*settingsOpen*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*settingsOpen*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$4(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*version*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$e(ctx);
    					if_block1.c();
    					if_block1.m(div1, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			const control1_changes = {};
    			if (dirty & /*tips*/ 8) control1_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control1_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope, pinned*/ 131136) {
    				control1_changes.$$scope = { dirty, ctx };
    			}

    			control1.$set(control1_changes);
    			const control2_changes = {};
    			if (dirty & /*tips*/ 8) control2_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control2_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control2_changes.$$scope = { dirty, ctx };
    			}

    			control2.$set(control2_changes);
    			const control3_changes = {};
    			if (dirty & /*tips*/ 8) control3_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control3_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control3_changes.$$scope = { dirty, ctx };
    			}

    			control3.$set(control3_changes);
    			const control4_changes = {};
    			if (dirty & /*tips*/ 8) control4_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control4_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				control4_changes.$$scope = { dirty, ctx };
    			}

    			control4.$set(control4_changes);

    			if (dirty & /*legacy*/ 4) {
    				toggle_class(div2, "legacy", /*legacy*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control0.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(control1.$$.fragment, local);
    			transition_in(control2.$$.fragment, local);
    			transition_in(control3.$$.fragment, local);
    			transition_in(control4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control0.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(control1.$$.fragment, local);
    			transition_out(control2.$$.fragment, local);
    			transition_out(control3.$$.fragment, local);
    			transition_out(control4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(control0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_component(control1);
    			destroy_component(control2);
    			destroy_component(control3);
    			destroy_component(control4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Titlebar", slots, []);
    	const { ipcRenderer } = require("electron");
    	const dispatch = createEventDispatcher();
    	let { fileSelected = false } = $$props;
    	let { settingsOpen = false } = $$props;
    	let { legacy = false } = $$props;
    	let { tips = false } = $$props;
    	let { overwrite = false } = $$props;
    	let { version } = $$props;
    	let pinned = false;

    	ipcRenderer.on("pin", (event, arg) => {
    		$$invalidate(6, pinned = arg);
    	});

    	const writable_props = ["fileSelected", "settingsOpen", "legacy", "tips", "overwrite", "version"];

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
    		ipcRenderer.send("screenshot");
    	};

    	const click_handler_3 = e => {
    		dispatch("clear");
    	};

    	const click_handler_4 = e => {
    		ipcRenderer.send("window", "pin");
    	};

    	const click_handler_5 = e => {
    		ipcRenderer.send("window", "minimize");
    	};

    	const click_handler_6 = e => {
    		ipcRenderer.send("window", "maximize");
    	};

    	const click_handler_7 = e => {
    		ipcRenderer.send("window", "close");
    	};

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(3, tips = $$props.tips);
    		if ("overwrite" in $$props) $$invalidate(4, overwrite = $$props.overwrite);
    		if ("version" in $$props) $$invalidate(5, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Control,
    		ipcRenderer,
    		dispatch,
    		fileSelected,
    		settingsOpen,
    		legacy,
    		tips,
    		overwrite,
    		version,
    		pinned
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(1, fileSelected = $$props.fileSelected);
    		if ("settingsOpen" in $$props) $$invalidate(0, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(3, tips = $$props.tips);
    		if ("overwrite" in $$props) $$invalidate(4, overwrite = $$props.overwrite);
    		if ("version" in $$props) $$invalidate(5, version = $$props.version);
    		if ("pinned" in $$props) $$invalidate(6, pinned = $$props.pinned);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		settingsOpen,
    		fileSelected,
    		legacy,
    		tips,
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
    		click_handler_6,
    		click_handler_7
    	];
    }

    class Titlebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$s, create_fragment$u, safe_not_equal, {
    			fileSelected: 1,
    			settingsOpen: 0,
    			legacy: 2,
    			tips: 3,
    			overwrite: 4,
    			version: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Titlebar",
    			options,
    			id: create_fragment$u.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[5] === undefined && !("version" in props)) {
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

    	get tips() {
    		throw new Error("<Titlebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
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

    const file$q = "src\\components\\Desktop.svelte";

    function create_fragment$t(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "desktop svelte-1o7d29u");
    			set_style(div, "background", /*backdropColor*/ ctx[1]);
    			toggle_class(div, "legacy", /*legacy*/ ctx[0]);
    			add_location(div, file$q, 5, 0, 92);
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
    					listen_dev(div, "dragover", /*dragover_handler*/ ctx[4], false, false, false),
    					listen_dev(div, "drop", /*drop_handler*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*backdropColor*/ 2) {
    				set_style(div, "background", /*backdropColor*/ ctx[1]);
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
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Desktop", slots, ['default']);
    	let { legacy = false } = $$props;
    	let { backdropColor = "#2F2E33" } = $$props;
    	const writable_props = ["legacy", "backdropColor"];

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
    		if ("backdropColor" in $$props) $$invalidate(1, backdropColor = $$props.backdropColor);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ legacy, backdropColor });

    	$$self.$inject_state = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    		if ("backdropColor" in $$props) $$invalidate(1, backdropColor = $$props.backdropColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [legacy, backdropColor, $$scope, slots, dragover_handler, drop_handler];
    }

    class Desktop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$t, safe_not_equal, { legacy: 0, backdropColor: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Desktop",
    			options,
    			id: create_fragment$t.name
    		});
    	}

    	get legacy() {
    		throw new Error("<Desktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Desktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get backdropColor() {
    		throw new Error("<Desktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backdropColor(value) {
    		throw new Error("<Desktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Tool.svelte generated by Svelte v3.38.3 */
    const file$p = "src\\components\\Tool.svelte";

    // (30:0) {#if showTooltip && !tips && tiptext}
    function create_if_block$d(ctx) {
    	let tooltip;
    	let current;

    	tooltip = new Tooltip({
    			props: {
    				content: /*popperContent*/ ctx[6],
    				$$slots: { default: [create_default_slot$a] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tooltip.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tooltip, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tooltip_changes = {};

    			if (dirty & /*$$scope, tiptext*/ 2056) {
    				tooltip_changes.$$scope = { dirty, ctx };
    			}

    			tooltip.$set(tooltip_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tooltip.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tooltip.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tooltip, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$d.name,
    		type: "if",
    		source: "(30:0) {#if showTooltip && !tips && tiptext}",
    		ctx
    	});

    	return block;
    }

    // (31:1) <Tooltip content={popperContent}>
    function create_default_slot$a(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*tiptext*/ ctx[3]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tiptext*/ 8) set_data_dev(t, /*tiptext*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$a.name,
    		type: "slot",
    		source: "(31:1) <Tooltip content={popperContent}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$s(ctx) {
    	let button;
    	let t;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);
    	let if_block = /*showTooltip*/ ctx[4] && !/*tips*/ ctx[0] && /*tiptext*/ ctx[3] && create_if_block$d(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			set_style(button, "font-size", /*size*/ ctx[2]);
    			attr_dev(button, "class", "control svelte-1iyprfm");
    			toggle_class(button, "legacy", /*legacy*/ ctx[1]);
    			add_location(button, file$p, 17, 0, 381);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*popperRef*/ ctx[5].call(null, button)),
    					listen_dev(button, "mouseenter", /*mouseenter_handler*/ ctx[9], false, false, false),
    					listen_dev(button, "mouseleave", /*mouseleave_handler*/ ctx[10], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[11], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*size*/ 4) {
    				set_style(button, "font-size", /*size*/ ctx[2]);
    			}

    			if (dirty & /*legacy*/ 2) {
    				toggle_class(button, "legacy", /*legacy*/ ctx[1]);
    			}

    			if (/*showTooltip*/ ctx[4] && !/*tips*/ ctx[0] && /*tiptext*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showTooltip, tips, tiptext*/ 25) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$d(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tool", slots, ['default']);
    	const [popperRef, popperContent] = createPopperActions({ placement: "right", strategy: "fixed" });
    	let showTooltip = false;
    	let { tips = false } = $$props;
    	let { legacy = false } = $$props;
    	let { size = 14 } = $$props;
    	let { tiptext = false } = $$props;
    	const writable_props = ["tips", "legacy", "size", "tiptext"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tool> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const mouseenter_handler = () => $$invalidate(4, showTooltip = true);
    	const mouseleave_handler = () => $$invalidate(4, showTooltip = false);

    	$$self.$$set = $$props => {
    		if ("tips" in $$props) $$invalidate(0, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(1, legacy = $$props.legacy);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("tiptext" in $$props) $$invalidate(3, tiptext = $$props.tiptext);
    		if ("$$scope" in $$props) $$invalidate(11, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createPopperActions,
    		Tooltip,
    		popperRef,
    		popperContent,
    		showTooltip,
    		tips,
    		legacy,
    		size,
    		tiptext
    	});

    	$$self.$inject_state = $$props => {
    		if ("showTooltip" in $$props) $$invalidate(4, showTooltip = $$props.showTooltip);
    		if ("tips" in $$props) $$invalidate(0, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(1, legacy = $$props.legacy);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("tiptext" in $$props) $$invalidate(3, tiptext = $$props.tiptext);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tips,
    		legacy,
    		size,
    		tiptext,
    		showTooltip,
    		popperRef,
    		popperContent,
    		slots,
    		click_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		$$scope
    	];
    }

    class Tool extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$s, safe_not_equal, { tips: 0, legacy: 1, size: 2, tiptext: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tool",
    			options,
    			id: create_fragment$s.name
    		});
    	}

    	get tips() {
    		throw new Error("<Tool>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Tool>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Tool>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Tool>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Tool>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Tool>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tiptext() {
    		throw new Error("<Tool>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tiptext(value) {
    		throw new Error("<Tool>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function clickOutside(node) {
    	// the node has been mounted in the DOM
    	
    	window.addEventListener('click', handleClick);
    	
    	function handleClick(e){   
      if (!node.contains(e.target)){
        node.dispatchEvent(new CustomEvent('outsideclick'));
      }
    }

    	return {
    		destroy() {
    			// the node has been removed from the DOM
    			window.removeEventListener('click', handleClick);
    		}
    	};
    }

    /* src\components\Dropdown.svelte generated by Svelte v3.38.3 */
    const file$o = "src\\components\\Dropdown.svelte";

    // (24:0) {#if show}
    function create_if_block$c(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let content_action;
    	let div2_intro;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "dropdown-content");
    			add_location(div0, file$o, 39, 2, 766);
    			attr_dev(div1, "id", "arrow");
    			attr_dev(div1, "class", "arrow");
    			attr_dev(div1, "data-popper-arrow", "");
    			add_location(div1, file$o, 42, 2, 828);
    			attr_dev(div2, "id", "dropdown");
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$o, 24, 1, 483);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append_dev(div2, t);
    			append_dev(div2, div1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(content_action = /*content*/ ctx[0].call(null, div2, /*options*/ ctx[1])),
    					action_destroyer(clickOutside.call(null, div2)),
    					listen_dev(div2, "outsideclick", /*outsideclick_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (content_action && is_function(content_action.update) && dirty & /*options*/ 2) content_action.update.call(null, /*options*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, fade, { duration: 200 });
    				div2_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			if (div2_intro) div2_intro.invalidate();
    			div2_outro = create_out_transition(div2, fade, { duration: 50 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$c.name,
    		type: "if",
    		source: "(24:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$r(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[2] && create_if_block$c(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$c(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dropdown", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { content } = $$props;

    	let { options = {
    		modifiers: [
    			{
    				name: "offset",
    				options: { offset: [-12, 15] }
    			}
    		]
    	} } = $$props;

    	let show;
    	let clicks = 0;

    	onMount(async () => {
    		$$invalidate(2, show = true);
    	});

    	const writable_props = ["content", "options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dropdown> was created with unknown prop '${key}'`);
    	});

    	const outsideclick_handler = () => {
    		$$invalidate(3, clicks++, clicks);

    		if (clicks > 1) {
    			dispatch("close");
    			$$invalidate(2, show = false);
    		}
    	};

    	$$self.$$set = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onMount,
    		fade,
    		clickOutside,
    		dispatch,
    		content,
    		options,
    		show,
    		clicks
    	});

    	$$self.$inject_state = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("show" in $$props) $$invalidate(2, show = $$props.show);
    		if ("clicks" in $$props) $$invalidate(3, clicks = $$props.clicks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [content, options, show, clicks, dispatch, $$scope, slots, outsideclick_handler];
    }

    class Dropdown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$r, safe_not_equal, { content: 0, options: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dropdown",
    			options,
    			id: create_fragment$r.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*content*/ ctx[0] === undefined && !("content" in props)) {
    			console.warn("<Dropdown> was created without expected prop 'content'");
    		}
    	}

    	get content() {
    		throw new Error("<Dropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<Dropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Dropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Dropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function hsv2rgb({ h, s, v, a = 1 }) {
        let R, G, B;
        let _h = (h % 360) / 60;
        const C = v * s;
        const X = C * (1 - Math.abs((_h % 2) - 1));
        R = G = B = v - C;
        _h = ~~_h;
        R += [C, X, 0, 0, X, C][_h];
        G += [X, C, C, X, 0, 0][_h];
        B += [0, 0, X, C, C, X][_h];
        const r = Math.floor(R * 255);
        const g = Math.floor(G * 255);
        const b = Math.floor(B * 255);
        return { r, g, b, a };
    }
    function rgb2hex({ r, g, b, a = 1 }) {
        return {
            hex: '#' +
                [r, g, b, Math.round(a * 255) | 0].reduce((acc, v) => `${acc}${v.toString(16).padStart(2, '0')}`, '')
        };
    }
    function hex2rgb(hex) {
        const h = hex.hex;
        return {
            r: parseInt(h.substring(1, 3), 16),
            g: parseInt(h.substring(3, 5), 16),
            b: parseInt(h.substring(5, 7), 16),
            a: h.length <= 7 ? 1 : parseInt(h.substring(7, 9), 16) / 255
        };
    }
    function rgb2hsv$1({ r, g, b, a = 1 }) {
        const R = r / 255;
        const G = g / 255;
        const B = b / 255;
        const V = Math.max(R, G, B);
        const C = V - Math.min(R, G, B);
        const S = C === 0 ? 0 : C / V;
        let H = C === 0
            ? 0
            : V === R
                ? (G - B) / C + (G < B ? 6 : 0)
                : V === G
                    ? (B - R) / C + 2
                    : (R - G) / C + 4;
        H = (H % 6) * 60;
        return {
            a: a,
            h: H,
            s: S,
            v: V
        };
    }
    function hsv2Color({ h, s, v, a }) {
        const rgb = hsv2rgb({ h, s, v, a });
        return Object.assign(Object.assign(Object.assign({}, rgb), rgb2hex(rgb)), { h,
            s,
            v });
    }
    function rgb2Color({ r, g, b, a }) {
        const rgb = { r, g, b, a };
        return Object.assign(Object.assign(Object.assign({}, rgb2hsv$1(rgb)), rgb2hex(rgb)), { r,
            g,
            b });
    }
    function hex2Color({ hex }) {
        const rgb = hex2rgb({ hex });
        return Object.assign(Object.assign(Object.assign({}, rgb), rgb2hsv$1(rgb)), { hex });
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(min, value), max);
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
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop$1;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop$1;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /**
     * Store that keeps track of the keys pressed, updated by the ArrowKeyHandler component
     */
    const keyPressed = writable({
        ArrowLeft: 0,
        ArrowUp: 0,
        ArrowRight: 0,
        ArrowDown: 0
    });
    /**
     * Store that keeps track of the keys pressed, with utility horizontal / vertical attributes
     * updated by the ArrowKeyHandler component
     */
    const keyPressedCustom = derived(keyPressed, ($keyPressed) => {
        return {
            ...$keyPressed,
            ArrowV: $keyPressed.ArrowUp + $keyPressed.ArrowDown,
            ArrowH: $keyPressed.ArrowLeft + $keyPressed.ArrowRight,
            ArrowVH: $keyPressed.ArrowUp + $keyPressed.ArrowDown + $keyPressed.ArrowLeft + $keyPressed.ArrowRight
        };
    });

    /**
     * Ease in out sin base function
     * @param x - param, between 1 and infinity
     * @param min - starting return value, default .001
     * @param max ending return value, default .01
     * @returns a number between min and max
     */
    function easeInOutSin(x, min = 0.001, max = 0.01) {
        /**
         * after the delay, the ease in starts (i.e. after x = DELAY)*
         */
        const DELAY = 50;
        /**
         * Duration of the transition (i.e. bewteen x = DELAY and x = DELAY + DURATION)
         */
        const DURATION = 50;
        const X = Math.min(1, Math.max(1, x - DELAY) / DURATION);
        return min + ((max - min) / 2) * (1 - Math.cos(Math.PI * X));
    }

    /* node_modules\svelte-awesome-color-picker\components\Picker.svelte generated by Svelte v3.38.3 */

    const { window: window_1$2 } = globals;
    const file$n = "node_modules\\svelte-awesome-color-picker\\components\\Picker.svelte";

    // (100:0) <svelte:component this={components.pickerWrapper} {focused} {toRight}>
    function create_default_slot$9(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[2].pickerIndicator;

    	function switch_props(ctx) {
    		return {
    			props: {
    				pos: /*pos*/ ctx[8],
    				color: hsv2Color({
    					h: /*h*/ ctx[3],
    					s: /*s*/ ctx[0],
    					v: /*v*/ ctx[1],
    					a: 1
    				})
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "class", "picker svelte-uiwgvv");
    			attr_dev(div, "tabindex", "0");
    			set_style(div, "--color-bg", /*colorBg*/ ctx[7]?.hex);
    			add_location(div, file$n, 100, 1, 3021);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			/*div_binding*/ ctx[17](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mousedown", stop_propagation(prevent_default(/*pickerMouseDown*/ ctx[9])), false, true, true),
    					listen_dev(div, "touchstart", /*touch*/ ctx[15], false, false, false),
    					listen_dev(div, "touchmove", stop_propagation(prevent_default(/*touch*/ ctx[15])), false, true, true),
    					listen_dev(div, "touchend", /*touch*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*pos*/ 256) switch_instance_changes.pos = /*pos*/ ctx[8];

    			if (dirty & /*h, s, v*/ 11) switch_instance_changes.color = hsv2Color({
    				h: /*h*/ ctx[3],
    				s: /*s*/ ctx[0],
    				v: /*v*/ ctx[1],
    				a: 1
    			});

    			if (switch_value !== (switch_value = /*components*/ ctx[2].pickerIndicator)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (!current || dirty & /*colorBg*/ 128) {
    				set_style(div, "--color-bg", /*colorBg*/ ctx[7]?.hex);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			/*div_binding*/ ctx[17](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$9.name,
    		type: "slot",
    		source: "(100:0) <svelte:component this={components.pickerWrapper} {focused} {toRight}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$q(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[2].pickerWrapper;

    	function switch_props(ctx) {
    		return {
    			props: {
    				focused: /*focused*/ ctx[6],
    				toRight: /*toRight*/ ctx[4],
    				$$slots: { default: [create_default_slot$9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$2, "mouseup", /*mouseUp*/ ctx[10], false, false, false),
    					listen_dev(window_1$2, "mousedown", /*mouseDown*/ ctx[12], false, false, false),
    					listen_dev(window_1$2, "mousemove", /*mouseMove*/ ctx[11], false, false, false),
    					listen_dev(window_1$2, "keyup", /*keyup*/ ctx[13], false, false, false),
    					listen_dev(window_1$2, "keydown", /*keydown*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*focused*/ 64) switch_instance_changes.focused = /*focused*/ ctx[6];
    			if (dirty & /*toRight*/ 16) switch_instance_changes.toRight = /*toRight*/ ctx[4];

    			if (dirty & /*$$scope, colorBg, picker, components, pos, h, s, v*/ 33554863) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*components*/ ctx[2].pickerWrapper)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let $keyPressedCustom;
    	let $keyPressed;
    	validate_store(keyPressedCustom, "keyPressedCustom");
    	component_subscribe($$self, keyPressedCustom, $$value => $$invalidate(21, $keyPressedCustom = $$value));
    	validate_store(keyPressed, "keyPressed");
    	component_subscribe($$self, keyPressed, $$value => $$invalidate(22, $keyPressed = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Picker", slots, []);
    	let { components } = $$props;
    	let { h } = $$props;
    	let { s } = $$props;
    	let { v } = $$props;
    	let { isOpen } = $$props;
    	let { toRight } = $$props;
    	let picker;
    	let isMouseDown = false;
    	let focused = false;
    	let focusMovementIntervalId;
    	let focusMovementCounter;
    	let colorBg;
    	let pos = { x: 100, y: 0 };

    	function onClick(e) {
    		let mouse = { x: e.offsetX, y: e.offsetY };
    		let width = picker.getBoundingClientRect().width;
    		let height = picker.getBoundingClientRect().height;
    		$$invalidate(0, s = clamp(mouse.x / width, 0, 1));
    		$$invalidate(1, v = clamp((height - mouse.y) / height, 0, 1));
    	}

    	function pickerMouseDown(e) {
    		if (e.button === 0) {
    			isMouseDown = true;
    			onClick(e);
    		}
    	}

    	function mouseUp() {
    		isMouseDown = false;
    	}

    	function mouseMove(e) {
    		if (isMouseDown) onClick({
    			offsetX: Math.max(0, Math.min(picker.getBoundingClientRect().width, e.clientX - picker.getBoundingClientRect().left)),
    			offsetY: Math.max(0, Math.min(picker.getBoundingClientRect().height, e.clientY - picker.getBoundingClientRect().top))
    		});
    	}

    	function mouseDown(e) {
    		if (!e.target.isSameNode(picker)) $$invalidate(6, focused = false);
    	}

    	function keyup(e) {
    		if (e.key === "Tab") $$invalidate(6, focused = !!document.activeElement?.isSameNode(picker));
    		if (!e.repeat && focused) move();
    	}

    	function keydown(e) {
    		if (focused && $keyPressedCustom.ArrowVH) {
    			e.preventDefault();
    			if (!e.repeat) move();
    		}

    		if (focused && e.shiftKey && e.key === "Tab") {
    			$$invalidate(16, isOpen = false);
    		}
    	}

    	function move() {
    		if ($keyPressedCustom.ArrowVH) {
    			if (!focusMovementIntervalId) {
    				focusMovementCounter = 0;

    				focusMovementIntervalId = window.setInterval(
    					() => {
    						let focusMovementFactor = easeInOutSin(++focusMovementCounter);
    						$$invalidate(0, s = Math.min(1, Math.max(0, s + ($keyPressed.ArrowRight - $keyPressed.ArrowLeft) * focusMovementFactor)));
    						$$invalidate(1, v = Math.min(1, Math.max(0, v + ($keyPressed.ArrowUp - $keyPressed.ArrowDown) * focusMovementFactor)));
    					},
    					10
    				);
    			}
    		} else if (focusMovementIntervalId) {
    			clearInterval(focusMovementIntervalId);
    			focusMovementIntervalId = undefined;
    		}
    	}

    	function touch(e) {
    		e.preventDefault();

    		onClick({
    			offsetX: e.changedTouches[0].clientX - picker.getBoundingClientRect().left,
    			offsetY: e.changedTouches[0].clientY - picker.getBoundingClientRect().top
    		});
    	}

    	const writable_props = ["components", "h", "s", "v", "isOpen", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Picker> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			picker = $$value;
    			$$invalidate(5, picker);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("components" in $$props) $$invalidate(2, components = $$props.components);
    		if ("h" in $$props) $$invalidate(3, h = $$props.h);
    		if ("s" in $$props) $$invalidate(0, s = $$props.s);
    		if ("v" in $$props) $$invalidate(1, v = $$props.v);
    		if ("isOpen" in $$props) $$invalidate(16, isOpen = $$props.isOpen);
    		if ("toRight" in $$props) $$invalidate(4, toRight = $$props.toRight);
    	};

    	$$self.$capture_state = () => ({
    		hsv2Color,
    		clamp,
    		keyPressed,
    		keyPressedCustom,
    		easeInOutSin,
    		components,
    		h,
    		s,
    		v,
    		isOpen,
    		toRight,
    		picker,
    		isMouseDown,
    		focused,
    		focusMovementIntervalId,
    		focusMovementCounter,
    		colorBg,
    		pos,
    		onClick,
    		pickerMouseDown,
    		mouseUp,
    		mouseMove,
    		mouseDown,
    		keyup,
    		keydown,
    		move,
    		touch,
    		$keyPressedCustom,
    		$keyPressed
    	});

    	$$self.$inject_state = $$props => {
    		if ("components" in $$props) $$invalidate(2, components = $$props.components);
    		if ("h" in $$props) $$invalidate(3, h = $$props.h);
    		if ("s" in $$props) $$invalidate(0, s = $$props.s);
    		if ("v" in $$props) $$invalidate(1, v = $$props.v);
    		if ("isOpen" in $$props) $$invalidate(16, isOpen = $$props.isOpen);
    		if ("toRight" in $$props) $$invalidate(4, toRight = $$props.toRight);
    		if ("picker" in $$props) $$invalidate(5, picker = $$props.picker);
    		if ("isMouseDown" in $$props) isMouseDown = $$props.isMouseDown;
    		if ("focused" in $$props) $$invalidate(6, focused = $$props.focused);
    		if ("focusMovementIntervalId" in $$props) focusMovementIntervalId = $$props.focusMovementIntervalId;
    		if ("focusMovementCounter" in $$props) focusMovementCounter = $$props.focusMovementCounter;
    		if ("colorBg" in $$props) $$invalidate(7, colorBg = $$props.colorBg);
    		if ("pos" in $$props) $$invalidate(8, pos = $$props.pos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*h*/ 8) {
    			if (typeof h === "number") $$invalidate(7, colorBg = hsv2Color({ h, s: 1, v: 1, a: 1 }));
    		}

    		if ($$self.$$.dirty & /*s, v, picker*/ 35) {
    			if (typeof s === "number" && typeof v === "number" && picker) $$invalidate(8, pos = { x: s * 100, y: (1 - v) * 100 });
    		}
    	};

    	return [
    		s,
    		v,
    		components,
    		h,
    		toRight,
    		picker,
    		focused,
    		colorBg,
    		pos,
    		pickerMouseDown,
    		mouseUp,
    		mouseMove,
    		mouseDown,
    		keyup,
    		keydown,
    		touch,
    		isOpen,
    		div_binding
    	];
    }

    class Picker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$o, create_fragment$q, safe_not_equal, {
    			components: 2,
    			h: 3,
    			s: 0,
    			v: 1,
    			isOpen: 16,
    			toRight: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Picker",
    			options,
    			id: create_fragment$q.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*components*/ ctx[2] === undefined && !("components" in props)) {
    			console.warn("<Picker> was created without expected prop 'components'");
    		}

    		if (/*h*/ ctx[3] === undefined && !("h" in props)) {
    			console.warn("<Picker> was created without expected prop 'h'");
    		}

    		if (/*s*/ ctx[0] === undefined && !("s" in props)) {
    			console.warn("<Picker> was created without expected prop 's'");
    		}

    		if (/*v*/ ctx[1] === undefined && !("v" in props)) {
    			console.warn("<Picker> was created without expected prop 'v'");
    		}

    		if (/*isOpen*/ ctx[16] === undefined && !("isOpen" in props)) {
    			console.warn("<Picker> was created without expected prop 'isOpen'");
    		}

    		if (/*toRight*/ ctx[4] === undefined && !("toRight" in props)) {
    			console.warn("<Picker> was created without expected prop 'toRight'");
    		}
    	}

    	get components() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set components(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get s() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set s(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get v() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set v(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\Slider.svelte generated by Svelte v3.38.3 */

    const { window: window_1$1 } = globals;
    const file$m = "node_modules\\svelte-awesome-color-picker\\components\\Slider.svelte";

    // (82:0) <svelte:component this={components.sliderWrapper} {focused} {toRight}>
    function create_default_slot$8(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[0].sliderIndicator;

    	function switch_props(ctx) {
    		return {
    			props: {
    				pos: /*pos*/ ctx[3],
    				toRight: /*toRight*/ ctx[1]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "class", "slider svelte-k84egy");
    			attr_dev(div, "tabindex", "0");
    			toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			add_location(div, file$m, 82, 1, 2429);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			/*div_binding*/ ctx[12](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mousedown", stop_propagation(prevent_default(/*mouseDown*/ ctx[5])), false, true, true),
    					listen_dev(div, "touchstart", /*touch*/ ctx[10], false, false, false),
    					listen_dev(div, "touchmove", stop_propagation(prevent_default(/*touch*/ ctx[10])), false, true, true),
    					listen_dev(div, "touchend", /*touch*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*pos*/ 8) switch_instance_changes.pos = /*pos*/ ctx[3];
    			if (dirty & /*toRight*/ 2) switch_instance_changes.toRight = /*toRight*/ ctx[1];

    			if (switch_value !== (switch_value = /*components*/ ctx[0].sliderIndicator)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (dirty & /*toRight*/ 2) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			/*div_binding*/ ctx[12](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$8.name,
    		type: "slot",
    		source: "(82:0) <svelte:component this={components.sliderWrapper} {focused} {toRight}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$p(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[0].sliderWrapper;

    	function switch_props(ctx) {
    		return {
    			props: {
    				focused: /*focused*/ ctx[4],
    				toRight: /*toRight*/ ctx[1],
    				$$slots: { default: [create_default_slot$8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$1, "mouseup", /*mouseUp*/ ctx[6], false, false, false),
    					listen_dev(window_1$1, "mousemove", /*mouseMove*/ ctx[7], false, false, false),
    					listen_dev(window_1$1, "keyup", /*keyup*/ ctx[8], false, false, false),
    					listen_dev(window_1$1, "keydown", /*keydown*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*focused*/ 16) switch_instance_changes.focused = /*focused*/ ctx[4];
    			if (dirty & /*toRight*/ 2) switch_instance_changes.toRight = /*toRight*/ ctx[1];

    			if (dirty & /*$$scope, slider, toRight, components, pos*/ 1048591) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*components*/ ctx[0].sliderWrapper)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let $keyPressedCustom;
    	let $keyPressed;
    	validate_store(keyPressedCustom, "keyPressedCustom");
    	component_subscribe($$self, keyPressedCustom, $$value => $$invalidate(16, $keyPressedCustom = $$value));
    	validate_store(keyPressed, "keyPressed");
    	component_subscribe($$self, keyPressed, $$value => $$invalidate(17, $keyPressed = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Slider", slots, []);
    	let { components } = $$props;
    	let { toRight } = $$props;
    	let slider;
    	let isMouseDown = false;
    	let { h } = $$props;
    	let pos = 0;
    	let focused = false;
    	let focusMovementIntervalId;
    	let focusMovementCounter;

    	function onClick(pos) {
    		const size = toRight
    		? slider.getBoundingClientRect().width
    		: slider.getBoundingClientRect().height;

    		const boundedPos = Math.max(0, Math.min(size, pos));
    		$$invalidate(11, h = boundedPos / size * 360);
    	}

    	function mouseDown(e) {
    		if (e.button === 0) {
    			isMouseDown = true;
    			onClick(toRight ? e.offsetX : e.offsetY);
    		}
    	}

    	function mouseUp() {
    		isMouseDown = false;
    	}

    	function mouseMove(e) {
    		if (isMouseDown) onClick(toRight
    		? e.clientX - slider.getBoundingClientRect().left
    		: e.clientY - slider.getBoundingClientRect().top);
    	}

    	function keyup(e) {
    		if (e.key === "Tab") $$invalidate(4, focused = !!document.activeElement?.isSameNode(slider));
    		if (!e.repeat && focused) move();
    	}

    	function keydown(e) {
    		if (focused && $keyPressedCustom.ArrowVH) {
    			e.preventDefault();
    			if (!e.repeat) move();
    		}
    	}

    	function move() {
    		if ($keyPressedCustom.ArrowVH) {
    			if (!focusMovementIntervalId) {
    				focusMovementCounter = 0;

    				focusMovementIntervalId = window.setInterval(
    					() => {
    						const focusMovementFactor = easeInOutSin(++focusMovementCounter);

    						const movement = toRight
    						? $keyPressed.ArrowRight - $keyPressed.ArrowLeft
    						: $keyPressed.ArrowDown - $keyPressed.ArrowUp;

    						$$invalidate(11, h = Math.min(360, Math.max(0, h + movement * 360 * focusMovementFactor)));
    					},
    					10
    				);
    			}
    		} else if (focusMovementIntervalId) {
    			clearInterval(focusMovementIntervalId);
    			focusMovementIntervalId = undefined;
    		}
    	}

    	function touch(e) {
    		e.preventDefault();

    		onClick(toRight
    		? e.changedTouches[0].clientX - slider.getBoundingClientRect().left
    		: e.changedTouches[0].clientY - slider.getBoundingClientRect().top);
    	}

    	const writable_props = ["components", "toRight", "h"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Slider> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			slider = $$value;
    			$$invalidate(2, slider);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("components" in $$props) $$invalidate(0, components = $$props.components);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    		if ("h" in $$props) $$invalidate(11, h = $$props.h);
    	};

    	$$self.$capture_state = () => ({
    		keyPressed,
    		keyPressedCustom,
    		easeInOutSin,
    		components,
    		toRight,
    		slider,
    		isMouseDown,
    		h,
    		pos,
    		focused,
    		focusMovementIntervalId,
    		focusMovementCounter,
    		onClick,
    		mouseDown,
    		mouseUp,
    		mouseMove,
    		keyup,
    		keydown,
    		move,
    		touch,
    		$keyPressedCustom,
    		$keyPressed
    	});

    	$$self.$inject_state = $$props => {
    		if ("components" in $$props) $$invalidate(0, components = $$props.components);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    		if ("slider" in $$props) $$invalidate(2, slider = $$props.slider);
    		if ("isMouseDown" in $$props) isMouseDown = $$props.isMouseDown;
    		if ("h" in $$props) $$invalidate(11, h = $$props.h);
    		if ("pos" in $$props) $$invalidate(3, pos = $$props.pos);
    		if ("focused" in $$props) $$invalidate(4, focused = $$props.focused);
    		if ("focusMovementIntervalId" in $$props) focusMovementIntervalId = $$props.focusMovementIntervalId;
    		if ("focusMovementCounter" in $$props) focusMovementCounter = $$props.focusMovementCounter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*h, slider*/ 2052) {
    			if (typeof h === "number" && slider) $$invalidate(3, pos = 100 * h / 360);
    		}
    	};

    	return [
    		components,
    		toRight,
    		slider,
    		pos,
    		focused,
    		mouseDown,
    		mouseUp,
    		mouseMove,
    		keyup,
    		keydown,
    		touch,
    		h,
    		div_binding
    	];
    }

    class Slider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$p, safe_not_equal, { components: 0, toRight: 1, h: 11 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Slider",
    			options,
    			id: create_fragment$p.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*components*/ ctx[0] === undefined && !("components" in props)) {
    			console.warn("<Slider> was created without expected prop 'components'");
    		}

    		if (/*toRight*/ ctx[1] === undefined && !("toRight" in props)) {
    			console.warn("<Slider> was created without expected prop 'toRight'");
    		}

    		if (/*h*/ ctx[11] === undefined && !("h" in props)) {
    			console.warn("<Slider> was created without expected prop 'h'");
    		}
    	}

    	get components() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set components(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\Alpha.svelte generated by Svelte v3.38.3 */

    const { window: window_1 } = globals;
    const file$l = "node_modules\\svelte-awesome-color-picker\\components\\Alpha.svelte";

    // (91:0) <svelte:component this={components.alphaWrapper} {focused} {toRight}>
    function create_default_slot$7(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[1].alphaIndicator;

    	function switch_props(ctx) {
    		return {
    			props: {
    				pos: /*pos*/ ctx[9],
    				toRight: /*toRight*/ ctx[6],
    				color: hsv2Color({
    					h: /*h*/ ctx[2],
    					s: /*s*/ ctx[3],
    					v: /*v*/ ctx[4],
    					a: /*a*/ ctx[0]
    				})
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "alpha svelte-1526m2d");
    			set_style(div, "--alpha-color", /*hex*/ ctx[5]?.substring(0, 7));
    			toggle_class(div, "to-right", /*toRight*/ ctx[6]);
    			add_location(div, file$l, 91, 1, 2590);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			/*div_binding*/ ctx[17](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mousedown", stop_propagation(prevent_default(/*mouseDown*/ ctx[10])), false, true, true),
    					listen_dev(div, "touchstart", /*touch*/ ctx[15], false, false, false),
    					listen_dev(div, "touchmove", stop_propagation(prevent_default(/*touch*/ ctx[15])), false, true, true),
    					listen_dev(div, "touchend", /*touch*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*pos*/ 512) switch_instance_changes.pos = /*pos*/ ctx[9];
    			if (dirty & /*toRight*/ 64) switch_instance_changes.toRight = /*toRight*/ ctx[6];

    			if (dirty & /*h, s, v, a*/ 29) switch_instance_changes.color = hsv2Color({
    				h: /*h*/ ctx[2],
    				s: /*s*/ ctx[3],
    				v: /*v*/ ctx[4],
    				a: /*a*/ ctx[0]
    			});

    			if (switch_value !== (switch_value = /*components*/ ctx[1].alphaIndicator)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (!current || dirty & /*hex*/ 32) {
    				set_style(div, "--alpha-color", /*hex*/ ctx[5]?.substring(0, 7));
    			}

    			if (dirty & /*toRight*/ 64) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[6]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			/*div_binding*/ ctx[17](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$7.name,
    		type: "slot",
    		source: "(91:0) <svelte:component this={components.alphaWrapper} {focused} {toRight}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$o(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*components*/ ctx[1].alphaWrapper;

    	function switch_props(ctx) {
    		return {
    			props: {
    				focused: /*focused*/ ctx[8],
    				toRight: /*toRight*/ ctx[6],
    				$$slots: { default: [create_default_slot$7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "mouseup", /*mouseUp*/ ctx[11], false, false, false),
    					listen_dev(window_1, "mousemove", /*mouseMove*/ ctx[12], false, false, false),
    					listen_dev(window_1, "keyup", /*keyup*/ ctx[13], false, false, false),
    					listen_dev(window_1, "keydown", /*keydown*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*focused*/ 256) switch_instance_changes.focused = /*focused*/ ctx[8];
    			if (dirty & /*toRight*/ 64) switch_instance_changes.toRight = /*toRight*/ ctx[6];

    			if (dirty & /*$$scope, hex, alpha, toRight, components, pos, h, s, v, a*/ 33555199) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*components*/ ctx[1].alphaWrapper)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let $keyPressedCustom;
    	let $keyPressed;
    	validate_store(keyPressedCustom, "keyPressedCustom");
    	component_subscribe($$self, keyPressedCustom, $$value => $$invalidate(21, $keyPressedCustom = $$value));
    	validate_store(keyPressed, "keyPressed");
    	component_subscribe($$self, keyPressed, $$value => $$invalidate(22, $keyPressed = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Alpha", slots, []);
    	let { components } = $$props;
    	let { isOpen } = $$props;
    	let { h } = $$props;
    	let { s } = $$props;
    	let { v } = $$props;
    	let { a = 1 } = $$props;
    	let { hex } = $$props;
    	let { toRight } = $$props;
    	let alpha;
    	let isMouseDown = false;
    	let focused = false;
    	let focusMovementIntervalId;
    	let focusMovementCounter;
    	let pos;

    	function onClick(pos) {
    		const size = toRight
    		? alpha.getBoundingClientRect().width
    		: alpha.getBoundingClientRect().height;

    		const boundedPos = Math.max(0, Math.min(size, pos));
    		$$invalidate(0, a = boundedPos / size);
    	}

    	function mouseDown(e) {
    		if (e.button === 0) {
    			isMouseDown = true;
    			onClick(toRight ? e.offsetX : e.offsetY);
    		}
    	}

    	function mouseUp() {
    		isMouseDown = false;
    	}

    	function mouseMove(e) {
    		if (isMouseDown) onClick(toRight
    		? e.clientX - alpha.getBoundingClientRect().left
    		: e.clientY - alpha.getBoundingClientRect().top);
    	}

    	function keyup(e) {
    		if (e.key === "Tab") $$invalidate(8, focused = !!document.activeElement?.isSameNode(alpha));
    		if (!e.repeat && focused) move();
    	}

    	function keydown(e) {
    		if (focused && $keyPressedCustom.ArrowVH) {
    			e.preventDefault();
    			if (!e.repeat) move();
    		}

    		if (focused && !e.shiftKey && e.key === "Tab") {
    			$$invalidate(16, isOpen = false);
    		}
    	}

    	function move() {
    		if ($keyPressedCustom.ArrowVH) {
    			if (!focusMovementIntervalId) {
    				focusMovementCounter = 0;

    				focusMovementIntervalId = window.setInterval(
    					() => {
    						const focusMovementFactor = easeInOutSin(++focusMovementCounter);

    						const movement = toRight
    						? $keyPressed.ArrowRight - $keyPressed.ArrowLeft
    						: $keyPressed.ArrowDown - $keyPressed.ArrowUp;

    						$$invalidate(0, a = Math.min(1, Math.max(0, a + movement * focusMovementFactor)));
    					},
    					10
    				);
    			}
    		} else if (focusMovementIntervalId) {
    			clearInterval(focusMovementIntervalId);
    			focusMovementIntervalId = undefined;
    		}
    	}

    	function touch(e) {
    		e.preventDefault();

    		onClick(toRight
    		? e.changedTouches[0].clientX - alpha.getBoundingClientRect().left
    		: e.changedTouches[0].clientY - alpha.getBoundingClientRect().top);
    	}

    	const writable_props = ["components", "isOpen", "h", "s", "v", "a", "hex", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Alpha> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			alpha = $$value;
    			$$invalidate(7, alpha);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("components" in $$props) $$invalidate(1, components = $$props.components);
    		if ("isOpen" in $$props) $$invalidate(16, isOpen = $$props.isOpen);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("s" in $$props) $$invalidate(3, s = $$props.s);
    		if ("v" in $$props) $$invalidate(4, v = $$props.v);
    		if ("a" in $$props) $$invalidate(0, a = $$props.a);
    		if ("hex" in $$props) $$invalidate(5, hex = $$props.hex);
    		if ("toRight" in $$props) $$invalidate(6, toRight = $$props.toRight);
    	};

    	$$self.$capture_state = () => ({
    		hsv2Color,
    		keyPressed,
    		keyPressedCustom,
    		easeInOutSin,
    		components,
    		isOpen,
    		h,
    		s,
    		v,
    		a,
    		hex,
    		toRight,
    		alpha,
    		isMouseDown,
    		focused,
    		focusMovementIntervalId,
    		focusMovementCounter,
    		pos,
    		onClick,
    		mouseDown,
    		mouseUp,
    		mouseMove,
    		keyup,
    		keydown,
    		move,
    		touch,
    		$keyPressedCustom,
    		$keyPressed
    	});

    	$$self.$inject_state = $$props => {
    		if ("components" in $$props) $$invalidate(1, components = $$props.components);
    		if ("isOpen" in $$props) $$invalidate(16, isOpen = $$props.isOpen);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("s" in $$props) $$invalidate(3, s = $$props.s);
    		if ("v" in $$props) $$invalidate(4, v = $$props.v);
    		if ("a" in $$props) $$invalidate(0, a = $$props.a);
    		if ("hex" in $$props) $$invalidate(5, hex = $$props.hex);
    		if ("toRight" in $$props) $$invalidate(6, toRight = $$props.toRight);
    		if ("alpha" in $$props) $$invalidate(7, alpha = $$props.alpha);
    		if ("isMouseDown" in $$props) isMouseDown = $$props.isMouseDown;
    		if ("focused" in $$props) $$invalidate(8, focused = $$props.focused);
    		if ("focusMovementIntervalId" in $$props) focusMovementIntervalId = $$props.focusMovementIntervalId;
    		if ("focusMovementCounter" in $$props) focusMovementCounter = $$props.focusMovementCounter;
    		if ("pos" in $$props) $$invalidate(9, pos = $$props.pos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*a, alpha*/ 129) {
    			if (typeof a === "number" && alpha) $$invalidate(9, pos = 100 * a);
    		}
    	};

    	return [
    		a,
    		components,
    		h,
    		s,
    		v,
    		hex,
    		toRight,
    		alpha,
    		focused,
    		pos,
    		mouseDown,
    		mouseUp,
    		mouseMove,
    		keyup,
    		keydown,
    		touch,
    		isOpen,
    		div_binding
    	];
    }

    class Alpha extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$m, create_fragment$o, safe_not_equal, {
    			components: 1,
    			isOpen: 16,
    			h: 2,
    			s: 3,
    			v: 4,
    			a: 0,
    			hex: 5,
    			toRight: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Alpha",
    			options,
    			id: create_fragment$o.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*components*/ ctx[1] === undefined && !("components" in props)) {
    			console.warn("<Alpha> was created without expected prop 'components'");
    		}

    		if (/*isOpen*/ ctx[16] === undefined && !("isOpen" in props)) {
    			console.warn("<Alpha> was created without expected prop 'isOpen'");
    		}

    		if (/*h*/ ctx[2] === undefined && !("h" in props)) {
    			console.warn("<Alpha> was created without expected prop 'h'");
    		}

    		if (/*s*/ ctx[3] === undefined && !("s" in props)) {
    			console.warn("<Alpha> was created without expected prop 's'");
    		}

    		if (/*v*/ ctx[4] === undefined && !("v" in props)) {
    			console.warn("<Alpha> was created without expected prop 'v'");
    		}

    		if (/*hex*/ ctx[5] === undefined && !("hex" in props)) {
    			console.warn("<Alpha> was created without expected prop 'hex'");
    		}

    		if (/*toRight*/ ctx[6] === undefined && !("toRight" in props)) {
    			console.warn("<Alpha> was created without expected prop 'toRight'");
    		}
    	}

    	get components() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set components(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get s() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set s(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get v() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set v(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get a() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set a(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hex() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hex(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<Alpha>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<Alpha>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\SliderIndicator.svelte generated by Svelte v3.38.3 */

    const file$k = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\SliderIndicator.svelte";

    function create_fragment$n(ctx) {
    	let div;
    	let div_style_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "style", div_style_value = "" + ((/*toRight*/ ctx[1] ? "left" : "top") + ": " + /*pos*/ ctx[0] + "%;"));
    			attr_dev(div, "class", "svelte-1vfj60t");
    			toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			add_location(div, file$k, 5, 0, 73);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*toRight, pos*/ 3 && div_style_value !== (div_style_value = "" + ((/*toRight*/ ctx[1] ? "left" : "top") + ": " + /*pos*/ ctx[0] + "%;"))) {
    				attr_dev(div, "style", div_style_value);
    			}

    			if (dirty & /*toRight*/ 2) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SliderIndicator", slots, []);
    	let { pos } = $$props;
    	let { color } = $$props;
    	let { toRight } = $$props;
    	const writable_props = ["pos", "color", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SliderIndicator> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    	};

    	$$self.$capture_state = () => ({ pos, color, toRight });

    	$$self.$inject_state = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pos, toRight, color];
    }

    class SliderIndicator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$n, safe_not_equal, { pos: 0, color: 2, toRight: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SliderIndicator",
    			options,
    			id: create_fragment$n.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pos*/ ctx[0] === undefined && !("pos" in props)) {
    			console.warn("<SliderIndicator> was created without expected prop 'pos'");
    		}

    		if (/*color*/ ctx[2] === undefined && !("color" in props)) {
    			console.warn("<SliderIndicator> was created without expected prop 'color'");
    		}

    		if (/*toRight*/ ctx[1] === undefined && !("toRight" in props)) {
    			console.warn("<SliderIndicator> was created without expected prop 'toRight'");
    		}
    	}

    	get pos() {
    		throw new Error("<SliderIndicator>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pos(value) {
    		throw new Error("<SliderIndicator>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<SliderIndicator>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<SliderIndicator>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<SliderIndicator>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<SliderIndicator>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\PickerIndicator.svelte generated by Svelte v3.38.3 */

    const file$j = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\PickerIndicator.svelte";

    function create_fragment$m(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			set_style(div, "left", /*pos*/ ctx[0].x + "%");
    			set_style(div, "top", /*pos*/ ctx[0].y + "%");
    			set_style(div, "background-color", /*color*/ ctx[1].hex);
    			attr_dev(div, "class", "svelte-jwe14i");
    			add_location(div, file$j, 4, 0, 53);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pos*/ 1) {
    				set_style(div, "left", /*pos*/ ctx[0].x + "%");
    			}

    			if (dirty & /*pos*/ 1) {
    				set_style(div, "top", /*pos*/ ctx[0].y + "%");
    			}

    			if (dirty & /*color*/ 2) {
    				set_style(div, "background-color", /*color*/ ctx[1].hex);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PickerIndicator", slots, []);
    	let { pos } = $$props;
    	let { color } = $$props;
    	const writable_props = ["pos", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PickerIndicator> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ pos, color });

    	$$self.$inject_state = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pos, color];
    }

    class PickerIndicator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$m, safe_not_equal, { pos: 0, color: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PickerIndicator",
    			options,
    			id: create_fragment$m.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pos*/ ctx[0] === undefined && !("pos" in props)) {
    			console.warn("<PickerIndicator> was created without expected prop 'pos'");
    		}

    		if (/*color*/ ctx[1] === undefined && !("color" in props)) {
    			console.warn("<PickerIndicator> was created without expected prop 'color'");
    		}
    	}

    	get pos() {
    		throw new Error("<PickerIndicator>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pos(value) {
    		throw new Error("<PickerIndicator>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<PickerIndicator>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<PickerIndicator>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\ArrowKeyHandler.svelte generated by Svelte v3.38.3 */

    function create_fragment$l(ctx) {
    	let mounted;
    	let dispose;

    	const block = {
    		c: noop$1,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keyup", /*keyup*/ ctx[0], false, false, false),
    					listen_dev(window, "keydown", /*keydown*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let $keyPressed;
    	validate_store(keyPressed, "keyPressed");
    	component_subscribe($$self, keyPressed, $$value => $$invalidate(2, $keyPressed = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ArrowKeyHandler", slots, []);

    	function keyup(e) {
    		if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key)) {
    			set_store_value(keyPressed, $keyPressed[e.key] = 0, $keyPressed);
    			keyPressed.set($keyPressed);
    		}
    	}

    	function keydown(e) {
    		if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key)) {
    			if (!e.repeat) {
    				set_store_value(keyPressed, $keyPressed[e.key] = 1, $keyPressed);
    				keyPressed.set($keyPressed);
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ArrowKeyHandler> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ keyPressed, keyup, keydown, $keyPressed });
    	return [keyup, keydown];
    }

    class ArrowKeyHandler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ArrowKeyHandler",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\PickerWrapper.svelte generated by Svelte v3.38.3 */

    const file$i = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\PickerWrapper.svelte";

    function create_fragment$k(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "svelte-1uiperi");
    			toggle_class(div, "focused", /*focused*/ ctx[0]);
    			toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			add_location(div, file$i, 4, 0, 59);
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*focused*/ 1) {
    				toggle_class(div, "focused", /*focused*/ ctx[0]);
    			}

    			if (dirty & /*toRight*/ 2) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[1]);
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
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PickerWrapper", slots, ['default']);
    	let { focused } = $$props;
    	let { toRight } = $$props;
    	const writable_props = ["focused", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PickerWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("focused" in $$props) $$invalidate(0, focused = $$props.focused);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ focused, toRight });

    	$$self.$inject_state = $$props => {
    		if ("focused" in $$props) $$invalidate(0, focused = $$props.focused);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [focused, toRight, $$scope, slots];
    }

    class PickerWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$k, safe_not_equal, { focused: 0, toRight: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PickerWrapper",
    			options,
    			id: create_fragment$k.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*focused*/ ctx[0] === undefined && !("focused" in props)) {
    			console.warn("<PickerWrapper> was created without expected prop 'focused'");
    		}

    		if (/*toRight*/ ctx[1] === undefined && !("toRight" in props)) {
    			console.warn("<PickerWrapper> was created without expected prop 'toRight'");
    		}
    	}

    	get focused() {
    		throw new Error("<PickerWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focused(value) {
    		throw new Error("<PickerWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<PickerWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<PickerWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\SliderWrapper.svelte generated by Svelte v3.38.3 */

    const file$h = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\SliderWrapper.svelte";

    function create_fragment$j(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "svelte-6vskim");
    			toggle_class(div, "focused", /*focused*/ ctx[0]);
    			toggle_class(div, "to-right", /*toRight*/ ctx[1]);
    			add_location(div, file$h, 4, 0, 59);
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*focused*/ 1) {
    				toggle_class(div, "focused", /*focused*/ ctx[0]);
    			}

    			if (dirty & /*toRight*/ 2) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[1]);
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SliderWrapper", slots, ['default']);
    	let { focused } = $$props;
    	let { toRight } = $$props;
    	const writable_props = ["focused", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SliderWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("focused" in $$props) $$invalidate(0, focused = $$props.focused);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ focused, toRight });

    	$$self.$inject_state = $$props => {
    		if ("focused" in $$props) $$invalidate(0, focused = $$props.focused);
    		if ("toRight" in $$props) $$invalidate(1, toRight = $$props.toRight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [focused, toRight, $$scope, slots];
    }

    class SliderWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$j, safe_not_equal, { focused: 0, toRight: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SliderWrapper",
    			options,
    			id: create_fragment$j.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*focused*/ ctx[0] === undefined && !("focused" in props)) {
    			console.warn("<SliderWrapper> was created without expected prop 'focused'");
    		}

    		if (/*toRight*/ ctx[1] === undefined && !("toRight" in props)) {
    			console.warn("<SliderWrapper> was created without expected prop 'toRight'");
    		}
    	}

    	get focused() {
    		throw new Error("<SliderWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focused(value) {
    		throw new Error("<SliderWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<SliderWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<SliderWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\Input.svelte generated by Svelte v3.38.3 */

    const file$g = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\Input.svelte";

    function create_fragment$i(ctx) {
    	let button_1;
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button_1 = element("button");
    			div = element("div");
    			t0 = space();
    			t1 = text(/*label*/ ctx[2]);
    			t2 = space();
    			input = element("input");
    			set_style(div, "background-color", /*color*/ ctx[1].hex);
    			attr_dev(div, "class", "svelte-1qwu023");
    			add_location(div, file$g, 13, 1, 289);
    			attr_dev(button_1, "class", "svelte-1qwu023");
    			add_location(button_1, file$g, 12, 0, 260);
    			attr_dev(input, "type", "hidden");
    			input.value = input_value_value = /*color*/ ctx[1].hex;
    			add_location(input, file$g, 16, 0, 355);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button_1, anchor);
    			append_dev(button_1, div);
    			append_dev(button_1, t0);
    			append_dev(button_1, t1);
    			/*button_1_binding*/ ctx[5](button_1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(window, "keyup", /*keyup*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 2) {
    				set_style(div, "background-color", /*color*/ ctx[1].hex);
    			}

    			if (dirty & /*label*/ 4) set_data_dev(t1, /*label*/ ctx[2]);

    			if (dirty & /*color*/ 2 && input_value_value !== (input_value_value = /*color*/ ctx[1].hex)) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button_1);
    			/*button_1_binding*/ ctx[5](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Input", slots, []);
    	let { button } = $$props;
    	let { color } = $$props;
    	let { label } = $$props;
    	let { isOpen } = $$props;

    	function keyup(e) {
    		if (document.activeElement?.isSameNode(button) && !e.shiftKey && e.key === "Tab") $$invalidate(4, isOpen = true);
    	}

    	const writable_props = ["button", "color", "label", "isOpen"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			button = $$value;
    			$$invalidate(0, button);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("button" in $$props) $$invalidate(0, button = $$props.button);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("isOpen" in $$props) $$invalidate(4, isOpen = $$props.isOpen);
    	};

    	$$self.$capture_state = () => ({ button, color, label, isOpen, keyup });

    	$$self.$inject_state = $$props => {
    		if ("button" in $$props) $$invalidate(0, button = $$props.button);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("isOpen" in $$props) $$invalidate(4, isOpen = $$props.isOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [button, color, label, keyup, isOpen, button_1_binding];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$i, safe_not_equal, { button: 0, color: 1, label: 2, isOpen: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$i.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*button*/ ctx[0] === undefined && !("button" in props)) {
    			console.warn("<Input> was created without expected prop 'button'");
    		}

    		if (/*color*/ ctx[1] === undefined && !("color" in props)) {
    			console.warn("<Input> was created without expected prop 'color'");
    		}

    		if (/*label*/ ctx[2] === undefined && !("label" in props)) {
    			console.warn("<Input> was created without expected prop 'label'");
    		}

    		if (/*isOpen*/ ctx[4] === undefined && !("isOpen" in props)) {
    			console.warn("<Input> was created without expected prop 'isOpen'");
    		}
    	}

    	get button() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set button(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\variant\default\Wrapper.svelte generated by Svelte v3.38.3 */

    const file$f = "node_modules\\svelte-awesome-color-picker\\components\\variant\\default\\Wrapper.svelte";

    function create_fragment$h(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "wrapper svelte-w29n8e");
    			toggle_class(div, "isOpen", /*isOpen*/ ctx[1]);
    			toggle_class(div, "isPopup", /*isPopup*/ ctx[2]);
    			toggle_class(div, "to-right", /*toRight*/ ctx[3]);
    			add_location(div, file$f, 6, 0, 98);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[6](div);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*isOpen*/ 2) {
    				toggle_class(div, "isOpen", /*isOpen*/ ctx[1]);
    			}

    			if (dirty & /*isPopup*/ 4) {
    				toggle_class(div, "isPopup", /*isPopup*/ ctx[2]);
    			}

    			if (dirty & /*toRight*/ 8) {
    				toggle_class(div, "to-right", /*toRight*/ ctx[3]);
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
    			/*div_binding*/ ctx[6](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Wrapper", slots, ['default']);
    	let { wrapper } = $$props;
    	let { isOpen } = $$props;
    	let { isPopup } = $$props;
    	let { toRight } = $$props;
    	const writable_props = ["wrapper", "isOpen", "isPopup", "toRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Wrapper> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrapper = $$value;
    			$$invalidate(0, wrapper);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("wrapper" in $$props) $$invalidate(0, wrapper = $$props.wrapper);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("isPopup" in $$props) $$invalidate(2, isPopup = $$props.isPopup);
    		if ("toRight" in $$props) $$invalidate(3, toRight = $$props.toRight);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ wrapper, isOpen, isPopup, toRight });

    	$$self.$inject_state = $$props => {
    		if ("wrapper" in $$props) $$invalidate(0, wrapper = $$props.wrapper);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("isPopup" in $$props) $$invalidate(2, isPopup = $$props.isPopup);
    		if ("toRight" in $$props) $$invalidate(3, toRight = $$props.toRight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wrapper, isOpen, isPopup, toRight, $$scope, slots, div_binding];
    }

    class Wrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$f, create_fragment$h, safe_not_equal, {
    			wrapper: 0,
    			isOpen: 1,
    			isPopup: 2,
    			toRight: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wrapper",
    			options,
    			id: create_fragment$h.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*wrapper*/ ctx[0] === undefined && !("wrapper" in props)) {
    			console.warn("<Wrapper> was created without expected prop 'wrapper'");
    		}

    		if (/*isOpen*/ ctx[1] === undefined && !("isOpen" in props)) {
    			console.warn("<Wrapper> was created without expected prop 'isOpen'");
    		}

    		if (/*isPopup*/ ctx[2] === undefined && !("isPopup" in props)) {
    			console.warn("<Wrapper> was created without expected prop 'isPopup'");
    		}

    		if (/*toRight*/ ctx[3] === undefined && !("toRight" in props)) {
    			console.warn("<Wrapper> was created without expected prop 'toRight'");
    		}
    	}

    	get wrapper() {
    		throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wrapper(value) {
    		throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isPopup() {
    		throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isPopup(value) {
    		throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome-color-picker\components\ColorPicker.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$1 } = globals;

    // (107:0) {#if isInput}
    function create_if_block_1$3(ctx) {
    	let switch_instance;
    	let updating_button;
    	let updating_isOpen;
    	let switch_instance_anchor;
    	let current;

    	function switch_instance_button_binding(value) {
    		/*switch_instance_button_binding*/ ctx[14](value);
    	}

    	function switch_instance_isOpen_binding(value) {
    		/*switch_instance_isOpen_binding*/ ctx[15](value);
    	}

    	var switch_value = /*getComponents*/ ctx[11]().input;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			color: {
    				.../*hsv*/ ctx[1],
    				.../*rgb*/ ctx[0],
    				hex: /*hex*/ ctx[2]
    			},
    			label: /*label*/ ctx[4]
    		};

    		if (/*button*/ ctx[9] !== void 0) {
    			switch_instance_props.button = /*button*/ ctx[9];
    		}

    		if (/*isOpen*/ ctx[3] !== void 0) {
    			switch_instance_props.isOpen = /*isOpen*/ ctx[3];
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		binding_callbacks.push(() => bind(switch_instance, "button", switch_instance_button_binding));
    		binding_callbacks.push(() => bind(switch_instance, "isOpen", switch_instance_isOpen_binding));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*hsv, rgb, hex*/ 7) switch_instance_changes.color = {
    				.../*hsv*/ ctx[1],
    				.../*rgb*/ ctx[0],
    				hex: /*hex*/ ctx[2]
    			};

    			if (dirty & /*label*/ 16) switch_instance_changes.label = /*label*/ ctx[4];

    			if (!updating_button && dirty & /*button*/ 512) {
    				updating_button = true;
    				switch_instance_changes.button = /*button*/ ctx[9];
    				add_flush_callback(() => updating_button = false);
    			}

    			if (!updating_isOpen && dirty & /*isOpen*/ 8) {
    				updating_isOpen = true;
    				switch_instance_changes.isOpen = /*isOpen*/ ctx[3];
    				add_flush_callback(() => updating_isOpen = false);
    			}

    			if (switch_value !== (switch_value = /*getComponents*/ ctx[11]().input)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					binding_callbacks.push(() => bind(switch_instance, "button", switch_instance_button_binding));
    					binding_callbacks.push(() => bind(switch_instance, "isOpen", switch_instance_isOpen_binding));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(107:0) {#if isInput}",
    		ctx
    	});

    	return block;
    }

    // (127:1) {#if isAlpha}
    function create_if_block$b(ctx) {
    	let alpha;
    	let updating_a;
    	let updating_isOpen;
    	let current;

    	function alpha_a_binding(value) {
    		/*alpha_a_binding*/ ctx[20](value);
    	}

    	function alpha_isOpen_binding(value) {
    		/*alpha_isOpen_binding*/ ctx[21](value);
    	}

    	let alpha_props = {
    		components: /*getComponents*/ ctx[11](),
    		h: /*hsv*/ ctx[1].h,
    		s: /*hsv*/ ctx[1].s,
    		v: /*hsv*/ ctx[1].v,
    		hex: /*hex*/ ctx[2],
    		toRight: /*toRight*/ ctx[8]
    	};

    	if (/*hsv*/ ctx[1].a !== void 0) {
    		alpha_props.a = /*hsv*/ ctx[1].a;
    	}

    	if (/*isOpen*/ ctx[3] !== void 0) {
    		alpha_props.isOpen = /*isOpen*/ ctx[3];
    	}

    	alpha = new Alpha({ props: alpha_props, $$inline: true });
    	binding_callbacks.push(() => bind(alpha, "a", alpha_a_binding));
    	binding_callbacks.push(() => bind(alpha, "isOpen", alpha_isOpen_binding));

    	const block = {
    		c: function create() {
    			create_component(alpha.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(alpha, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const alpha_changes = {};
    			if (dirty & /*hsv*/ 2) alpha_changes.h = /*hsv*/ ctx[1].h;
    			if (dirty & /*hsv*/ 2) alpha_changes.s = /*hsv*/ ctx[1].s;
    			if (dirty & /*hsv*/ 2) alpha_changes.v = /*hsv*/ ctx[1].v;
    			if (dirty & /*hex*/ 4) alpha_changes.hex = /*hex*/ ctx[2];
    			if (dirty & /*toRight*/ 256) alpha_changes.toRight = /*toRight*/ ctx[8];

    			if (!updating_a && dirty & /*hsv*/ 2) {
    				updating_a = true;
    				alpha_changes.a = /*hsv*/ ctx[1].a;
    				add_flush_callback(() => updating_a = false);
    			}

    			if (!updating_isOpen && dirty & /*isOpen*/ 8) {
    				updating_isOpen = true;
    				alpha_changes.isOpen = /*isOpen*/ ctx[3];
    				add_flush_callback(() => updating_isOpen = false);
    			}

    			alpha.$set(alpha_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(alpha.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(alpha.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(alpha, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(127:1) {#if isAlpha}",
    		ctx
    	});

    	return block;
    }

    // (117:0) <svelte:component this={getComponents().wrapper} bind:wrapper {isOpen} {isPopup} {toRight}>
    function create_default_slot$6(ctx) {
    	let picker;
    	let updating_s;
    	let updating_v;
    	let updating_isOpen;
    	let t0;
    	let slider;
    	let updating_h;
    	let t1;
    	let if_block_anchor;
    	let current;

    	function picker_s_binding(value) {
    		/*picker_s_binding*/ ctx[16](value);
    	}

    	function picker_v_binding(value) {
    		/*picker_v_binding*/ ctx[17](value);
    	}

    	function picker_isOpen_binding(value) {
    		/*picker_isOpen_binding*/ ctx[18](value);
    	}

    	let picker_props = {
    		components: /*getComponents*/ ctx[11](),
    		h: /*hsv*/ ctx[1].h,
    		toRight: /*toRight*/ ctx[8]
    	};

    	if (/*hsv*/ ctx[1].s !== void 0) {
    		picker_props.s = /*hsv*/ ctx[1].s;
    	}

    	if (/*hsv*/ ctx[1].v !== void 0) {
    		picker_props.v = /*hsv*/ ctx[1].v;
    	}

    	if (/*isOpen*/ ctx[3] !== void 0) {
    		picker_props.isOpen = /*isOpen*/ ctx[3];
    	}

    	picker = new Picker({ props: picker_props, $$inline: true });
    	binding_callbacks.push(() => bind(picker, "s", picker_s_binding));
    	binding_callbacks.push(() => bind(picker, "v", picker_v_binding));
    	binding_callbacks.push(() => bind(picker, "isOpen", picker_isOpen_binding));

    	function slider_h_binding(value) {
    		/*slider_h_binding*/ ctx[19](value);
    	}

    	let slider_props = {
    		components: /*getComponents*/ ctx[11](),
    		toRight: /*toRight*/ ctx[8]
    	};

    	if (/*hsv*/ ctx[1].h !== void 0) {
    		slider_props.h = /*hsv*/ ctx[1].h;
    	}

    	slider = new Slider({ props: slider_props, $$inline: true });
    	binding_callbacks.push(() => bind(slider, "h", slider_h_binding));
    	let if_block = /*isAlpha*/ ctx[5] && create_if_block$b(ctx);

    	const block = {
    		c: function create() {
    			create_component(picker.$$.fragment);
    			t0 = space();
    			create_component(slider.$$.fragment);
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(picker, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(slider, target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const picker_changes = {};
    			if (dirty & /*hsv*/ 2) picker_changes.h = /*hsv*/ ctx[1].h;
    			if (dirty & /*toRight*/ 256) picker_changes.toRight = /*toRight*/ ctx[8];

    			if (!updating_s && dirty & /*hsv*/ 2) {
    				updating_s = true;
    				picker_changes.s = /*hsv*/ ctx[1].s;
    				add_flush_callback(() => updating_s = false);
    			}

    			if (!updating_v && dirty & /*hsv*/ 2) {
    				updating_v = true;
    				picker_changes.v = /*hsv*/ ctx[1].v;
    				add_flush_callback(() => updating_v = false);
    			}

    			if (!updating_isOpen && dirty & /*isOpen*/ 8) {
    				updating_isOpen = true;
    				picker_changes.isOpen = /*isOpen*/ ctx[3];
    				add_flush_callback(() => updating_isOpen = false);
    			}

    			picker.$set(picker_changes);
    			const slider_changes = {};
    			if (dirty & /*toRight*/ 256) slider_changes.toRight = /*toRight*/ ctx[8];

    			if (!updating_h && dirty & /*hsv*/ 2) {
    				updating_h = true;
    				slider_changes.h = /*hsv*/ ctx[1].h;
    				add_flush_callback(() => updating_h = false);
    			}

    			slider.$set(slider_changes);

    			if (/*isAlpha*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isAlpha*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$b(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(picker.$$.fragment, local);
    			transition_in(slider.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(picker.$$.fragment, local);
    			transition_out(slider.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(picker, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(slider, detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(117:0) <svelte:component this={getComponents().wrapper} bind:wrapper {isOpen} {isPopup} {toRight}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let arrowkeyhandler;
    	let t0;
    	let t1;
    	let switch_instance;
    	let updating_wrapper;
    	let switch_instance_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	arrowkeyhandler = new ArrowKeyHandler({ $$inline: true });
    	let if_block = /*isInput*/ ctx[6] && create_if_block_1$3(ctx);

    	function switch_instance_wrapper_binding(value) {
    		/*switch_instance_wrapper_binding*/ ctx[22](value);
    	}

    	var switch_value = /*getComponents*/ ctx[11]().wrapper;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			isOpen: /*isOpen*/ ctx[3],
    			isPopup: /*isPopup*/ ctx[7],
    			toRight: /*toRight*/ ctx[8],
    			$$slots: { default: [create_default_slot$6] },
    			$$scope: { ctx }
    		};

    		if (/*wrapper*/ ctx[10] !== void 0) {
    			switch_instance_props.wrapper = /*wrapper*/ ctx[10];
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		binding_callbacks.push(() => bind(switch_instance, "wrapper", switch_instance_wrapper_binding));
    	}

    	const block = {
    		c: function create() {
    			create_component(arrowkeyhandler.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(arrowkeyhandler, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window, "mousedown", /*mousedown*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isInput*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isInput*/ 64) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t1.parentNode, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const switch_instance_changes = {};
    			if (dirty & /*isOpen*/ 8) switch_instance_changes.isOpen = /*isOpen*/ ctx[3];
    			if (dirty & /*isPopup*/ 128) switch_instance_changes.isPopup = /*isPopup*/ ctx[7];
    			if (dirty & /*toRight*/ 256) switch_instance_changes.toRight = /*toRight*/ ctx[8];

    			if (dirty & /*$$scope, hsv, hex, toRight, isOpen, isAlpha*/ 268435758) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_wrapper && dirty & /*wrapper*/ 1024) {
    				updating_wrapper = true;
    				switch_instance_changes.wrapper = /*wrapper*/ ctx[10];
    				add_flush_callback(() => updating_wrapper = false);
    			}

    			if (switch_value !== (switch_value = /*getComponents*/ ctx[11]().wrapper)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					binding_callbacks.push(() => bind(switch_instance, "wrapper", switch_instance_wrapper_binding));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(arrowkeyhandler.$$.fragment, local);
    			transition_in(if_block);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(arrowkeyhandler.$$.fragment, local);
    			transition_out(if_block);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(arrowkeyhandler, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ColorPicker", slots, []);
    	let { components = {} } = $$props;
    	let { label = "Choose a color" } = $$props;
    	let { isAlpha = true } = $$props;
    	let { isInput = true } = $$props;
    	let { isPopup = true } = $$props;
    	let { isOpen = !isInput } = $$props;
    	let { toRight = false } = $$props;
    	let { rgb = { r: 255, g: 0, b: 0 } } = $$props;
    	let { hsv = { h: 0, s: 1, v: 1 } } = $$props;
    	let { hex = "#ff0000" } = $$props;
    	let _rgb = { r: 255, g: 0, b: 0 };
    	let _hsv = { h: 0, s: 1, v: 1 };
    	let _hex = "#ff0000";

    	const default_components = {
    		sliderIndicator: SliderIndicator,
    		pickerIndicator: PickerIndicator,
    		alphaIndicator: SliderIndicator,
    		pickerWrapper: PickerWrapper,
    		sliderWrapper: SliderWrapper,
    		alphaWrapper: SliderWrapper,
    		input: Input,
    		wrapper: Wrapper
    	};

    	function getComponents() {
    		return { ...default_components, ...components };
    	}

    	let button;
    	let wrapper;

    	function mousedown({ target }) {
    		if (isInput) {
    			if (button.isSameNode(target)) {
    				$$invalidate(3, isOpen = !isOpen);
    			} else if (isOpen && !wrapper.contains(target)) {
    				$$invalidate(3, isOpen = false);
    			}
    		}
    	}

    	/**
     * using a function seems to trigger the exported value change only once when all of them has been updated
     * and not just after the hsv change
     */
    	function updateColor() {
    		// reinitialize empty alpha values
    		if (hsv.a === undefined) $$invalidate(1, hsv.a = 1, hsv);

    		if (_hsv.a === undefined) _hsv.a = 1;
    		if (rgb.a === undefined) $$invalidate(0, rgb.a = 1, rgb);
    		if (_rgb.a === undefined) _rgb.a = 1;
    		if (hex?.substring(7) === "ff") $$invalidate(2, hex = hex.substring(0, 7));
    		if (hex?.substring(7) === "ff") $$invalidate(2, hex = hex.substring(0, 7));

    		// check which color format changed and updates the others accordingly
    		if (hsv.h !== _hsv.h || hsv.s !== _hsv.s || hsv.v !== _hsv.v || hsv.a !== hsv.a) {
    			const color = hsv2Color(hsv);
    			const { r, g, b, a, hex: cHex } = color;
    			$$invalidate(0, rgb = { r, g, b, a });
    			$$invalidate(2, hex = cHex);
    		} else if (rgb.r !== _rgb.r || rgb.g !== _rgb.g || rgb.b !== _rgb.b || rgb.a !== _rgb.a) {
    			const color = rgb2Color(rgb);
    			const { h, s, v, a, hex: cHex } = color;
    			$$invalidate(1, hsv = { h, s, v, a });
    			$$invalidate(2, hex = cHex);
    		} else if (hex !== _hex) {
    			const color = hex2Color({ hex });
    			const { r, g, b, h, s, v, a } = color;
    			$$invalidate(0, rgb = { r, g, b, a });
    			$$invalidate(1, hsv = { h, s, v, a });
    		}

    		// update old colors
    		_hsv = Object.assign({}, hsv);

    		_rgb = Object.assign({}, rgb);
    		_hex = hex;
    	}

    	const writable_props = [
    		"components",
    		"label",
    		"isAlpha",
    		"isInput",
    		"isPopup",
    		"isOpen",
    		"toRight",
    		"rgb",
    		"hsv",
    		"hex"
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ColorPicker> was created with unknown prop '${key}'`);
    	});

    	function switch_instance_button_binding(value) {
    		button = value;
    		$$invalidate(9, button);
    	}

    	function switch_instance_isOpen_binding(value) {
    		isOpen = value;
    		$$invalidate(3, isOpen);
    	}

    	function picker_s_binding(value) {
    		if ($$self.$$.not_equal(hsv.s, value)) {
    			hsv.s = value;
    			$$invalidate(1, hsv);
    		}
    	}

    	function picker_v_binding(value) {
    		if ($$self.$$.not_equal(hsv.v, value)) {
    			hsv.v = value;
    			$$invalidate(1, hsv);
    		}
    	}

    	function picker_isOpen_binding(value) {
    		isOpen = value;
    		$$invalidate(3, isOpen);
    	}

    	function slider_h_binding(value) {
    		if ($$self.$$.not_equal(hsv.h, value)) {
    			hsv.h = value;
    			$$invalidate(1, hsv);
    		}
    	}

    	function alpha_a_binding(value) {
    		if ($$self.$$.not_equal(hsv.a, value)) {
    			hsv.a = value;
    			$$invalidate(1, hsv);
    		}
    	}

    	function alpha_isOpen_binding(value) {
    		isOpen = value;
    		$$invalidate(3, isOpen);
    	}

    	function switch_instance_wrapper_binding(value) {
    		wrapper = value;
    		$$invalidate(10, wrapper);
    	}

    	$$self.$$set = $$props => {
    		if ("components" in $$props) $$invalidate(13, components = $$props.components);
    		if ("label" in $$props) $$invalidate(4, label = $$props.label);
    		if ("isAlpha" in $$props) $$invalidate(5, isAlpha = $$props.isAlpha);
    		if ("isInput" in $$props) $$invalidate(6, isInput = $$props.isInput);
    		if ("isPopup" in $$props) $$invalidate(7, isPopup = $$props.isPopup);
    		if ("isOpen" in $$props) $$invalidate(3, isOpen = $$props.isOpen);
    		if ("toRight" in $$props) $$invalidate(8, toRight = $$props.toRight);
    		if ("rgb" in $$props) $$invalidate(0, rgb = $$props.rgb);
    		if ("hsv" in $$props) $$invalidate(1, hsv = $$props.hsv);
    		if ("hex" in $$props) $$invalidate(2, hex = $$props.hex);
    	};

    	$$self.$capture_state = () => ({
    		hsv2Color,
    		hex2Color,
    		rgb2Color,
    		Picker,
    		Slider,
    		Alpha,
    		SliderIndicator,
    		PickerIndicator,
    		ArrowKeyHandler,
    		PickerWrapper,
    		SliderWrapper,
    		Input,
    		Wrapper,
    		components,
    		label,
    		isAlpha,
    		isInput,
    		isPopup,
    		isOpen,
    		toRight,
    		rgb,
    		hsv,
    		hex,
    		_rgb,
    		_hsv,
    		_hex,
    		default_components,
    		getComponents,
    		button,
    		wrapper,
    		mousedown,
    		updateColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("components" in $$props) $$invalidate(13, components = $$props.components);
    		if ("label" in $$props) $$invalidate(4, label = $$props.label);
    		if ("isAlpha" in $$props) $$invalidate(5, isAlpha = $$props.isAlpha);
    		if ("isInput" in $$props) $$invalidate(6, isInput = $$props.isInput);
    		if ("isPopup" in $$props) $$invalidate(7, isPopup = $$props.isPopup);
    		if ("isOpen" in $$props) $$invalidate(3, isOpen = $$props.isOpen);
    		if ("toRight" in $$props) $$invalidate(8, toRight = $$props.toRight);
    		if ("rgb" in $$props) $$invalidate(0, rgb = $$props.rgb);
    		if ("hsv" in $$props) $$invalidate(1, hsv = $$props.hsv);
    		if ("hex" in $$props) $$invalidate(2, hex = $$props.hex);
    		if ("_rgb" in $$props) _rgb = $$props._rgb;
    		if ("_hsv" in $$props) _hsv = $$props._hsv;
    		if ("_hex" in $$props) _hex = $$props._hex;
    		if ("button" in $$props) $$invalidate(9, button = $$props.button);
    		if ("wrapper" in $$props) $$invalidate(10, wrapper = $$props.wrapper);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*hsv, rgb, hex*/ 7) {
    			if (hsv || rgb || hex) {
    				updateColor();
    			}
    		}
    	};

    	return [
    		rgb,
    		hsv,
    		hex,
    		isOpen,
    		label,
    		isAlpha,
    		isInput,
    		isPopup,
    		toRight,
    		button,
    		wrapper,
    		getComponents,
    		mousedown,
    		components,
    		switch_instance_button_binding,
    		switch_instance_isOpen_binding,
    		picker_s_binding,
    		picker_v_binding,
    		picker_isOpen_binding,
    		slider_h_binding,
    		alpha_a_binding,
    		alpha_isOpen_binding,
    		switch_instance_wrapper_binding
    	];
    }

    class ColorPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$e, create_fragment$g, safe_not_equal, {
    			components: 13,
    			label: 4,
    			isAlpha: 5,
    			isInput: 6,
    			isPopup: 7,
    			isOpen: 3,
    			toRight: 8,
    			rgb: 0,
    			hsv: 1,
    			hex: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ColorPicker",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get components() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set components(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isAlpha() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isAlpha(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isInput() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isInput(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isPopup() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isPopup(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toRight() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toRight(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rgb() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rgb(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hsv() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hsv(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hex() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hex(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var tinycolor = createCommonjsModule(function (module) {
    // TinyColor v1.4.2
    // https://github.com/bgrins/TinyColor
    // Brian Grinstead, MIT License

    (function(Math) {

    var trimLeft = /^\s+/,
        trimRight = /\s+$/,
        tinyCounter = 0,
        mathRound = Math.round,
        mathMin = Math.min,
        mathMax = Math.max,
        mathRandom = Math.random;

    function tinycolor (color, opts) {

        color = (color) ? color : '';
        opts = opts || { };

        // If input is already a tinycolor, return itself
        if (color instanceof tinycolor) {
           return color;
        }
        // If we are called as a function, call using new instead
        if (!(this instanceof tinycolor)) {
            return new tinycolor(color, opts);
        }

        var rgb = inputToRGB(color);
        this._originalInput = color,
        this._r = rgb.r,
        this._g = rgb.g,
        this._b = rgb.b,
        this._a = rgb.a,
        this._roundA = mathRound(100*this._a) / 100,
        this._format = opts.format || rgb.format;
        this._gradientType = opts.gradientType;

        // Don't let the range of [0,255] come back in [0,1].
        // Potentially lose a little bit of precision here, but will fix issues where
        // .5 gets interpreted as half of the total, instead of half of 1
        // If it was supposed to be 128, this was already taken care of by `inputToRgb`
        if (this._r < 1) { this._r = mathRound(this._r); }
        if (this._g < 1) { this._g = mathRound(this._g); }
        if (this._b < 1) { this._b = mathRound(this._b); }

        this._ok = rgb.ok;
        this._tc_id = tinyCounter++;
    }

    tinycolor.prototype = {
        isDark: function() {
            return this.getBrightness() < 128;
        },
        isLight: function() {
            return !this.isDark();
        },
        isValid: function() {
            return this._ok;
        },
        getOriginalInput: function() {
          return this._originalInput;
        },
        getFormat: function() {
            return this._format;
        },
        getAlpha: function() {
            return this._a;
        },
        getBrightness: function() {
            //http://www.w3.org/TR/AERT#color-contrast
            var rgb = this.toRgb();
            return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        },
        getLuminance: function() {
            //http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
            var rgb = this.toRgb();
            var RsRGB, GsRGB, BsRGB, R, G, B;
            RsRGB = rgb.r/255;
            GsRGB = rgb.g/255;
            BsRGB = rgb.b/255;

            if (RsRGB <= 0.03928) {R = RsRGB / 12.92;} else {R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4);}
            if (GsRGB <= 0.03928) {G = GsRGB / 12.92;} else {G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4);}
            if (BsRGB <= 0.03928) {B = BsRGB / 12.92;} else {B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4);}
            return (0.2126 * R) + (0.7152 * G) + (0.0722 * B);
        },
        setAlpha: function(value) {
            this._a = boundAlpha(value);
            this._roundA = mathRound(100*this._a) / 100;
            return this;
        },
        toHsv: function() {
            var hsv = rgbToHsv(this._r, this._g, this._b);
            return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
        },
        toHsvString: function() {
            var hsv = rgbToHsv(this._r, this._g, this._b);
            var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
            return (this._a == 1) ?
              "hsv("  + h + ", " + s + "%, " + v + "%)" :
              "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
        },
        toHsl: function() {
            var hsl = rgbToHsl(this._r, this._g, this._b);
            return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
        },
        toHslString: function() {
            var hsl = rgbToHsl(this._r, this._g, this._b);
            var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
            return (this._a == 1) ?
              "hsl("  + h + ", " + s + "%, " + l + "%)" :
              "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
        },
        toHex: function(allow3Char) {
            return rgbToHex(this._r, this._g, this._b, allow3Char);
        },
        toHexString: function(allow3Char) {
            return '#' + this.toHex(allow3Char);
        },
        toHex8: function(allow4Char) {
            return rgbaToHex(this._r, this._g, this._b, this._a, allow4Char);
        },
        toHex8String: function(allow4Char) {
            return '#' + this.toHex8(allow4Char);
        },
        toRgb: function() {
            return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
        },
        toRgbString: function() {
            return (this._a == 1) ?
              "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
              "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
        },
        toPercentageRgb: function() {
            return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
        },
        toPercentageRgbString: function() {
            return (this._a == 1) ?
              "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
              "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
        },
        toName: function() {
            if (this._a === 0) {
                return "transparent";
            }

            if (this._a < 1) {
                return false;
            }

            return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
        },
        toFilter: function(secondColor) {
            var hex8String = '#' + rgbaToArgbHex(this._r, this._g, this._b, this._a);
            var secondHex8String = hex8String;
            var gradientType = this._gradientType ? "GradientType = 1, " : "";

            if (secondColor) {
                var s = tinycolor(secondColor);
                secondHex8String = '#' + rgbaToArgbHex(s._r, s._g, s._b, s._a);
            }

            return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
        },
        toString: function(format) {
            var formatSet = !!format;
            format = format || this._format;

            var formattedString = false;
            var hasAlpha = this._a < 1 && this._a >= 0;
            var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "hex4" || format === "hex8" || format === "name");

            if (needsAlphaFormat) {
                // Special case for "transparent", all other non-alpha formats
                // will return rgba when there is transparency.
                if (format === "name" && this._a === 0) {
                    return this.toName();
                }
                return this.toRgbString();
            }
            if (format === "rgb") {
                formattedString = this.toRgbString();
            }
            if (format === "prgb") {
                formattedString = this.toPercentageRgbString();
            }
            if (format === "hex" || format === "hex6") {
                formattedString = this.toHexString();
            }
            if (format === "hex3") {
                formattedString = this.toHexString(true);
            }
            if (format === "hex4") {
                formattedString = this.toHex8String(true);
            }
            if (format === "hex8") {
                formattedString = this.toHex8String();
            }
            if (format === "name") {
                formattedString = this.toName();
            }
            if (format === "hsl") {
                formattedString = this.toHslString();
            }
            if (format === "hsv") {
                formattedString = this.toHsvString();
            }

            return formattedString || this.toHexString();
        },
        clone: function() {
            return tinycolor(this.toString());
        },

        _applyModification: function(fn, args) {
            var color = fn.apply(null, [this].concat([].slice.call(args)));
            this._r = color._r;
            this._g = color._g;
            this._b = color._b;
            this.setAlpha(color._a);
            return this;
        },
        lighten: function() {
            return this._applyModification(lighten, arguments);
        },
        brighten: function() {
            return this._applyModification(brighten, arguments);
        },
        darken: function() {
            return this._applyModification(darken, arguments);
        },
        desaturate: function() {
            return this._applyModification(desaturate, arguments);
        },
        saturate: function() {
            return this._applyModification(saturate, arguments);
        },
        greyscale: function() {
            return this._applyModification(greyscale, arguments);
        },
        spin: function() {
            return this._applyModification(spin, arguments);
        },

        _applyCombination: function(fn, args) {
            return fn.apply(null, [this].concat([].slice.call(args)));
        },
        analogous: function() {
            return this._applyCombination(analogous, arguments);
        },
        complement: function() {
            return this._applyCombination(complement, arguments);
        },
        monochromatic: function() {
            return this._applyCombination(monochromatic, arguments);
        },
        splitcomplement: function() {
            return this._applyCombination(splitcomplement, arguments);
        },
        triad: function() {
            return this._applyCombination(triad, arguments);
        },
        tetrad: function() {
            return this._applyCombination(tetrad, arguments);
        }
    };

    // If input is an object, force 1 into "1.0" to handle ratios properly
    // String input requires "1.0" as input, so 1 will be treated as 1
    tinycolor.fromRatio = function(color, opts) {
        if (typeof color == "object") {
            var newColor = {};
            for (var i in color) {
                if (color.hasOwnProperty(i)) {
                    if (i === "a") {
                        newColor[i] = color[i];
                    }
                    else {
                        newColor[i] = convertToPercentage(color[i]);
                    }
                }
            }
            color = newColor;
        }

        return tinycolor(color, opts);
    };

    // Given a string or object, convert that input to RGB
    // Possible string inputs:
    //
    //     "red"
    //     "#f00" or "f00"
    //     "#ff0000" or "ff0000"
    //     "#ff000000" or "ff000000"
    //     "rgb 255 0 0" or "rgb (255, 0, 0)"
    //     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
    //     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
    //     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
    //     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
    //     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
    //     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
    //
    function inputToRGB(color) {

        var rgb = { r: 0, g: 0, b: 0 };
        var a = 1;
        var s = null;
        var v = null;
        var l = null;
        var ok = false;
        var format = false;

        if (typeof color == "string") {
            color = stringInputToObject(color);
        }

        if (typeof color == "object") {
            if (isValidCSSUnit(color.r) && isValidCSSUnit(color.g) && isValidCSSUnit(color.b)) {
                rgb = rgbToRgb(color.r, color.g, color.b);
                ok = true;
                format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
            }
            else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.v)) {
                s = convertToPercentage(color.s);
                v = convertToPercentage(color.v);
                rgb = hsvToRgb(color.h, s, v);
                ok = true;
                format = "hsv";
            }
            else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.l)) {
                s = convertToPercentage(color.s);
                l = convertToPercentage(color.l);
                rgb = hslToRgb(color.h, s, l);
                ok = true;
                format = "hsl";
            }

            if (color.hasOwnProperty("a")) {
                a = color.a;
            }
        }

        a = boundAlpha(a);

        return {
            ok: ok,
            format: color.format || format,
            r: mathMin(255, mathMax(rgb.r, 0)),
            g: mathMin(255, mathMax(rgb.g, 0)),
            b: mathMin(255, mathMax(rgb.b, 0)),
            a: a
        };
    }


    // Conversion Functions
    // --------------------

    // `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
    // <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

    // `rgbToRgb`
    // Handle bounds / percentage checking to conform to CSS color spec
    // <http://www.w3.org/TR/css3-color/>
    // *Assumes:* r, g, b in [0, 255] or [0, 1]
    // *Returns:* { r, g, b } in [0, 255]
    function rgbToRgb(r, g, b){
        return {
            r: bound01(r, 255) * 255,
            g: bound01(g, 255) * 255,
            b: bound01(b, 255) * 255
        };
    }

    // `rgbToHsl`
    // Converts an RGB color value to HSL.
    // *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
    // *Returns:* { h, s, l } in [0,1]
    function rgbToHsl(r, g, b) {

        r = bound01(r, 255);
        g = bound01(g, 255);
        b = bound01(b, 255);

        var max = mathMax(r, g, b), min = mathMin(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min) {
            h = s = 0; // achromatic
        }
        else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return { h: h, s: s, l: l };
    }

    // `hslToRgb`
    // Converts an HSL color value to RGB.
    // *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
    // *Returns:* { r, g, b } in the set [0, 255]
    function hslToRgb(h, s, l) {
        var r, g, b;

        h = bound01(h, 360);
        s = bound01(s, 100);
        l = bound01(l, 100);

        function hue2rgb(p, q, t) {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        if(s === 0) {
            r = g = b = l; // achromatic
        }
        else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return { r: r * 255, g: g * 255, b: b * 255 };
    }

    // `rgbToHsv`
    // Converts an RGB color value to HSV
    // *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
    // *Returns:* { h, s, v } in [0,1]
    function rgbToHsv(r, g, b) {

        r = bound01(r, 255);
        g = bound01(g, 255);
        b = bound01(b, 255);

        var max = mathMax(r, g, b), min = mathMin(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max === 0 ? 0 : d / max;

        if(max == min) {
            h = 0; // achromatic
        }
        else {
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h, s: s, v: v };
    }

    // `hsvToRgb`
    // Converts an HSV color value to RGB.
    // *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
    // *Returns:* { r, g, b } in the set [0, 255]
     function hsvToRgb(h, s, v) {

        h = bound01(h, 360) * 6;
        s = bound01(s, 100);
        v = bound01(v, 100);

        var i = Math.floor(h),
            f = h - i,
            p = v * (1 - s),
            q = v * (1 - f * s),
            t = v * (1 - (1 - f) * s),
            mod = i % 6,
            r = [v, q, p, p, t, v][mod],
            g = [t, v, v, q, p, p][mod],
            b = [p, p, t, v, v, q][mod];

        return { r: r * 255, g: g * 255, b: b * 255 };
    }

    // `rgbToHex`
    // Converts an RGB color to hex
    // Assumes r, g, and b are contained in the set [0, 255]
    // Returns a 3 or 6 character hex
    function rgbToHex(r, g, b, allow3Char) {

        var hex = [
            pad2(mathRound(r).toString(16)),
            pad2(mathRound(g).toString(16)),
            pad2(mathRound(b).toString(16))
        ];

        // Return a 3 character hex if possible
        if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
            return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
        }

        return hex.join("");
    }

    // `rgbaToHex`
    // Converts an RGBA color plus alpha transparency to hex
    // Assumes r, g, b are contained in the set [0, 255] and
    // a in [0, 1]. Returns a 4 or 8 character rgba hex
    function rgbaToHex(r, g, b, a, allow4Char) {

        var hex = [
            pad2(mathRound(r).toString(16)),
            pad2(mathRound(g).toString(16)),
            pad2(mathRound(b).toString(16)),
            pad2(convertDecimalToHex(a))
        ];

        // Return a 4 character hex if possible
        if (allow4Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1) && hex[3].charAt(0) == hex[3].charAt(1)) {
            return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0) + hex[3].charAt(0);
        }

        return hex.join("");
    }

    // `rgbaToArgbHex`
    // Converts an RGBA color to an ARGB Hex8 string
    // Rarely used, but required for "toFilter()"
    function rgbaToArgbHex(r, g, b, a) {

        var hex = [
            pad2(convertDecimalToHex(a)),
            pad2(mathRound(r).toString(16)),
            pad2(mathRound(g).toString(16)),
            pad2(mathRound(b).toString(16))
        ];

        return hex.join("");
    }

    // `equals`
    // Can be called with any tinycolor input
    tinycolor.equals = function (color1, color2) {
        if (!color1 || !color2) { return false; }
        return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
    };

    tinycolor.random = function() {
        return tinycolor.fromRatio({
            r: mathRandom(),
            g: mathRandom(),
            b: mathRandom()
        });
    };


    // Modification Functions
    // ----------------------
    // Thanks to less.js for some of the basics here
    // <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

    function desaturate(color, amount) {
        amount = (amount === 0) ? 0 : (amount || 10);
        var hsl = tinycolor(color).toHsl();
        hsl.s -= amount / 100;
        hsl.s = clamp01(hsl.s);
        return tinycolor(hsl);
    }

    function saturate(color, amount) {
        amount = (amount === 0) ? 0 : (amount || 10);
        var hsl = tinycolor(color).toHsl();
        hsl.s += amount / 100;
        hsl.s = clamp01(hsl.s);
        return tinycolor(hsl);
    }

    function greyscale(color) {
        return tinycolor(color).desaturate(100);
    }

    function lighten (color, amount) {
        amount = (amount === 0) ? 0 : (amount || 10);
        var hsl = tinycolor(color).toHsl();
        hsl.l += amount / 100;
        hsl.l = clamp01(hsl.l);
        return tinycolor(hsl);
    }

    function brighten(color, amount) {
        amount = (amount === 0) ? 0 : (amount || 10);
        var rgb = tinycolor(color).toRgb();
        rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
        rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
        rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
        return tinycolor(rgb);
    }

    function darken (color, amount) {
        amount = (amount === 0) ? 0 : (amount || 10);
        var hsl = tinycolor(color).toHsl();
        hsl.l -= amount / 100;
        hsl.l = clamp01(hsl.l);
        return tinycolor(hsl);
    }

    // Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
    // Values outside of this range will be wrapped into this range.
    function spin(color, amount) {
        var hsl = tinycolor(color).toHsl();
        var hue = (hsl.h + amount) % 360;
        hsl.h = hue < 0 ? 360 + hue : hue;
        return tinycolor(hsl);
    }

    // Combination Functions
    // ---------------------
    // Thanks to jQuery xColor for some of the ideas behind these
    // <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

    function complement(color) {
        var hsl = tinycolor(color).toHsl();
        hsl.h = (hsl.h + 180) % 360;
        return tinycolor(hsl);
    }

    function triad(color) {
        var hsl = tinycolor(color).toHsl();
        var h = hsl.h;
        return [
            tinycolor(color),
            tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
            tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
        ];
    }

    function tetrad(color) {
        var hsl = tinycolor(color).toHsl();
        var h = hsl.h;
        return [
            tinycolor(color),
            tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
            tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
            tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
        ];
    }

    function splitcomplement(color) {
        var hsl = tinycolor(color).toHsl();
        var h = hsl.h;
        return [
            tinycolor(color),
            tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
            tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
        ];
    }

    function analogous(color, results, slices) {
        results = results || 6;
        slices = slices || 30;

        var hsl = tinycolor(color).toHsl();
        var part = 360 / slices;
        var ret = [tinycolor(color)];

        for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
            hsl.h = (hsl.h + part) % 360;
            ret.push(tinycolor(hsl));
        }
        return ret;
    }

    function monochromatic(color, results) {
        results = results || 6;
        var hsv = tinycolor(color).toHsv();
        var h = hsv.h, s = hsv.s, v = hsv.v;
        var ret = [];
        var modification = 1 / results;

        while (results--) {
            ret.push(tinycolor({ h: h, s: s, v: v}));
            v = (v + modification) % 1;
        }

        return ret;
    }

    // Utility Functions
    // ---------------------

    tinycolor.mix = function(color1, color2, amount) {
        amount = (amount === 0) ? 0 : (amount || 50);

        var rgb1 = tinycolor(color1).toRgb();
        var rgb2 = tinycolor(color2).toRgb();

        var p = amount / 100;

        var rgba = {
            r: ((rgb2.r - rgb1.r) * p) + rgb1.r,
            g: ((rgb2.g - rgb1.g) * p) + rgb1.g,
            b: ((rgb2.b - rgb1.b) * p) + rgb1.b,
            a: ((rgb2.a - rgb1.a) * p) + rgb1.a
        };

        return tinycolor(rgba);
    };


    // Readability Functions
    // ---------------------
    // <http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef (WCAG Version 2)

    // `contrast`
    // Analyze the 2 colors and returns the color contrast defined by (WCAG Version 2)
    tinycolor.readability = function(color1, color2) {
        var c1 = tinycolor(color1);
        var c2 = tinycolor(color2);
        return (Math.max(c1.getLuminance(),c2.getLuminance())+0.05) / (Math.min(c1.getLuminance(),c2.getLuminance())+0.05);
    };

    // `isReadable`
    // Ensure that foreground and background color combinations meet WCAG2 guidelines.
    // The third argument is an optional Object.
    //      the 'level' property states 'AA' or 'AAA' - if missing or invalid, it defaults to 'AA';
    //      the 'size' property states 'large' or 'small' - if missing or invalid, it defaults to 'small'.
    // If the entire object is absent, isReadable defaults to {level:"AA",size:"small"}.

    // *Example*
    //    tinycolor.isReadable("#000", "#111") => false
    //    tinycolor.isReadable("#000", "#111",{level:"AA",size:"large"}) => false
    tinycolor.isReadable = function(color1, color2, wcag2) {
        var readability = tinycolor.readability(color1, color2);
        var wcag2Parms, out;

        out = false;

        wcag2Parms = validateWCAG2Parms(wcag2);
        switch (wcag2Parms.level + wcag2Parms.size) {
            case "AAsmall":
            case "AAAlarge":
                out = readability >= 4.5;
                break;
            case "AAlarge":
                out = readability >= 3;
                break;
            case "AAAsmall":
                out = readability >= 7;
                break;
        }
        return out;

    };

    // `mostReadable`
    // Given a base color and a list of possible foreground or background
    // colors for that base, returns the most readable color.
    // Optionally returns Black or White if the most readable color is unreadable.
    // *Example*
    //    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:false}).toHexString(); // "#112255"
    //    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:true}).toHexString();  // "#ffffff"
    //    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"large"}).toHexString(); // "#faf3f3"
    //    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"small"}).toHexString(); // "#ffffff"
    tinycolor.mostReadable = function(baseColor, colorList, args) {
        var bestColor = null;
        var bestScore = 0;
        var readability;
        var includeFallbackColors, level, size ;
        args = args || {};
        includeFallbackColors = args.includeFallbackColors ;
        level = args.level;
        size = args.size;

        for (var i= 0; i < colorList.length ; i++) {
            readability = tinycolor.readability(baseColor, colorList[i]);
            if (readability > bestScore) {
                bestScore = readability;
                bestColor = tinycolor(colorList[i]);
            }
        }

        if (tinycolor.isReadable(baseColor, bestColor, {"level":level,"size":size}) || !includeFallbackColors) {
            return bestColor;
        }
        else {
            args.includeFallbackColors=false;
            return tinycolor.mostReadable(baseColor,["#fff", "#000"],args);
        }
    };


    // Big List of Colors
    // ------------------
    // <http://www.w3.org/TR/css3-color/#svg-color>
    var names = tinycolor.names = {
        aliceblue: "f0f8ff",
        antiquewhite: "faebd7",
        aqua: "0ff",
        aquamarine: "7fffd4",
        azure: "f0ffff",
        beige: "f5f5dc",
        bisque: "ffe4c4",
        black: "000",
        blanchedalmond: "ffebcd",
        blue: "00f",
        blueviolet: "8a2be2",
        brown: "a52a2a",
        burlywood: "deb887",
        burntsienna: "ea7e5d",
        cadetblue: "5f9ea0",
        chartreuse: "7fff00",
        chocolate: "d2691e",
        coral: "ff7f50",
        cornflowerblue: "6495ed",
        cornsilk: "fff8dc",
        crimson: "dc143c",
        cyan: "0ff",
        darkblue: "00008b",
        darkcyan: "008b8b",
        darkgoldenrod: "b8860b",
        darkgray: "a9a9a9",
        darkgreen: "006400",
        darkgrey: "a9a9a9",
        darkkhaki: "bdb76b",
        darkmagenta: "8b008b",
        darkolivegreen: "556b2f",
        darkorange: "ff8c00",
        darkorchid: "9932cc",
        darkred: "8b0000",
        darksalmon: "e9967a",
        darkseagreen: "8fbc8f",
        darkslateblue: "483d8b",
        darkslategray: "2f4f4f",
        darkslategrey: "2f4f4f",
        darkturquoise: "00ced1",
        darkviolet: "9400d3",
        deeppink: "ff1493",
        deepskyblue: "00bfff",
        dimgray: "696969",
        dimgrey: "696969",
        dodgerblue: "1e90ff",
        firebrick: "b22222",
        floralwhite: "fffaf0",
        forestgreen: "228b22",
        fuchsia: "f0f",
        gainsboro: "dcdcdc",
        ghostwhite: "f8f8ff",
        gold: "ffd700",
        goldenrod: "daa520",
        gray: "808080",
        green: "008000",
        greenyellow: "adff2f",
        grey: "808080",
        honeydew: "f0fff0",
        hotpink: "ff69b4",
        indianred: "cd5c5c",
        indigo: "4b0082",
        ivory: "fffff0",
        khaki: "f0e68c",
        lavender: "e6e6fa",
        lavenderblush: "fff0f5",
        lawngreen: "7cfc00",
        lemonchiffon: "fffacd",
        lightblue: "add8e6",
        lightcoral: "f08080",
        lightcyan: "e0ffff",
        lightgoldenrodyellow: "fafad2",
        lightgray: "d3d3d3",
        lightgreen: "90ee90",
        lightgrey: "d3d3d3",
        lightpink: "ffb6c1",
        lightsalmon: "ffa07a",
        lightseagreen: "20b2aa",
        lightskyblue: "87cefa",
        lightslategray: "789",
        lightslategrey: "789",
        lightsteelblue: "b0c4de",
        lightyellow: "ffffe0",
        lime: "0f0",
        limegreen: "32cd32",
        linen: "faf0e6",
        magenta: "f0f",
        maroon: "800000",
        mediumaquamarine: "66cdaa",
        mediumblue: "0000cd",
        mediumorchid: "ba55d3",
        mediumpurple: "9370db",
        mediumseagreen: "3cb371",
        mediumslateblue: "7b68ee",
        mediumspringgreen: "00fa9a",
        mediumturquoise: "48d1cc",
        mediumvioletred: "c71585",
        midnightblue: "191970",
        mintcream: "f5fffa",
        mistyrose: "ffe4e1",
        moccasin: "ffe4b5",
        navajowhite: "ffdead",
        navy: "000080",
        oldlace: "fdf5e6",
        olive: "808000",
        olivedrab: "6b8e23",
        orange: "ffa500",
        orangered: "ff4500",
        orchid: "da70d6",
        palegoldenrod: "eee8aa",
        palegreen: "98fb98",
        paleturquoise: "afeeee",
        palevioletred: "db7093",
        papayawhip: "ffefd5",
        peachpuff: "ffdab9",
        peru: "cd853f",
        pink: "ffc0cb",
        plum: "dda0dd",
        powderblue: "b0e0e6",
        purple: "800080",
        rebeccapurple: "663399",
        red: "f00",
        rosybrown: "bc8f8f",
        royalblue: "4169e1",
        saddlebrown: "8b4513",
        salmon: "fa8072",
        sandybrown: "f4a460",
        seagreen: "2e8b57",
        seashell: "fff5ee",
        sienna: "a0522d",
        silver: "c0c0c0",
        skyblue: "87ceeb",
        slateblue: "6a5acd",
        slategray: "708090",
        slategrey: "708090",
        snow: "fffafa",
        springgreen: "00ff7f",
        steelblue: "4682b4",
        tan: "d2b48c",
        teal: "008080",
        thistle: "d8bfd8",
        tomato: "ff6347",
        turquoise: "40e0d0",
        violet: "ee82ee",
        wheat: "f5deb3",
        white: "fff",
        whitesmoke: "f5f5f5",
        yellow: "ff0",
        yellowgreen: "9acd32"
    };

    // Make it easy to access colors via `hexNames[hex]`
    var hexNames = tinycolor.hexNames = flip(names);


    // Utilities
    // ---------

    // `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
    function flip(o) {
        var flipped = { };
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                flipped[o[i]] = i;
            }
        }
        return flipped;
    }

    // Return a valid alpha value [0,1] with all invalid values being set to 1
    function boundAlpha(a) {
        a = parseFloat(a);

        if (isNaN(a) || a < 0 || a > 1) {
            a = 1;
        }

        return a;
    }

    // Take input from [0, n] and return it as [0, 1]
    function bound01(n, max) {
        if (isOnePointZero(n)) { n = "100%"; }

        var processPercent = isPercentage(n);
        n = mathMin(max, mathMax(0, parseFloat(n)));

        // Automatically convert percentage into number
        if (processPercent) {
            n = parseInt(n * max, 10) / 100;
        }

        // Handle floating point rounding errors
        if ((Math.abs(n - max) < 0.000001)) {
            return 1;
        }

        // Convert into [0, 1] range if it isn't already
        return (n % max) / parseFloat(max);
    }

    // Force a number between 0 and 1
    function clamp01(val) {
        return mathMin(1, mathMax(0, val));
    }

    // Parse a base-16 hex value into a base-10 integer
    function parseIntFromHex(val) {
        return parseInt(val, 16);
    }

    // Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
    // <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
    function isOnePointZero(n) {
        return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
    }

    // Check to see if string passed in is a percentage
    function isPercentage(n) {
        return typeof n === "string" && n.indexOf('%') != -1;
    }

    // Force a hex value to have 2 characters
    function pad2(c) {
        return c.length == 1 ? '0' + c : '' + c;
    }

    // Replace a decimal with it's percentage value
    function convertToPercentage(n) {
        if (n <= 1) {
            n = (n * 100) + "%";
        }

        return n;
    }

    // Converts a decimal to a hex value
    function convertDecimalToHex(d) {
        return Math.round(parseFloat(d) * 255).toString(16);
    }
    // Converts a hex value to a decimal
    function convertHexToDecimal(h) {
        return (parseIntFromHex(h) / 255);
    }

    var matchers = (function() {

        // <http://www.w3.org/TR/css3-values/#integers>
        var CSS_INTEGER = "[-\\+]?\\d+%?";

        // <http://www.w3.org/TR/css3-values/#number-value>
        var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

        // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
        var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

        // Actual matching.
        // Parentheses and commas are optional, but not required.
        // Whitespace can take the place of commas or opening paren
        var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
        var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

        return {
            CSS_UNIT: new RegExp(CSS_UNIT),
            rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
            rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
            hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
            hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
            hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
            hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
            hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
            hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
            hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
            hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
        };
    })();

    // `isValidCSSUnit`
    // Take in a single string / number and check to see if it looks like a CSS unit
    // (see `matchers` above for definition).
    function isValidCSSUnit(color) {
        return !!matchers.CSS_UNIT.exec(color);
    }

    // `stringInputToObject`
    // Permissive string parsing.  Take in a number of formats, and output an object
    // based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
    function stringInputToObject(color) {

        color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
        var named = false;
        if (names[color]) {
            color = names[color];
            named = true;
        }
        else if (color == 'transparent') {
            return { r: 0, g: 0, b: 0, a: 0, format: "name" };
        }

        // Try to match string input using regular expressions.
        // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
        // Just return an object and let the conversion functions handle that.
        // This way the result will be the same whether the tinycolor is initialized with string or object.
        var match;
        if ((match = matchers.rgb.exec(color))) {
            return { r: match[1], g: match[2], b: match[3] };
        }
        if ((match = matchers.rgba.exec(color))) {
            return { r: match[1], g: match[2], b: match[3], a: match[4] };
        }
        if ((match = matchers.hsl.exec(color))) {
            return { h: match[1], s: match[2], l: match[3] };
        }
        if ((match = matchers.hsla.exec(color))) {
            return { h: match[1], s: match[2], l: match[3], a: match[4] };
        }
        if ((match = matchers.hsv.exec(color))) {
            return { h: match[1], s: match[2], v: match[3] };
        }
        if ((match = matchers.hsva.exec(color))) {
            return { h: match[1], s: match[2], v: match[3], a: match[4] };
        }
        if ((match = matchers.hex8.exec(color))) {
            return {
                r: parseIntFromHex(match[1]),
                g: parseIntFromHex(match[2]),
                b: parseIntFromHex(match[3]),
                a: convertHexToDecimal(match[4]),
                format: named ? "name" : "hex8"
            };
        }
        if ((match = matchers.hex6.exec(color))) {
            return {
                r: parseIntFromHex(match[1]),
                g: parseIntFromHex(match[2]),
                b: parseIntFromHex(match[3]),
                format: named ? "name" : "hex"
            };
        }
        if ((match = matchers.hex4.exec(color))) {
            return {
                r: parseIntFromHex(match[1] + '' + match[1]),
                g: parseIntFromHex(match[2] + '' + match[2]),
                b: parseIntFromHex(match[3] + '' + match[3]),
                a: convertHexToDecimal(match[4] + '' + match[4]),
                format: named ? "name" : "hex8"
            };
        }
        if ((match = matchers.hex3.exec(color))) {
            return {
                r: parseIntFromHex(match[1] + '' + match[1]),
                g: parseIntFromHex(match[2] + '' + match[2]),
                b: parseIntFromHex(match[3] + '' + match[3]),
                format: named ? "name" : "hex"
            };
        }

        return false;
    }

    function validateWCAG2Parms(parms) {
        // return valid WCAG2 parms for isReadable.
        // If input parms are invalid, return {"level":"AA", "size":"small"}
        var level, size;
        parms = parms || {"level":"AA", "size":"small"};
        level = (parms.level || "AA").toUpperCase();
        size = (parms.size || "small").toLowerCase();
        if (level !== "AA" && level !== "AAA") {
            level = "AA";
        }
        if (size !== "small" && size !== "large") {
            size = "small";
        }
        return {"level":level, "size":size};
    }

    // Node: Export function
    if (module.exports) {
        module.exports = tinycolor;
    }
    // AMD/requirejs: Define the module
    else {
        window.tinycolor = tinycolor;
    }

    })(Math);
    });

    /* src\components\Colorpicker.svelte generated by Svelte v3.38.3 */

    const { console: console_1$4 } = globals;
    const file$e = "src\\components\\Colorpicker.svelte";

    // (35:4) {#if alpha}
    function create_if_block_1$2(ctx) {
    	let label;
    	let span;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			span = element("span");
    			span.textContent = "A:";
    			t1 = space();
    			input = element("input");
    			add_location(span, file$e, 36, 6, 974);
    			attr_dev(input, "placeholder", "A");
    			attr_dev(input, "type", "text");
    			add_location(input, file$e, 37, 6, 997);
    			add_location(label, file$e, 35, 5, 959);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span);
    			append_dev(label, t1);
    			append_dev(label, input);
    			set_input_value(input, /*rgb*/ ctx[1].a);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rgb*/ 2 && input.value !== /*rgb*/ ctx[1].a) {
    				set_input_value(input, /*rgb*/ ctx[1].a);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(35:4) {#if alpha}",
    		ctx
    	});

    	return block;
    }

    // (46:5) <Control        tips={tips}        legacy={legacy}        size="12px"        tiptext="Copy"        on:click={e => {                  navigator.clipboard.writeText(hex).then(() => {             console.log("Copied to clipboard");         }, () => {             console.log("Failed to copy");         });        }}       >
    function create_default_slot_1$5(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "far fa-clipboard");
    			set_style(i, "transform", "translateY(-1px)");
    			add_location(i, file$e, 58, 6, 1559);
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
    		id: create_default_slot_1$5.name,
    		type: "slot",
    		source: "(46:5) <Control        tips={tips}        legacy={legacy}        size=\\\"12px\\\"        tiptext=\\\"Copy\\\"        on:click={e => {                  navigator.clipboard.writeText(hex).then(() => {             console.log(\\\"Copied to clipboard\\\");         }, () => {             console.log(\\\"Failed to copy\\\");         });        }}       >",
    		ctx
    	});

    	return block;
    }

    // (61:5) {#if reset}
    function create_if_block$a(ctx) {
    	let control;
    	let current;

    	control = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: "Reset",
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control.$on("click", /*click_handler_1*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(control.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const control_changes = {};
    			if (dirty & /*tips*/ 8) control_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 32768) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(61:5) {#if reset}",
    		ctx
    	});

    	return block;
    }

    // (62:6) <Control         tips={tips}         legacy={legacy}         size="12px"         tiptext="Reset"         on:click={e => {          hex = reset;          console.log("clicked!", hex, reset);         }}        >
    function create_default_slot$5(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-redo");
    			add_location(i, file$e, 71, 7, 1889);
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
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(62:6) <Control         tips={tips}         legacy={legacy}         size=\\\"12px\\\"         tiptext=\\\"Reset\\\"         on:click={e => {          hex = reset;          console.log(\\\"clicked!\\\", hex, reset);         }}        >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let div4;
    	let colorpicker;
    	let updating_rgb;
    	let updating_hex;
    	let t0;
    	let div3;
    	let div2;
    	let div0;
    	let label0;
    	let span0;
    	let t2;
    	let input0;
    	let t3;
    	let label1;
    	let span1;
    	let t5;
    	let input1;
    	let t6;
    	let label2;
    	let span2;
    	let t8;
    	let input2;
    	let t9;
    	let t10;
    	let div1;
    	let label3;
    	let span3;
    	let t12;
    	let input3;
    	let t13;
    	let control;
    	let t14;
    	let current;
    	let mounted;
    	let dispose;

    	function colorpicker_rgb_binding(value) {
    		/*colorpicker_rgb_binding*/ ctx[6](value);
    	}

    	function colorpicker_hex_binding(value) {
    		/*colorpicker_hex_binding*/ ctx[7](value);
    	}

    	let colorpicker_props = {
    		isOpen: true,
    		isInput: false,
    		isAlpha: /*alpha*/ ctx[5]
    	};

    	if (/*rgb*/ ctx[1] !== void 0) {
    		colorpicker_props.rgb = /*rgb*/ ctx[1];
    	}

    	if (/*hex*/ ctx[0] !== void 0) {
    		colorpicker_props.hex = /*hex*/ ctx[0];
    	}

    	colorpicker = new ColorPicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "rgb", colorpicker_rgb_binding));
    	binding_callbacks.push(() => bind(colorpicker, "hex", colorpicker_hex_binding));
    	let if_block0 = /*alpha*/ ctx[5] && create_if_block_1$2(ctx);

    	control = new Control({
    			props: {
    				tips: /*tips*/ ctx[3],
    				legacy: /*legacy*/ ctx[2],
    				size: "12px",
    				tiptext: "Copy",
    				$$slots: { default: [create_default_slot_1$5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	control.$on("click", /*click_handler*/ ctx[13]);
    	let if_block1 = /*reset*/ ctx[4] && create_if_block$a(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			create_component(colorpicker.$$.fragment);
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "R:";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "G:";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			label2 = element("label");
    			span2 = element("span");
    			span2.textContent = "B:";
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			if (if_block0) if_block0.c();
    			t10 = space();
    			div1 = element("div");
    			label3 = element("label");
    			span3 = element("span");
    			span3.textContent = "HEX:";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			create_component(control.$$.fragment);
    			t14 = space();
    			if (if_block1) if_block1.c();
    			add_location(span0, file$e, 23, 5, 625);
    			attr_dev(input0, "placeholder", "R");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$e, 24, 5, 647);
    			add_location(label0, file$e, 22, 4, 611);
    			add_location(span1, file$e, 27, 5, 735);
    			attr_dev(input1, "placeholder", "G");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$e, 28, 5, 757);
    			add_location(label1, file$e, 26, 4, 721);
    			add_location(span2, file$e, 31, 5, 845);
    			attr_dev(input2, "placeholder", "B");
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$e, 32, 5, 867);
    			add_location(label2, file$e, 30, 4, 831);
    			attr_dev(div0, "class", "picker-controls-row");
    			add_location(div0, file$e, 21, 3, 572);
    			add_location(span3, file$e, 43, 5, 1146);
    			attr_dev(input3, "placeholder", "Hex");
    			attr_dev(input3, "type", "text");
    			add_location(input3, file$e, 44, 5, 1170);
    			add_location(label3, file$e, 42, 4, 1132);
    			attr_dev(div1, "class", "picker-controls-row");
    			add_location(div1, file$e, 41, 3, 1093);
    			attr_dev(div2, "class", "picker-controls");
    			add_location(div2, file$e, 20, 2, 538);
    			attr_dev(div3, "class", "picker-split");
    			add_location(div3, file$e, 19, 1, 508);
    			attr_dev(div4, "class", "picker-wrapper");
    			add_location(div4, file$e, 17, 0, 402);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			mount_component(colorpicker, div4, null);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(label0, span0);
    			append_dev(label0, t2);
    			append_dev(label0, input0);
    			set_input_value(input0, /*rgb*/ ctx[1].r);
    			append_dev(div0, t3);
    			append_dev(div0, label1);
    			append_dev(label1, span1);
    			append_dev(label1, t5);
    			append_dev(label1, input1);
    			set_input_value(input1, /*rgb*/ ctx[1].g);
    			append_dev(div0, t6);
    			append_dev(div0, label2);
    			append_dev(label2, span2);
    			append_dev(label2, t8);
    			append_dev(label2, input2);
    			set_input_value(input2, /*rgb*/ ctx[1].b);
    			append_dev(div0, t9);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div2, t10);
    			append_dev(div2, div1);
    			append_dev(div1, label3);
    			append_dev(label3, span3);
    			append_dev(label3, t12);
    			append_dev(label3, input3);
    			set_input_value(input3, /*hex*/ ctx[0]);
    			append_dev(label3, t13);
    			mount_component(control, label3, null);
    			append_dev(label3, t14);
    			if (if_block1) if_block1.m(label3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const colorpicker_changes = {};
    			if (dirty & /*alpha*/ 32) colorpicker_changes.isAlpha = /*alpha*/ ctx[5];

    			if (!updating_rgb && dirty & /*rgb*/ 2) {
    				updating_rgb = true;
    				colorpicker_changes.rgb = /*rgb*/ ctx[1];
    				add_flush_callback(() => updating_rgb = false);
    			}

    			if (!updating_hex && dirty & /*hex*/ 1) {
    				updating_hex = true;
    				colorpicker_changes.hex = /*hex*/ ctx[0];
    				add_flush_callback(() => updating_hex = false);
    			}

    			colorpicker.$set(colorpicker_changes);

    			if (dirty & /*rgb*/ 2 && input0.value !== /*rgb*/ ctx[1].r) {
    				set_input_value(input0, /*rgb*/ ctx[1].r);
    			}

    			if (dirty & /*rgb*/ 2 && input1.value !== /*rgb*/ ctx[1].g) {
    				set_input_value(input1, /*rgb*/ ctx[1].g);
    			}

    			if (dirty & /*rgb*/ 2 && input2.value !== /*rgb*/ ctx[1].b) {
    				set_input_value(input2, /*rgb*/ ctx[1].b);
    			}

    			if (/*alpha*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*hex*/ 1 && input3.value !== /*hex*/ ctx[0]) {
    				set_input_value(input3, /*hex*/ ctx[0]);
    			}

    			const control_changes = {};
    			if (dirty & /*tips*/ 8) control_changes.tips = /*tips*/ ctx[3];
    			if (dirty & /*legacy*/ 4) control_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 32768) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);

    			if (/*reset*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*reset*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$a(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(label3, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(colorpicker.$$.fragment, local);
    			transition_in(control.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(colorpicker.$$.fragment, local);
    			transition_out(control.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(colorpicker);
    			if (if_block0) if_block0.d();
    			destroy_component(control);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Colorpicker", slots, []);
    	let { legacy = false } = $$props;
    	let { tips = false } = $$props;
    	let { reset } = $$props;
    	let { alpha = true } = $$props;
    	let { hex } = $$props;
    	let { rgb = tinycolor(hex).toRgb() } = $$props;
    	const writable_props = ["legacy", "tips", "reset", "alpha", "hex", "rgb"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<Colorpicker> was created with unknown prop '${key}'`);
    	});

    	function colorpicker_rgb_binding(value) {
    		rgb = value;
    		$$invalidate(1, rgb);
    	}

    	function colorpicker_hex_binding(value) {
    		hex = value;
    		$$invalidate(0, hex);
    	}

    	function input0_input_handler() {
    		rgb.r = this.value;
    		$$invalidate(1, rgb);
    	}

    	function input1_input_handler() {
    		rgb.g = this.value;
    		$$invalidate(1, rgb);
    	}

    	function input2_input_handler() {
    		rgb.b = this.value;
    		$$invalidate(1, rgb);
    	}

    	function input_input_handler() {
    		rgb.a = this.value;
    		$$invalidate(1, rgb);
    	}

    	function input3_input_handler() {
    		hex = this.value;
    		$$invalidate(0, hex);
    	}

    	const click_handler = e => {
    		navigator.clipboard.writeText(hex).then(
    			() => {
    				console.log("Copied to clipboard");
    			},
    			() => {
    				console.log("Failed to copy");
    			}
    		);
    	};

    	const click_handler_1 = e => {
    		$$invalidate(0, hex = reset);
    		console.log("clicked!", hex, reset);
    	};

    	$$self.$$set = $$props => {
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(3, tips = $$props.tips);
    		if ("reset" in $$props) $$invalidate(4, reset = $$props.reset);
    		if ("alpha" in $$props) $$invalidate(5, alpha = $$props.alpha);
    		if ("hex" in $$props) $$invalidate(0, hex = $$props.hex);
    		if ("rgb" in $$props) $$invalidate(1, rgb = $$props.rgb);
    	};

    	$$self.$capture_state = () => ({
    		ColorPicker,
    		tinycolor,
    		Control,
    		legacy,
    		tips,
    		reset,
    		alpha,
    		hex,
    		rgb
    	});

    	$$self.$inject_state = $$props => {
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(3, tips = $$props.tips);
    		if ("reset" in $$props) $$invalidate(4, reset = $$props.reset);
    		if ("alpha" in $$props) $$invalidate(5, alpha = $$props.alpha);
    		if ("hex" in $$props) $$invalidate(0, hex = $$props.hex);
    		if ("rgb" in $$props) $$invalidate(1, rgb = $$props.rgb);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*rgb*/ 2) {
    			console.log("Got color", rgb);
    		}

    		if ($$self.$$.dirty & /*hex*/ 1) {
    			console.log("Got color", hex);
    		}
    	};

    	return [
    		hex,
    		rgb,
    		legacy,
    		tips,
    		reset,
    		alpha,
    		colorpicker_rgb_binding,
    		colorpicker_hex_binding,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input_input_handler,
    		input3_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Colorpicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$d, create_fragment$f, safe_not_equal, {
    			legacy: 2,
    			tips: 3,
    			reset: 4,
    			alpha: 5,
    			hex: 0,
    			rgb: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Colorpicker",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*reset*/ ctx[4] === undefined && !("reset" in props)) {
    			console_1$4.warn("<Colorpicker> was created without expected prop 'reset'");
    		}

    		if (/*hex*/ ctx[0] === undefined && !("hex" in props)) {
    			console_1$4.warn("<Colorpicker> was created without expected prop 'hex'");
    		}
    	}

    	get legacy() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tips() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reset() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reset(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alpha() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alpha(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hex() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hex(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rgb() {
    		throw new Error("<Colorpicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rgb(value) {
    		throw new Error("<Colorpicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Eyedropper.svelte generated by Svelte v3.38.3 */

    const { console: console_1$3 } = globals;
    const file$d = "src\\components\\Eyedropper.svelte";

    // (49:0) <Tool   tips={tips}   size="12px"   legacy={legacy}   tiptext={"Pick a color"}   on:click={e => {    //showDropdown = true;    dispatch('pickColor');   }}  >
    function create_default_slot_1$4(ctx) {
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-eye-dropper");
    			add_location(i, file$d, 58, 1, 1342);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*dropdownRef*/ ctx[6].call(null, i));
    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(49:0) <Tool   tips={tips}   size=\\\"12px\\\"   legacy={legacy}   tiptext={\\\"Pick a color\\\"}   on:click={e => {    //showDropdown = true;    dispatch('pickColor');   }}  >",
    		ctx
    	});

    	return block;
    }

    // (62:0) {#if showDropdown}
    function create_if_block$9(ctx) {
    	let dropdown;
    	let current;

    	dropdown = new Dropdown({
    			props: {
    				content: /*dropdownContent*/ ctx[7],
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	dropdown.$on("close", /*close_handler*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(dropdown.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dropdown, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dropdown_changes = {};

    			if (dirty & /*$$scope, legacy, tips, hex*/ 8206) {
    				dropdown_changes.$$scope = { dirty, ctx };
    			}

    			dropdown.$set(dropdown_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropdown.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropdown.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dropdown, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(62:0) {#if showDropdown}",
    		ctx
    	});

    	return block;
    }

    // (63:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;     pickedColor = false;    }}   >
    function create_default_slot$4(ctx) {
    	let colorpicker;
    	let updating_hex;
    	let current;

    	function colorpicker_hex_binding(value) {
    		/*colorpicker_hex_binding*/ ctx[9](value);
    	}

    	let colorpicker_props = {
    		alpha: false,
    		legacy: /*legacy*/ ctx[2],
    		tips: /*tips*/ ctx[1]
    	};

    	if (/*hex*/ ctx[3] !== void 0) {
    		colorpicker_props.hex = /*hex*/ ctx[3];
    	}

    	colorpicker = new Colorpicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "hex", colorpicker_hex_binding));

    	const block = {
    		c: function create() {
    			create_component(colorpicker.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(colorpicker, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const colorpicker_changes = {};
    			if (dirty & /*legacy*/ 4) colorpicker_changes.legacy = /*legacy*/ ctx[2];
    			if (dirty & /*tips*/ 2) colorpicker_changes.tips = /*tips*/ ctx[1];

    			if (!updating_hex && dirty & /*hex*/ 8) {
    				updating_hex = true;
    				colorpicker_changes.hex = /*hex*/ ctx[3];
    				add_flush_callback(() => updating_hex = false);
    			}

    			colorpicker.$set(colorpicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(colorpicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(colorpicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(colorpicker, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(63:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;     pickedColor = false;    }}   >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let tool;
    	let t;
    	let if_block_anchor;
    	let current;

    	tool = new Tool({
    			props: {
    				tips: /*tips*/ ctx[1],
    				size: "12px",
    				legacy: /*legacy*/ ctx[2],
    				tiptext: "Pick a color",
    				$$slots: { default: [create_default_slot_1$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool.$on("click", /*click_handler*/ ctx[8]);
    	let if_block = /*showDropdown*/ ctx[4] && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			create_component(tool.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tool, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tool_changes = {};
    			if (dirty & /*tips*/ 2) tool_changes.tips = /*tips*/ ctx[1];
    			if (dirty & /*legacy*/ 4) tool_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 8192) {
    				tool_changes.$$scope = { dirty, ctx };
    			}

    			tool.$set(tool_changes);

    			if (/*showDropdown*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showDropdown*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tool.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tool.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tool, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function rgb2hsv(r, g, b) {
    	let v = Math.max(r, g, b), c = v - Math.min(r, g, b);

    	let h = c && (v == r
    	? (g - b) / c
    	: v == g ? 2 + (b - r) / c : 4 + (r - g) / c);

    	return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Eyedropper", slots, []);
    	const dispatch = createEventDispatcher();

    	const [dropdownRef, dropdownContent] = createPopperActions({
    		placement: "right-start",
    		strategy: "fixed"
    	});

    	let hex = "#000000";
    	let showDropdown = false;
    	let { tips = false } = $$props;
    	let { legacy = false } = $$props;
    	let { pickedColor } = $$props;

    	const hex2rgb = hex => {
    		const r = parseInt(hex.slice(1, 3), 16);
    		const g = parseInt(hex.slice(3, 5), 16);
    		const b = parseInt(hex.slice(5, 7), 16);

    		// return {r, g, b} // return an object
    		return [r, g, b];
    	};

    	function manageDropdown() {
    		$$invalidate(3, hex = pickedColor);
    		$$invalidate(4, showDropdown = true);
    		console.log("generated color", hex);
    	}

    	const writable_props = ["tips", "legacy", "pickedColor"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<Eyedropper> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		//showDropdown = true;
    		dispatch("pickColor");
    	};

    	function colorpicker_hex_binding(value) {
    		hex = value;
    		$$invalidate(3, hex);
    	}

    	const close_handler = e => {
    		$$invalidate(4, showDropdown = false);
    		$$invalidate(0, pickedColor = false);
    	};

    	$$self.$$set = $$props => {
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("pickedColor" in $$props) $$invalidate(0, pickedColor = $$props.pickedColor);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		createPopperActions,
    		Tool,
    		Dropdown,
    		Colorpicker,
    		dispatch,
    		dropdownRef,
    		dropdownContent,
    		hex,
    		showDropdown,
    		tips,
    		legacy,
    		pickedColor,
    		hex2rgb,
    		rgb2hsv,
    		manageDropdown
    	});

    	$$self.$inject_state = $$props => {
    		if ("hex" in $$props) $$invalidate(3, hex = $$props.hex);
    		if ("showDropdown" in $$props) $$invalidate(4, showDropdown = $$props.showDropdown);
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    		if ("pickedColor" in $$props) $$invalidate(0, pickedColor = $$props.pickedColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pickedColor*/ 1) {
    			if (pickedColor) manageDropdown();
    		}
    	};

    	return [
    		pickedColor,
    		tips,
    		legacy,
    		hex,
    		showDropdown,
    		dispatch,
    		dropdownRef,
    		dropdownContent,
    		click_handler,
    		colorpicker_hex_binding,
    		close_handler
    	];
    }

    class Eyedropper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$e, safe_not_equal, { tips: 1, legacy: 2, pickedColor: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Eyedropper",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pickedColor*/ ctx[0] === undefined && !("pickedColor" in props)) {
    			console_1$3.warn("<Eyedropper> was created without expected prop 'pickedColor'");
    		}
    	}

    	get tips() {
    		throw new Error("<Eyedropper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Eyedropper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Eyedropper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Eyedropper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pickedColor() {
    		throw new Error("<Eyedropper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pickedColor(value) {
    		throw new Error("<Eyedropper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Backdrop.svelte generated by Svelte v3.38.3 */
    const file$c = "src\\components\\Backdrop.svelte";

    // (24:0) <Tool   tips={tips}   size="12px"   legacy={legacy}   tiptext={"Change background"}   on:click={e => {    showDropdown = true;    //dispatch('pickColor');   }}  >
    function create_default_slot_1$3(ctx) {
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-fill");
    			add_location(i, file$c, 33, 1, 731);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*dropdownRef*/ ctx[4].call(null, i));
    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(24:0) <Tool   tips={tips}   size=\\\"12px\\\"   legacy={legacy}   tiptext={\\\"Change background\\\"}   on:click={e => {    showDropdown = true;    //dispatch('pickColor');   }}  >",
    		ctx
    	});

    	return block;
    }

    // (37:0) {#if showDropdown}
    function create_if_block$8(ctx) {
    	let dropdown;
    	let current;

    	dropdown = new Dropdown({
    			props: {
    				content: /*dropdownContent*/ ctx[5],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	dropdown.$on("close", /*close_handler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(dropdown.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dropdown, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dropdown_changes = {};

    			if (dirty & /*$$scope, legacy, tips, backdropColor*/ 1031) {
    				dropdown_changes.$$scope = { dirty, ctx };
    			}

    			dropdown.$set(dropdown_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropdown.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropdown.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dropdown, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(37:0) {#if showDropdown}",
    		ctx
    	});

    	return block;
    }

    // (38:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;    }}   >
    function create_default_slot$3(ctx) {
    	let colorpicker;
    	let updating_hex;
    	let current;

    	function colorpicker_hex_binding(value) {
    		/*colorpicker_hex_binding*/ ctx[7](value);
    	}

    	let colorpicker_props = {
    		reset: "#2F2E33",
    		legacy: /*legacy*/ ctx[2],
    		tips: /*tips*/ ctx[1]
    	};

    	if (/*backdropColor*/ ctx[0] !== void 0) {
    		colorpicker_props.hex = /*backdropColor*/ ctx[0];
    	}

    	colorpicker = new Colorpicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "hex", colorpicker_hex_binding));

    	const block = {
    		c: function create() {
    			create_component(colorpicker.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(colorpicker, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const colorpicker_changes = {};
    			if (dirty & /*legacy*/ 4) colorpicker_changes.legacy = /*legacy*/ ctx[2];
    			if (dirty & /*tips*/ 2) colorpicker_changes.tips = /*tips*/ ctx[1];

    			if (!updating_hex && dirty & /*backdropColor*/ 1) {
    				updating_hex = true;
    				colorpicker_changes.hex = /*backdropColor*/ ctx[0];
    				add_flush_callback(() => updating_hex = false);
    			}

    			colorpicker.$set(colorpicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(colorpicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(colorpicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(colorpicker, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(38:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;    }}   >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let tool;
    	let t;
    	let if_block_anchor;
    	let current;

    	tool = new Tool({
    			props: {
    				tips: /*tips*/ ctx[1],
    				size: "12px",
    				legacy: /*legacy*/ ctx[2],
    				tiptext: "Change background",
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool.$on("click", /*click_handler*/ ctx[6]);
    	let if_block = /*showDropdown*/ ctx[3] && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			create_component(tool.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tool, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tool_changes = {};
    			if (dirty & /*tips*/ 2) tool_changes.tips = /*tips*/ ctx[1];
    			if (dirty & /*legacy*/ 4) tool_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 1024) {
    				tool_changes.$$scope = { dirty, ctx };
    			}

    			tool.$set(tool_changes);

    			if (/*showDropdown*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showDropdown*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tool.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tool.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tool, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Backdrop", slots, []);
    	const dispatch = createEventDispatcher();

    	const [dropdownRef, dropdownContent] = createPopperActions({
    		placement: "right-start",
    		strategy: "fixed"
    	});

    	let { backdropColor = "#000000" } = $$props;
    	let showDropdown = false;
    	let { tips = false } = $$props;
    	let { legacy = false } = $$props;
    	const writable_props = ["backdropColor", "tips", "legacy"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Backdrop> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(3, showDropdown = true);
    	}; //dispatch('pickColor');

    	function colorpicker_hex_binding(value) {
    		backdropColor = value;
    		$$invalidate(0, backdropColor);
    	}

    	const close_handler = e => {
    		$$invalidate(3, showDropdown = false);
    	};

    	$$self.$$set = $$props => {
    		if ("backdropColor" in $$props) $$invalidate(0, backdropColor = $$props.backdropColor);
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		createPopperActions,
    		Tool,
    		Dropdown,
    		Colorpicker,
    		dispatch,
    		dropdownRef,
    		dropdownContent,
    		backdropColor,
    		showDropdown,
    		tips,
    		legacy
    	});

    	$$self.$inject_state = $$props => {
    		if ("backdropColor" in $$props) $$invalidate(0, backdropColor = $$props.backdropColor);
    		if ("showDropdown" in $$props) $$invalidate(3, showDropdown = $$props.showDropdown);
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		backdropColor,
    		tips,
    		legacy,
    		showDropdown,
    		dropdownRef,
    		dropdownContent,
    		click_handler,
    		colorpicker_hex_binding,
    		close_handler
    	];
    }

    class Backdrop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$d, safe_not_equal, { backdropColor: 0, tips: 1, legacy: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Backdrop",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get backdropColor() {
    		throw new Error("<Backdrop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backdropColor(value) {
    		throw new Error("<Backdrop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tips() {
    		throw new Error("<Backdrop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Backdrop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Backdrop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Backdrop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Palette.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1, console: console_1$2 } = globals;
    const file$b = "src\\components\\Palette.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i][0];
    	child_ctx[14] = list[i][1];
    	return child_ctx;
    }

    // (29:0) <Tool   tips={tips}   size="12px"   legacy={legacy}   tiptext={"Generate palette"}   on:click={e => {    ipcRenderer.send('getPalette', fileSelected);    showDropdown = true;   }}  >
    function create_default_slot_1$2(ctx) {
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-palette");
    			add_location(i, file$b, 38, 1, 877);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*dropdownRef*/ ctx[7].call(null, i));
    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(29:0) <Tool   tips={tips}   size=\\\"12px\\\"   legacy={legacy}   tiptext={\\\"Generate palette\\\"}   on:click={e => {    ipcRenderer.send('getPalette', fileSelected);    showDropdown = true;   }}  >",
    		ctx
    	});

    	return block;
    }

    // (42:0) {#if showDropdown}
    function create_if_block$7(ctx) {
    	let dropdown;
    	let current;

    	dropdown = new Dropdown({
    			props: {
    				content: /*dropdownContent*/ ctx[8],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	dropdown.$on("close", /*close_handler*/ ctx[11]);

    	const block = {
    		c: function create() {
    			create_component(dropdown.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dropdown, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dropdown_changes = {};

    			if (dirty & /*$$scope, palette*/ 131088) {
    				dropdown_changes.$$scope = { dirty, ctx };
    			}

    			dropdown.$set(dropdown_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropdown.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropdown.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dropdown, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(42:0) {#if showDropdown}",
    		ctx
    	});

    	return block;
    }

    // (50:3) {#each Object.entries(palette) as [color_name, color_number]}
    function create_each_block$1(ctx) {
    	let div2;
    	let div0;
    	let t0_value = /*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*tinycolor*/ ctx[6](`rgb(${/*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb})`).toHexString() + "";
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[10](/*color_name*/ ctx[13], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(div0, "class", "item-detail svelte-fokxdb");
    			add_location(div0, file$b, 61, 5, 1514);
    			attr_dev(div1, "class", "item-detail svelte-fokxdb");
    			add_location(div1, file$b, 64, 5, 1593);
    			attr_dev(div2, "class", "item svelte-fokxdb");
    			set_style(div2, "background", "rgb(" + /*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb + ")");
    			add_location(div2, file$b, 50, 4, 1148);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div2, t3);

    			if (!mounted) {
    				dispose = listen_dev(div2, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*palette*/ 16 && t0_value !== (t0_value = /*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*palette*/ 16 && t2_value !== (t2_value = /*tinycolor*/ ctx[6](`rgb(${/*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb})`).toHexString() + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*palette*/ 16) {
    				set_style(div2, "background", "rgb(" + /*palette*/ ctx[4][/*color_name*/ ctx[13]]._rgb + ")");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(50:3) {#each Object.entries(palette) as [color_name, color_number]}",
    		ctx
    	});

    	return block;
    }

    // (43:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;    }}   >
    function create_default_slot$2(ctx) {
    	let div;
    	let each_value = Object.entries(/*palette*/ ctx[4]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "palette svelte-fokxdb");
    			add_location(div, file$b, 48, 2, 1055);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*palette, Object, navigator, tinycolor, console*/ 80) {
    				each_value = Object.entries(/*palette*/ ctx[4]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(43:1) <Dropdown    content={dropdownContent}    on:close={e => {     showDropdown = false;    }}   >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let tool;
    	let t;
    	let if_block_anchor;
    	let current;

    	tool = new Tool({
    			props: {
    				tips: /*tips*/ ctx[1],
    				size: "12px",
    				legacy: /*legacy*/ ctx[2],
    				tiptext: "Generate palette",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool.$on("click", /*click_handler*/ ctx[9]);
    	let if_block = /*showDropdown*/ ctx[3] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
    			create_component(tool.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tool, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tool_changes = {};
    			if (dirty & /*tips*/ 2) tool_changes.tips = /*tips*/ ctx[1];
    			if (dirty & /*legacy*/ 4) tool_changes.legacy = /*legacy*/ ctx[2];

    			if (dirty & /*$$scope*/ 131072) {
    				tool_changes.$$scope = { dirty, ctx };
    			}

    			tool.$set(tool_changes);

    			if (/*showDropdown*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showDropdown*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tool.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tool.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tool, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Palette", slots, []);
    	const { ipcRenderer } = require("electron");
    	const tinycolor = require("tinycolor2");
    	const dispatch = createEventDispatcher();

    	const [dropdownRef, dropdownContent] = createPopperActions({
    		placement: "right-start",
    		strategy: "fixed"
    	});

    	let showDropdown = false;
    	let palette = {};
    	let { fileSelected = false } = $$props;
    	let { tips = false } = $$props;
    	let { legacy = false } = $$props;

    	ipcRenderer.on("palette", (event, arg) => {
    		$$invalidate(4, palette = arg);
    	});

    	const writable_props = ["fileSelected", "tips", "legacy"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Palette> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		ipcRenderer.send("getPalette", fileSelected);
    		$$invalidate(3, showDropdown = true);
    	};

    	const click_handler_1 = (color_name, e) => {
    		navigator.clipboard.writeText(tinycolor(`rgb(${palette[color_name]._rgb})`).toHexString()).then(
    			() => {
    				console.log("Copied to clipboard");
    			},
    			() => {
    				console.log("Failed to copy");
    			}
    		);
    	};

    	const close_handler = e => {
    		$$invalidate(3, showDropdown = false);
    	};

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		createPopperActions,
    		ipcRenderer,
    		tinycolor,
    		Tool,
    		Dropdown,
    		dispatch,
    		dropdownRef,
    		dropdownContent,
    		showDropdown,
    		palette,
    		fileSelected,
    		tips,
    		legacy
    	});

    	$$self.$inject_state = $$props => {
    		if ("showDropdown" in $$props) $$invalidate(3, showDropdown = $$props.showDropdown);
    		if ("palette" in $$props) $$invalidate(4, palette = $$props.palette);
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("tips" in $$props) $$invalidate(1, tips = $$props.tips);
    		if ("legacy" in $$props) $$invalidate(2, legacy = $$props.legacy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		fileSelected,
    		tips,
    		legacy,
    		showDropdown,
    		palette,
    		ipcRenderer,
    		tinycolor,
    		dropdownRef,
    		dropdownContent,
    		click_handler,
    		click_handler_1,
    		close_handler
    	];
    }

    class Palette extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$c, safe_not_equal, { fileSelected: 0, tips: 1, legacy: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Palette",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get fileSelected() {
    		throw new Error("<Palette>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fileSelected(value) {
    		throw new Error("<Palette>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tips() {
    		throw new Error("<Palette>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Palette>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Palette>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Palette>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Toolbox.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1 } = globals;
    const file$a = "src\\components\\Toolbox.svelte";

    // (39:1) {#if fileSelected && !settingsOpen}
    function create_if_block$6(ctx) {
    	let tool0;
    	let t0;
    	let tool1;
    	let t1;
    	let eyedropper;
    	let updating_pickedColor;
    	let t2;
    	let backdrop;
    	let updating_backdropColor;
    	let t3;
    	let tool2;
    	let t4;
    	let tool3;
    	let t5;
    	let palette;
    	let updating_fileSelected;
    	let current;

    	tool0 = new Tool({
    			props: {
    				tips: /*tips*/ ctx[5],
    				legacy: /*legacy*/ ctx[4],
    				size: "13px",
    				tiptext: "Save image",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool0.$on("click", /*click_handler*/ ctx[9]);

    	tool1 = new Tool({
    			props: {
    				size: "13px",
    				legacy: /*legacy*/ ctx[4],
    				tips: /*tips*/ ctx[5],
    				tiptext: "Copy image",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool1.$on("click", /*copyImage*/ ctx[8]);

    	function eyedropper_pickedColor_binding(value) {
    		/*eyedropper_pickedColor_binding*/ ctx[10](value);
    	}

    	let eyedropper_props = {
    		legacy: /*legacy*/ ctx[4],
    		tips: /*tips*/ ctx[5]
    	};

    	if (/*pickedColor*/ ctx[1] !== void 0) {
    		eyedropper_props.pickedColor = /*pickedColor*/ ctx[1];
    	}

    	eyedropper = new Eyedropper({ props: eyedropper_props, $$inline: true });
    	binding_callbacks.push(() => bind(eyedropper, "pickedColor", eyedropper_pickedColor_binding));
    	eyedropper.$on("pickColor", /*pickColor_handler*/ ctx[11]);

    	function backdrop_backdropColor_binding(value) {
    		/*backdrop_backdropColor_binding*/ ctx[12](value);
    	}

    	let backdrop_props = {
    		legacy: /*legacy*/ ctx[4],
    		tips: /*tips*/ ctx[5]
    	};

    	if (/*backdropColor*/ ctx[2] !== void 0) {
    		backdrop_props.backdropColor = /*backdropColor*/ ctx[2];
    	}

    	backdrop = new Backdrop({ props: backdrop_props, $$inline: true });
    	binding_callbacks.push(() => bind(backdrop, "backdropColor", backdrop_backdropColor_binding));

    	tool2 = new Tool({
    			props: {
    				size: "13px",
    				legacy: /*legacy*/ ctx[4],
    				tips: /*tips*/ ctx[5],
    				tiptext: "Flip image",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool2.$on("click", /*click_handler_1*/ ctx[13]);

    	tool3 = new Tool({
    			props: {
    				size: "12px",
    				legacy: /*legacy*/ ctx[4],
    				tips: /*tips*/ ctx[5],
    				tiptext: "Rotate image",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tool3.$on("click", /*click_handler_2*/ ctx[14]);

    	function palette_fileSelected_binding(value) {
    		/*palette_fileSelected_binding*/ ctx[15](value);
    	}

    	let palette_props = {
    		legacy: /*legacy*/ ctx[4],
    		tips: /*tips*/ ctx[5]
    	};

    	if (/*fileSelected*/ ctx[0] !== void 0) {
    		palette_props.fileSelected = /*fileSelected*/ ctx[0];
    	}

    	palette = new Palette({ props: palette_props, $$inline: true });
    	binding_callbacks.push(() => bind(palette, "fileSelected", palette_fileSelected_binding));

    	const block = {
    		c: function create() {
    			create_component(tool0.$$.fragment);
    			t0 = space();
    			create_component(tool1.$$.fragment);
    			t1 = space();
    			create_component(eyedropper.$$.fragment);
    			t2 = space();
    			create_component(backdrop.$$.fragment);
    			t3 = space();
    			create_component(tool2.$$.fragment);
    			t4 = space();
    			create_component(tool3.$$.fragment);
    			t5 = space();
    			create_component(palette.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tool0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tool1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(eyedropper, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(backdrop, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tool2, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(tool3, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(palette, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tool0_changes = {};
    			if (dirty & /*tips*/ 32) tool0_changes.tips = /*tips*/ ctx[5];
    			if (dirty & /*legacy*/ 16) tool0_changes.legacy = /*legacy*/ ctx[4];

    			if (dirty & /*$$scope*/ 65536) {
    				tool0_changes.$$scope = { dirty, ctx };
    			}

    			tool0.$set(tool0_changes);
    			const tool1_changes = {};
    			if (dirty & /*legacy*/ 16) tool1_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) tool1_changes.tips = /*tips*/ ctx[5];

    			if (dirty & /*$$scope*/ 65536) {
    				tool1_changes.$$scope = { dirty, ctx };
    			}

    			tool1.$set(tool1_changes);
    			const eyedropper_changes = {};
    			if (dirty & /*legacy*/ 16) eyedropper_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) eyedropper_changes.tips = /*tips*/ ctx[5];

    			if (!updating_pickedColor && dirty & /*pickedColor*/ 2) {
    				updating_pickedColor = true;
    				eyedropper_changes.pickedColor = /*pickedColor*/ ctx[1];
    				add_flush_callback(() => updating_pickedColor = false);
    			}

    			eyedropper.$set(eyedropper_changes);
    			const backdrop_changes = {};
    			if (dirty & /*legacy*/ 16) backdrop_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) backdrop_changes.tips = /*tips*/ ctx[5];

    			if (!updating_backdropColor && dirty & /*backdropColor*/ 4) {
    				updating_backdropColor = true;
    				backdrop_changes.backdropColor = /*backdropColor*/ ctx[2];
    				add_flush_callback(() => updating_backdropColor = false);
    			}

    			backdrop.$set(backdrop_changes);
    			const tool2_changes = {};
    			if (dirty & /*legacy*/ 16) tool2_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) tool2_changes.tips = /*tips*/ ctx[5];

    			if (dirty & /*$$scope*/ 65536) {
    				tool2_changes.$$scope = { dirty, ctx };
    			}

    			tool2.$set(tool2_changes);
    			const tool3_changes = {};
    			if (dirty & /*legacy*/ 16) tool3_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) tool3_changes.tips = /*tips*/ ctx[5];

    			if (dirty & /*$$scope*/ 65536) {
    				tool3_changes.$$scope = { dirty, ctx };
    			}

    			tool3.$set(tool3_changes);
    			const palette_changes = {};
    			if (dirty & /*legacy*/ 16) palette_changes.legacy = /*legacy*/ ctx[4];
    			if (dirty & /*tips*/ 32) palette_changes.tips = /*tips*/ ctx[5];

    			if (!updating_fileSelected && dirty & /*fileSelected*/ 1) {
    				updating_fileSelected = true;
    				palette_changes.fileSelected = /*fileSelected*/ ctx[0];
    				add_flush_callback(() => updating_fileSelected = false);
    			}

    			palette.$set(palette_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tool0.$$.fragment, local);
    			transition_in(tool1.$$.fragment, local);
    			transition_in(eyedropper.$$.fragment, local);
    			transition_in(backdrop.$$.fragment, local);
    			transition_in(tool2.$$.fragment, local);
    			transition_in(tool3.$$.fragment, local);
    			transition_in(palette.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tool0.$$.fragment, local);
    			transition_out(tool1.$$.fragment, local);
    			transition_out(eyedropper.$$.fragment, local);
    			transition_out(backdrop.$$.fragment, local);
    			transition_out(tool2.$$.fragment, local);
    			transition_out(tool3.$$.fragment, local);
    			transition_out(palette.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tool0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tool1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(eyedropper, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(backdrop, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tool2, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(tool3, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(palette, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(39:1) {#if fileSelected && !settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (40:2) <Tool     tips={tips}     legacy={legacy}     size="13px"     tiptext={"Save image"}     on:click={e => { ipcRenderer.send('saveImage', fileSelected); }}    >
    function create_default_slot_3(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "far fa-save");
    			add_location(i, file$a, 46, 3, 1221);
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
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(40:2) <Tool     tips={tips}     legacy={legacy}     size=\\\"13px\\\"     tiptext={\\\"Save image\\\"}     on:click={e => { ipcRenderer.send('saveImage', fileSelected); }}    >",
    		ctx
    	});

    	return block;
    }

    // (49:2) <Tool     size="13px"     legacy={legacy}     tips={tips}     tiptext={"Copy image"}     on:click={copyImage}    >
    function create_default_slot_2(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "far fa-clipboard");
    			set_style(i, "transform", "translateY(-2px)");
    			add_location(i, file$a, 55, 6, 1385);
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
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(49:2) <Tool     size=\\\"13px\\\"     legacy={legacy}     tips={tips}     tiptext={\\\"Copy image\\\"}     on:click={copyImage}    >",
    		ctx
    	});

    	return block;
    }

    // (69:2) <Tool     size="13px"     legacy={legacy}     tips={tips}     tiptext={"Flip image"}     on:click={e => { ipcRenderer.send('flipImage', fileSelected); }}    >
    function create_default_slot_1$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-sync-alt");
    			add_location(i, file$a, 75, 6, 1838);
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
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(69:2) <Tool     size=\\\"13px\\\"     legacy={legacy}     tips={tips}     tiptext={\\\"Flip image\\\"}     on:click={e => { ipcRenderer.send('flipImage', fileSelected); }}    >",
    		ctx
    	});

    	return block;
    }

    // (78:2) <Tool     size="12px"     legacy={legacy}     tips={tips}     tiptext={"Rotate image"}     on:click={e => { ipcRenderer.send('rotateImage', fileSelected); }}    >
    function create_default_slot$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-redo");
    			add_location(i, file$a, 84, 6, 2054);
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
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(78:2) <Tool     size=\\\"12px\\\"     legacy={legacy}     tips={tips}     tiptext={\\\"Rotate image\\\"}     on:click={e => { ipcRenderer.send('rotateImage', fileSelected); }}    >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div;
    	let current;
    	let if_block = /*fileSelected*/ ctx[0] && !/*settingsOpen*/ ctx[3] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "toolbox svelte-1xogfgp");
    			add_location(div, file$a, 37, 0, 995);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*fileSelected*/ ctx[0] && !/*settingsOpen*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*fileSelected, settingsOpen*/ 9) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Toolbox", slots, []);
    	const { ipcRenderer } = require("electron");
    	const dispatch = createEventDispatcher();
    	let { fileSelected = false } = $$props;
    	let { pickedColor } = $$props;
    	let { settingsOpen = false } = $$props;
    	let { legacy = false } = $$props;
    	let { tips = false } = $$props;
    	let { backdropColor = "#000000" } = $$props;

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

    	const writable_props = [
    		"fileSelected",
    		"pickedColor",
    		"settingsOpen",
    		"legacy",
    		"tips",
    		"backdropColor"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Toolbox> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		ipcRenderer.send("saveImage", fileSelected);
    	};

    	function eyedropper_pickedColor_binding(value) {
    		pickedColor = value;
    		$$invalidate(1, pickedColor);
    	}

    	const pickColor_handler = () => dispatch("pickColor");

    	function backdrop_backdropColor_binding(value) {
    		backdropColor = value;
    		$$invalidate(2, backdropColor);
    	}

    	const click_handler_1 = e => {
    		ipcRenderer.send("flipImage", fileSelected);
    	};

    	const click_handler_2 = e => {
    		ipcRenderer.send("rotateImage", fileSelected);
    	};

    	function palette_fileSelected_binding(value) {
    		fileSelected = value;
    		$$invalidate(0, fileSelected);
    	}

    	$$self.$$set = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("pickedColor" in $$props) $$invalidate(1, pickedColor = $$props.pickedColor);
    		if ("settingsOpen" in $$props) $$invalidate(3, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(4, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(5, tips = $$props.tips);
    		if ("backdropColor" in $$props) $$invalidate(2, backdropColor = $$props.backdropColor);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		ipcRenderer,
    		Tool,
    		Eyedropper,
    		Backdrop,
    		Palette,
    		dispatch,
    		fileSelected,
    		pickedColor,
    		settingsOpen,
    		legacy,
    		tips,
    		backdropColor,
    		copyImage
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileSelected" in $$props) $$invalidate(0, fileSelected = $$props.fileSelected);
    		if ("pickedColor" in $$props) $$invalidate(1, pickedColor = $$props.pickedColor);
    		if ("settingsOpen" in $$props) $$invalidate(3, settingsOpen = $$props.settingsOpen);
    		if ("legacy" in $$props) $$invalidate(4, legacy = $$props.legacy);
    		if ("tips" in $$props) $$invalidate(5, tips = $$props.tips);
    		if ("backdropColor" in $$props) $$invalidate(2, backdropColor = $$props.backdropColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		fileSelected,
    		pickedColor,
    		backdropColor,
    		settingsOpen,
    		legacy,
    		tips,
    		ipcRenderer,
    		dispatch,
    		copyImage,
    		click_handler,
    		eyedropper_pickedColor_binding,
    		pickColor_handler,
    		backdrop_backdropColor_binding,
    		click_handler_1,
    		click_handler_2,
    		palette_fileSelected_binding
    	];
    }

    class Toolbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$9, create_fragment$b, safe_not_equal, {
    			fileSelected: 0,
    			pickedColor: 1,
    			settingsOpen: 3,
    			legacy: 4,
    			tips: 5,
    			backdropColor: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toolbox",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pickedColor*/ ctx[1] === undefined && !("pickedColor" in props)) {
    			console_1$1.warn("<Toolbox> was created without expected prop 'pickedColor'");
    		}
    	}

    	get fileSelected() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fileSelected(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pickedColor() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pickedColor(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get settingsOpen() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settingsOpen(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legacy() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tips() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tips(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get backdropColor() {
    		throw new Error("<Toolbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backdropColor(value) {
    		throw new Error("<Toolbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\menu\Settings.svelte generated by Svelte v3.38.3 */

    const file$9 = "src\\components\\menu\\Settings.svelte";

    function create_fragment$a(ctx) {
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
    	let t14;
    	let div17;
    	let div16;
    	let div14;
    	let t16;
    	let div15;
    	let label2;
    	let input3;
    	let t17;
    	let span3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
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
    			t14 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div14 = element("div");
    			div14.textContent = "Disable tooltips";
    			t16 = space();
    			div15 = element("div");
    			label2 = element("label");
    			input3 = element("input");
    			t17 = space();
    			span3 = element("span");
    			attr_dev(div0, "class", "setting-title svelte-16y6h7s");
    			add_location(div0, file$9, 17, 2, 324);
    			attr_dev(span0, "class", "setting-control-info svelte-16y6h7s");
    			add_location(span0, file$9, 21, 3, 415);
    			attr_dev(div1, "class", "setting-control svelte-16y6h7s");
    			add_location(div1, file$9, 20, 2, 381);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "step", "0.1");
    			attr_dev(input0, "max", "1");
    			attr_dev(input0, "min", "0.1");
    			attr_dev(input0, "class", "svelte-16y6h7s");
    			add_location(input0, file$9, 24, 3, 526);
    			attr_dev(div2, "class", "setting-control-large svelte-16y6h7s");
    			add_location(div2, file$9, 23, 2, 486);
    			attr_dev(div3, "class", "setting-inner svelte-16y6h7s");
    			add_location(div3, file$9, 16, 1, 293);
    			attr_dev(div4, "class", "setting svelte-16y6h7s");
    			add_location(div4, file$9, 15, 0, 269);
    			attr_dev(div5, "class", "setting-title svelte-16y6h7s");
    			add_location(div5, file$9, 30, 2, 686);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-16y6h7s");
    			add_location(input1, file$9, 35, 4, 809);
    			attr_dev(span1, "class", "slider svelte-16y6h7s");
    			add_location(span1, file$9, 36, 4, 872);
    			attr_dev(label0, "class", "switch svelte-16y6h7s");
    			add_location(label0, file$9, 34, 3, 781);
    			attr_dev(div6, "class", "setting-control svelte-16y6h7s");
    			add_location(div6, file$9, 33, 2, 747);
    			attr_dev(div7, "class", "setting-inner svelte-16y6h7s");
    			add_location(div7, file$9, 29, 1, 655);
    			attr_dev(div8, "class", "setting-description svelte-16y6h7s");
    			add_location(div8, file$9, 40, 1, 935);
    			attr_dev(div9, "class", "setting svelte-16y6h7s");
    			add_location(div9, file$9, 28, 0, 631);
    			attr_dev(div10, "class", "setting-title svelte-16y6h7s");
    			add_location(div10, file$9, 46, 2, 1104);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-16y6h7s");
    			add_location(input2, file$9, 51, 4, 1224);
    			attr_dev(span2, "class", "slider svelte-16y6h7s");
    			add_location(span2, file$9, 52, 4, 1283);
    			attr_dev(label1, "class", "switch svelte-16y6h7s");
    			add_location(label1, file$9, 50, 3, 1196);
    			attr_dev(div11, "class", "setting-control svelte-16y6h7s");
    			add_location(div11, file$9, 49, 2, 1162);
    			attr_dev(div12, "class", "setting-inner svelte-16y6h7s");
    			add_location(div12, file$9, 45, 1, 1073);
    			attr_dev(div13, "class", "setting svelte-16y6h7s");
    			add_location(div13, file$9, 44, 0, 1049);
    			attr_dev(div14, "class", "setting-title svelte-16y6h7s");
    			add_location(div14, file$9, 59, 2, 1408);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-16y6h7s");
    			add_location(input3, file$9, 64, 4, 1532);
    			attr_dev(span3, "class", "slider svelte-16y6h7s");
    			add_location(span3, file$9, 65, 4, 1594);
    			attr_dev(label2, "class", "switch svelte-16y6h7s");
    			add_location(label2, file$9, 63, 3, 1504);
    			attr_dev(div15, "class", "setting-control svelte-16y6h7s");
    			add_location(div15, file$9, 62, 2, 1470);
    			attr_dev(div16, "class", "setting-inner svelte-16y6h7s");
    			add_location(div16, file$9, 58, 1, 1377);
    			attr_dev(div17, "class", "setting svelte-16y6h7s");
    			add_location(div17, file$9, 57, 0, 1353);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
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
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div9, anchor);
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
    			insert_dev(target, t10, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div12, t12);
    			append_dev(div12, div11);
    			append_dev(div11, label1);
    			append_dev(label1, input2);
    			input2.checked = /*settings*/ ctx[0].theme;
    			append_dev(label1, t13);
    			append_dev(label1, span2);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, div17, anchor);
    			append_dev(div17, div16);
    			append_dev(div16, div14);
    			append_dev(div16, t16);
    			append_dev(div16, div15);
    			append_dev(div15, label2);
    			append_dev(label2, input3);
    			input3.checked = /*settings*/ ctx[0].tooltips;
    			append_dev(label2, t17);
    			append_dev(label2, span3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[2]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[2]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[3]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[4]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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

    			if (dirty & /*settings*/ 1) {
    				input3.checked = /*settings*/ ctx[0].tooltips;
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(div13);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(div17);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Settings", slots, []);
    	const { ipcRenderer } = require("electron");
    	let { settings = { zoom: 0.3 } } = $$props;
    	let timeout;
    	const writable_props = ["settings"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

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

    	function input3_change_handler() {
    		settings.tooltips = this.checked;
    		$$invalidate(0, settings);
    	}

    	$$self.$$set = $$props => {
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    	};

    	$$self.$capture_state = () => ({ ipcRenderer, settings, timeout });

    	$$self.$inject_state = $$props => {
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("timeout" in $$props) $$invalidate(1, timeout = $$props.timeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timeout, settings*/ 3) {
    			{
    				clearTimeout(timeout);

    				$$invalidate(1, timeout = setTimeout(
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
    		timeout,
    		input0_change_input_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, { settings: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get settings() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settings(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\menu\About.svelte generated by Svelte v3.38.3 */

    const file$8 = "src\\components\\menu\\About.svelte";

    // (5:0) {#if version}
    function create_if_block$5(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("v. ");
    			t1 = text(/*version*/ ctx[0]);
    			attr_dev(div, "class", "about-text svelte-fc0wla");
    			add_location(div, file$8, 5, 1, 61);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*version*/ 1) set_data_dev(t1, /*version*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(5:0) {#if version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let div2;
    	let t5;
    	let br0;
    	let t6;
    	let br1;
    	let t7;
    	let t8;
    	let div3;
    	let t10;
    	let div4;
    	let t11;
    	let br2;
    	let t12;
    	let t13;
    	let div5;
    	let t15;
    	let div6;
    	let ul;
    	let li0;
    	let a0;
    	let i0;
    	let t16;
    	let li1;
    	let a1;
    	let i1;
    	let t17;
    	let li2;
    	let a2;
    	let i2;
    	let if_block = /*version*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "source.dog © 2018-2022";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Special thanks to:";
    			t4 = space();
    			div2 = element("div");
    			t5 = text("GHOST");
    			br0 = element("br");
    			t6 = text("\r\n\tSade");
    			br1 = element("br");
    			t7 = text("\r\n\tEnnoriel");
    			t8 = space();
    			div3 = element("div");
    			div3.textContent = "Made with:";
    			t10 = space();
    			div4 = element("div");
    			t11 = text("Electron");
    			br2 = element("br");
    			t12 = text("\r\n\tSvelte");
    			t13 = space();
    			div5 = element("div");
    			div5.textContent = "Links:";
    			t15 = space();
    			div6 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i0 = element("i");
    			t16 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t17 = space();
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			attr_dev(div0, "class", "about-text svelte-fc0wla");
    			add_location(div0, file$8, 9, 0, 119);
    			attr_dev(div1, "class", "about-text-title svelte-fc0wla");
    			add_location(div1, file$8, 12, 0, 183);
    			add_location(br0, file$8, 16, 6, 276);
    			add_location(br1, file$8, 17, 5, 287);
    			attr_dev(div2, "class", "about-text svelte-fc0wla");
    			add_location(div2, file$8, 15, 0, 244);
    			attr_dev(div3, "class", "about-text-title svelte-fc0wla");
    			add_location(div3, file$8, 20, 0, 312);
    			add_location(br2, file$8, 24, 9, 400);
    			attr_dev(div4, "class", "about-text svelte-fc0wla");
    			add_location(div4, file$8, 23, 0, 365);
    			attr_dev(div5, "class", "about-text-title svelte-fc0wla");
    			add_location(div5, file$8, 27, 0, 423);
    			attr_dev(i0, "class", "fab fa-trello");
    			add_location(i0, file$8, 33, 53, 609);
    			attr_dev(a0, "href", "https://trello.com/b/NlCLf8lW/refviewer");
    			attr_dev(a0, "class", "svelte-fc0wla");
    			add_location(a0, file$8, 33, 3, 559);
    			attr_dev(li0, "class", "about-list-icon svelte-fc0wla");
    			add_location(li0, file$8, 32, 2, 526);
    			attr_dev(i1, "class", "fab fa-github-square");
    			add_location(i1, file$8, 36, 57, 742);
    			attr_dev(a1, "href", "https://github.com/atomic-addison/refviewer");
    			attr_dev(a1, "class", "svelte-fc0wla");
    			add_location(a1, file$8, 36, 3, 688);
    			attr_dev(li1, "class", "about-list-icon svelte-fc0wla");
    			add_location(li1, file$8, 35, 2, 655);
    			attr_dev(i2, "class", "fas fa-home");
    			add_location(i2, file$8, 39, 32, 857);
    			attr_dev(a2, "href", "https://source.dog");
    			attr_dev(a2, "class", "svelte-fc0wla");
    			add_location(a2, file$8, 39, 3, 828);
    			attr_dev(li2, "class", "about-list-icon svelte-fc0wla");
    			add_location(li2, file$8, 38, 2, 795);
    			attr_dev(ul, "class", "about-list svelte-fc0wla");
    			add_location(ul, file$8, 31, 1, 499);
    			attr_dev(div6, "class", "about-text svelte-fc0wla");
    			add_location(div6, file$8, 30, 0, 472);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t5);
    			append_dev(div2, br0);
    			append_dev(div2, t6);
    			append_dev(div2, br1);
    			append_dev(div2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div3, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, t11);
    			append_dev(div4, br2);
    			append_dev(div4, t12);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i0);
    			append_dev(ul, t16);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i1);
    			append_dev(ul, t17);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(a2, i2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*version*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	let { version } = $$props;
    	const writable_props = ["version"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("version" in $$props) $$invalidate(0, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({ version });

    	$$self.$inject_state = $$props => {
    		if ("version" in $$props) $$invalidate(0, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [version];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, { version: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[0] === undefined && !("version" in props)) {
    			console.warn("<About> was created without expected prop 'version'");
    		}
    	}

    	get version() {
    		throw new Error("<About>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<About>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\menu\Recent.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\components\\menu\\Recent.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (25:1) {:else}
    function create_else_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "No recent files found yet!";
    			attr_dev(span, "class", "recents-list-fallback svelte-1qi5rhg");
    			add_location(span, file$7, 25, 2, 552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(25:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (11:1) {#if recents && recents.length}
    function create_if_block$4(ctx) {
    	let each_1_anchor;
    	let each_value = /*recents*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*recents, ipcRenderer, dispatch*/ 7) {
    				each_value = /*recents*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(11:1) {#if recents && recents.length}",
    		ctx
    	});

    	return block;
    }

    // (12:2) {#each recents as item}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[4] + "";
    	let t0;
    	let a_href_value;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[3](/*item*/ ctx[4], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "class", "recents-list-item svelte-1qi5rhg");
    			attr_dev(a, "href", a_href_value = /*item*/ ctx[4]);
    			add_location(a, file$7, 13, 4, 291);
    			attr_dev(li, "class", "svelte-1qi5rhg");
    			add_location(li, file$7, 12, 3, 281);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*recents*/ 1 && t0_value !== (t0_value = /*item*/ ctx[4] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*recents*/ 1 && a_href_value !== (a_href_value = /*item*/ ctx[4])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:2) {#each recents as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let ul;

    	function select_block_type(ctx, dirty) {
    		if (/*recents*/ ctx[0] && /*recents*/ ctx[0].length) return create_if_block$4;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			if_block.c();
    			attr_dev(ul, "class", "recents-list svelte-1qi5rhg");
    			add_location(ul, file$7, 9, 0, 190);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			if_block.m(ul, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(ul, null);
    				}
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Recent", slots, []);
    	const { ipcRenderer } = require("electron");
    	const dispatch = createEventDispatcher();
    	let { recents } = $$props;
    	const writable_props = ["recents"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recent> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (item, e) => {
    		e.preventDefault();
    		ipcRenderer.send("file", item);
    		dispatch("settingsOpen", false);
    	};

    	$$self.$$set = $$props => {
    		if ("recents" in $$props) $$invalidate(0, recents = $$props.recents);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		ipcRenderer,
    		dispatch,
    		recents
    	});

    	$$self.$inject_state = $$props => {
    		if ("recents" in $$props) $$invalidate(0, recents = $$props.recents);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [recents, ipcRenderer, dispatch, click_handler];
    }

    class Recent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$8, safe_not_equal, { recents: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recent",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*recents*/ ctx[0] === undefined && !("recents" in props)) {
    			console.warn("<Recent> was created without expected prop 'recents'");
    		}
    	}

    	get recents() {
    		throw new Error("<Recent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set recents(value) {
    		throw new Error("<Recent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\menu\Changelog.svelte generated by Svelte v3.38.3 */

    const file$6 = "src\\components\\menu\\Changelog.svelte";

    function create_fragment$7(ctx) {
    	let div0;
    	let t1;
    	let ul0;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;
    	let t7;
    	let li3;
    	let t9;
    	let li4;
    	let t11;
    	let li5;
    	let t13;
    	let li6;
    	let t14;
    	let div1;
    	let t16;
    	let ul1;
    	let li7;
    	let t18;
    	let li8;
    	let t20;
    	let li9;
    	let t22;
    	let li10;
    	let t24;
    	let li11;
    	let t26;
    	let li12;
    	let t28;
    	let li13;
    	let t29;
    	let div2;
    	let t31;
    	let ul2;
    	let li14;
    	let t33;
    	let li15;
    	let t35;
    	let li16;
    	let t37;
    	let li17;
    	let t39;
    	let li18;
    	let t41;
    	let li19;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "New features";
    			t1 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Added a clickable badge with the zoom amount that resets the pan and zoom on click";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "Added the option to make the workspace area transparent";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "The cursor now shows colors when color picking instead of using the button's background";
    			t7 = space();
    			li3 = element("li");
    			li3.textContent = "Added the option to reset the workspace color";
    			t9 = space();
    			li4 = element("li");
    			li4.textContent = "Added the setting to disable  tooltips";
    			t11 = space();
    			li5 = element("li");
    			li5.textContent = "Added the overwrite setting to prevent replacing active image";
    			t13 = space();
    			li6 = element("li");
    			t14 = space();
    			div1 = element("div");
    			div1.textContent = "Fixes/Updates";
    			t16 = space();
    			ul1 = element("ul");
    			li7 = element("li");
    			li7.textContent = "The menu is no longer a dropdown, shows up over the workspace";
    			t18 = space();
    			li8 = element("li");
    			li8.textContent = "The delete image button and tools now only show up when an image is selected";
    			t20 = space();
    			li9 = element("li");
    			li9.textContent = "Added the setting to switch to the legacy theme";
    			t22 = space();
    			li10 = element("li");
    			li10.textContent = "Replaced the eyedropper color info window with a color picker";
    			t24 = space();
    			li11 = element("li");
    			li11.textContent = "Added the option to copy the color with a click to the color picker";
    			t26 = space();
    			li12 = element("li");
    			li12.textContent = "Workspace color now resets when the image is cleared";
    			t28 = space();
    			li13 = element("li");
    			t29 = space();
    			div2 = element("div");
    			div2.textContent = "Misc";
    			t31 = space();
    			ul2 = element("ul");
    			li14 = element("li");
    			li14.textContent = "Removed support for untested .cr2 and .nef formats";
    			t33 = space();
    			li15 = element("li");
    			li15.textContent = "Changed the theme";
    			t35 = space();
    			li16 = element("li");
    			li16.textContent = "Changed the framework from jQuery to Svelte";
    			t37 = space();
    			li17 = element("li");
    			li17.textContent = "The about window now opens inside the main window";
    			t39 = space();
    			li18 = element("li");
    			li18.textContent = "The settings window now opens inside the main window";
    			t41 = space();
    			li19 = element("li");
    			attr_dev(div0, "class", "about-text-title svelte-1wx3zio");
    			add_location(div0, file$6, 3, 0, 23);
    			add_location(li0, file$6, 7, 1, 105);
    			add_location(li1, file$6, 10, 1, 206);
    			add_location(li2, file$6, 13, 1, 280);
    			add_location(li3, file$6, 16, 1, 386);
    			add_location(li4, file$6, 19, 1, 450);
    			add_location(li5, file$6, 22, 1, 507);
    			add_location(li6, file$6, 25, 1, 587);
    			attr_dev(ul0, "class", "change-list svelte-1wx3zio");
    			add_location(ul0, file$6, 6, 0, 78);
    			attr_dev(div1, "class", "about-text-title svelte-1wx3zio");
    			add_location(div1, file$6, 27, 0, 605);
    			add_location(li7, file$6, 31, 1, 688);
    			add_location(li8, file$6, 34, 1, 768);
    			add_location(li9, file$6, 37, 1, 863);
    			add_location(li10, file$6, 40, 1, 929);
    			add_location(li11, file$6, 43, 1, 1009);
    			add_location(li12, file$6, 46, 1, 1095);
    			add_location(li13, file$6, 49, 1, 1166);
    			attr_dev(ul1, "class", "change-list svelte-1wx3zio");
    			add_location(ul1, file$6, 30, 0, 661);
    			attr_dev(div2, "class", "about-text-title svelte-1wx3zio");
    			add_location(div2, file$6, 51, 0, 1184);
    			add_location(li14, file$6, 55, 1, 1258);
    			add_location(li15, file$6, 58, 1, 1327);
    			add_location(li16, file$6, 61, 1, 1363);
    			add_location(li17, file$6, 64, 1, 1425);
    			add_location(li18, file$6, 67, 1, 1493);
    			add_location(li19, file$6, 70, 1, 1564);
    			attr_dev(ul2, "class", "change-list svelte-1wx3zio");
    			add_location(ul2, file$6, 54, 0, 1231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul0, anchor);
    			append_dev(ul0, li0);
    			append_dev(ul0, t3);
    			append_dev(ul0, li1);
    			append_dev(ul0, t5);
    			append_dev(ul0, li2);
    			append_dev(ul0, t7);
    			append_dev(ul0, li3);
    			append_dev(ul0, t9);
    			append_dev(ul0, li4);
    			append_dev(ul0, t11);
    			append_dev(ul0, li5);
    			append_dev(ul0, t13);
    			append_dev(ul0, li6);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, ul1, anchor);
    			append_dev(ul1, li7);
    			append_dev(ul1, t18);
    			append_dev(ul1, li8);
    			append_dev(ul1, t20);
    			append_dev(ul1, li9);
    			append_dev(ul1, t22);
    			append_dev(ul1, li10);
    			append_dev(ul1, t24);
    			append_dev(ul1, li11);
    			append_dev(ul1, t26);
    			append_dev(ul1, li12);
    			append_dev(ul1, t28);
    			append_dev(ul1, li13);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, ul2, anchor);
    			append_dev(ul2, li14);
    			append_dev(ul2, t33);
    			append_dev(ul2, li15);
    			append_dev(ul2, t35);
    			append_dev(ul2, li16);
    			append_dev(ul2, t37);
    			append_dev(ul2, li17);
    			append_dev(ul2, t39);
    			append_dev(ul2, li18);
    			append_dev(ul2, t41);
    			append_dev(ul2, li19);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul0);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(ul1);
    			if (detaching) detach_dev(t29);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(ul2);
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

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Changelog", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Changelog> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Changelog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Changelog",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\menu\Menu.svelte generated by Svelte v3.38.3 */
    const file$5 = "src\\components\\menu\\Menu.svelte";

    // (62:35) 
    function create_if_block_3(ctx) {
    	let div;
    	let changelog;
    	let current;
    	changelog = new Changelog({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(changelog.$$.fragment);
    			attr_dev(div, "class", "settings-w-inner svelte-mm64g3");
    			add_location(div, file$5, 62, 3, 1493);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(changelog, div, null);
    			current = true;
    		},
    		p: noop$1,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(changelog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(changelog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(changelog);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(62:35) ",
    		ctx
    	});

    	return block;
    }

    // (58:31) 
    function create_if_block_2$1(ctx) {
    	let div;
    	let about;
    	let current;

    	about = new About({
    			props: { version: /*version*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(about.$$.fragment);
    			attr_dev(div, "class", "settings-w-inner svelte-mm64g3");
    			add_location(div, file$5, 58, 3, 1385);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(about, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const about_changes = {};
    			if (dirty & /*version*/ 4) about_changes.version = /*version*/ ctx[2];
    			about.$set(about_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(about);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(58:31) ",
    		ctx
    	});

    	return block;
    }

    // (54:34) 
    function create_if_block_1$1(ctx) {
    	let div;
    	let settings_1;
    	let current;

    	settings_1 = new Settings({
    			props: { settings: /*settings*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(settings_1.$$.fragment);
    			attr_dev(div, "class", "settings-w-inner svelte-mm64g3");
    			add_location(div, file$5, 54, 3, 1277);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(settings_1, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const settings_1_changes = {};
    			if (dirty & /*settings*/ 1) settings_1_changes.settings = /*settings*/ ctx[0];
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
    			if (detaching) detach_dev(div);
    			destroy_component(settings_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(54:34) ",
    		ctx
    	});

    	return block;
    }

    // (47:2) {#if setWindow=="recent"}
    function create_if_block$3(ctx) {
    	let div;
    	let recent;
    	let current;

    	recent = new Recent({
    			props: { recents: /*recents*/ ctx[1] },
    			$$inline: true
    		});

    	recent.$on("settingsOpen", /*settingsOpen_handler*/ ctx[9]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(recent.$$.fragment);
    			attr_dev(div, "class", "settings-w-inner svelte-mm64g3");
    			add_location(div, file$5, 47, 3, 1089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(recent, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const recent_changes = {};
    			if (dirty & /*recents*/ 2) recent_changes.recents = /*recents*/ ctx[1];
    			recent.$set(recent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(recent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(recent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(recent);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(47:2) {#if setWindow==\\\"recent\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div2;
    	let div0;
    	let ul;
    	let li0;
    	let t1;
    	let li1;
    	let t3;
    	let li2;
    	let t5;
    	let li3;
    	let t7;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$3, create_if_block_1$1, create_if_block_2$1, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*setWindow*/ ctx[3] == "recent") return 0;
    		if (/*setWindow*/ ctx[3] == "settings") return 1;
    		if (/*setWindow*/ ctx[3] == "about") return 2;
    		if (/*setWindow*/ ctx[3] == "changelog") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

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
    			li3 = element("li");
    			li3.textContent = "Changelog";
    			t7 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(li0, "class", "svelte-mm64g3");
    			toggle_class(li0, "active", /*setWindow*/ ctx[3] == "recent");
    			add_location(li0, file$5, 19, 3, 506);
    			attr_dev(li1, "class", "svelte-mm64g3");
    			toggle_class(li1, "active", /*setWindow*/ ctx[3] == "settings");
    			add_location(li1, file$5, 25, 3, 627);
    			attr_dev(li2, "class", "svelte-mm64g3");
    			toggle_class(li2, "active", /*setWindow*/ ctx[3] == "about");
    			add_location(li2, file$5, 31, 3, 754);
    			attr_dev(li3, "class", "svelte-mm64g3");
    			toggle_class(li3, "active", /*setWindow*/ ctx[3] == "changelog");
    			add_location(li3, file$5, 37, 3, 872);
    			attr_dev(ul, "class", "settings-container-menu svelte-mm64g3");
    			add_location(ul, file$5, 18, 2, 465);
    			attr_dev(div0, "class", "settings-container-sidebar svelte-mm64g3");
    			add_location(div0, file$5, 17, 1, 421);
    			attr_dev(div1, "class", "settings-container-main svelte-mm64g3");
    			add_location(div1, file$5, 45, 1, 1018);
    			attr_dev(div2, "class", "settings-container svelte-mm64g3");
    			add_location(div2, file$5, 16, 0, 386);
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
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(div2, t7);
    			append_dev(div2, div1);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(li0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(li1, "click", /*click_handler_1*/ ctx[6], false, false, false),
    					listen_dev(li2, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(li3, "click", /*click_handler_3*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*setWindow*/ 8) {
    				toggle_class(li0, "active", /*setWindow*/ ctx[3] == "recent");
    			}

    			if (dirty & /*setWindow*/ 8) {
    				toggle_class(li1, "active", /*setWindow*/ ctx[3] == "settings");
    			}

    			if (dirty & /*setWindow*/ 8) {
    				toggle_class(li2, "active", /*setWindow*/ ctx[3] == "about");
    			}

    			if (dirty & /*setWindow*/ 8) {
    				toggle_class(li3, "active", /*setWindow*/ ctx[3] == "changelog");
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Menu", slots, []);
    	const dispatch = createEventDispatcher();
    	let setWindow = "recent";
    	let { settings } = $$props;
    	let { recents } = $$props;
    	let { version } = $$props;
    	const writable_props = ["settings", "recents", "version"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		$$invalidate(3, setWindow = "recent");
    	};

    	const click_handler_1 = e => {
    		$$invalidate(3, setWindow = "settings");
    	};

    	const click_handler_2 = e => {
    		$$invalidate(3, setWindow = "about");
    	};

    	const click_handler_3 = e => {
    		$$invalidate(3, setWindow = "changelog");
    	};

    	const settingsOpen_handler = e => {
    		dispatch("settingsOpen", e.detail);
    	};

    	$$self.$$set = $$props => {
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("recents" in $$props) $$invalidate(1, recents = $$props.recents);
    		if ("version" in $$props) $$invalidate(2, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Settings,
    		About,
    		Recent,
    		Changelog,
    		dispatch,
    		setWindow,
    		settings,
    		recents,
    		version
    	});

    	$$self.$inject_state = $$props => {
    		if ("setWindow" in $$props) $$invalidate(3, setWindow = $$props.setWindow);
    		if ("settings" in $$props) $$invalidate(0, settings = $$props.settings);
    		if ("recents" in $$props) $$invalidate(1, recents = $$props.recents);
    		if ("version" in $$props) $$invalidate(2, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		settings,
    		recents,
    		version,
    		setWindow,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		settingsOpen_handler
    	];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, { settings: 0, recents: 1, version: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*settings*/ ctx[0] === undefined && !("settings" in props)) {
    			console.warn("<Menu> was created without expected prop 'settings'");
    		}

    		if (/*recents*/ ctx[1] === undefined && !("recents" in props)) {
    			console.warn("<Menu> was created without expected prop 'recents'");
    		}

    		if (/*version*/ ctx[2] === undefined && !("version" in props)) {
    			console.warn("<Menu> was created without expected prop 'version'");
    		}
    	}

    	get settings() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set settings(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get recents() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set recents(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Dropfield.svelte generated by Svelte v3.38.3 */

    const file$4 = "src\\components\\Dropfield.svelte";

    // (8:3) {#if !legacy}
    function create_if_block$2(ctx) {
    	let div;
    	let i;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fas fa-upload");
    			add_location(i, file$4, 9, 5, 235);
    			attr_dev(div, "class", "dropfield-inner-icon svelte-165i5wg");
    			add_location(div, file$4, 8, 4, 194);
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
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(8:3) {#if !legacy}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let t0;
    	let div1;
    	let div0;
    	let if_block = !/*legacy*/ ctx[0] && create_if_block$2(ctx);

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
    			add_location(div0, file$4, 13, 4, 331);
    			attr_dev(div1, "class", "dropfield-inner-text svelte-165i5wg");
    			add_location(div1, file$4, 12, 3, 291);
    			attr_dev(div2, "class", "dropfield-inner svelte-165i5wg");
    			add_location(div2, file$4, 6, 2, 141);
    			attr_dev(div3, "class", "dropfield-inner-wrapper svelte-165i5wg");
    			add_location(div3, file$4, 5, 1, 100);
    			attr_dev(div4, "class", "dropfield svelte-165i5wg");
    			toggle_class(div4, "legacy", /*legacy*/ ctx[0]);
    			add_location(div4, file$4, 4, 0, 52);
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
    					if_block = create_if_block$2(ctx);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dropfield", slots, []);
    	let { legacy = false } = $$props;
    	const writable_props = ["legacy"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dropfield> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("legacy" in $$props) $$invalidate(0, legacy = $$props.legacy);
    	};

    	$$self.$capture_state = () => ({ legacy });

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
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, { legacy: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dropfield",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get legacy() {
    		throw new Error("<Dropfield>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legacy(value) {
    		throw new Error("<Dropfield>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Cursor.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\components\\Cursor.svelte";

    function create_fragment$4(ctx) {
    	let div6;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div5;
    	let div3;
    	let t2;
    	let div4;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t2 = space();
    			div4 = element("div");
    			attr_dev(div0, "class", "cursor-pointer svelte-1bquivv");
    			add_location(div0, file$3, 8, 2, 158);
    			attr_dev(div1, "class", "cursor-color svelte-1bquivv");
    			add_location(div1, file$3, 9, 2, 196);
    			attr_dev(div2, "class", "cursor-backdrop svelte-1bquivv");
    			add_location(div2, file$3, 7, 1, 125);
    			attr_dev(div3, "class", "cursor-pointer svelte-1bquivv");
    			add_location(div3, file$3, 12, 2, 272);
    			attr_dev(div4, "class", "cursor-color svelte-1bquivv");
    			set_style(div4, "background", /*bg*/ ctx[0]);
    			add_location(div4, file$3, 13, 2, 310);
    			attr_dev(div5, "class", "cursor-content svelte-1bquivv");
    			add_location(div5, file$3, 11, 1, 240);
    			attr_dev(div6, "class", "cursor svelte-1bquivv");
    			set_style(div6, "top", /*y*/ ctx[2] + "px");
    			set_style(div6, "left", /*x*/ ctx[1] + "px");
    			add_location(div6, file$3, 6, 0, 72);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*bg*/ 1) {
    				set_style(div4, "background", /*bg*/ ctx[0]);
    			}

    			if (dirty & /*y*/ 4) {
    				set_style(div6, "top", /*y*/ ctx[2] + "px");
    			}

    			if (dirty & /*x*/ 2) {
    				set_style(div6, "left", /*x*/ ctx[1] + "px");
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Cursor", slots, []);
    	let { bg } = $$props;
    	let { x } = $$props;
    	let { y } = $$props;
    	const writable_props = ["bg", "x", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Cursor> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("bg" in $$props) $$invalidate(0, bg = $$props.bg);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("y" in $$props) $$invalidate(2, y = $$props.y);
    	};

    	$$self.$capture_state = () => ({ bg, x, y });

    	$$self.$inject_state = $$props => {
    		if ("bg" in $$props) $$invalidate(0, bg = $$props.bg);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("y" in $$props) $$invalidate(2, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [bg, x, y];
    }

    class Cursor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, { bg: 0, x: 1, y: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cursor",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*bg*/ ctx[0] === undefined && !("bg" in props)) {
    			console.warn("<Cursor> was created without expected prop 'bg'");
    		}

    		if (/*x*/ ctx[1] === undefined && !("x" in props)) {
    			console.warn("<Cursor> was created without expected prop 'x'");
    		}

    		if (/*y*/ ctx[2] === undefined && !("y" in props)) {
    			console.warn("<Cursor> was created without expected prop 'y'");
    		}
    	}

    	get bg() {
    		throw new Error("<Cursor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bg(value) {
    		throw new Error("<Cursor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Cursor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Cursor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Cursor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Cursor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Zoomscale.svelte generated by Svelte v3.38.3 */

    const file$2 = "src\\components\\Zoomscale.svelte";

    // (6:0) {#if zoomscale != 1}
    function create_if_block$1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("x");
    			t1 = text(/*zoomscale*/ ctx[1]);
    			attr_dev(div, "class", "zoomscale svelte-7orj8y");
    			add_location(div, file$2, 6, 1, 93);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*zoomscale*/ 2) set_data_dev(t1, /*zoomscale*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(6:0) {#if zoomscale != 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;
    	let if_block = /*zoomscale*/ ctx[1] != 1 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*zoomscale*/ ctx[1] != 1) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    function instance_1$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Zoomscale", slots, []);
    	let { instance } = $$props;
    	let { zoomscale } = $$props;
    	const writable_props = ["instance", "zoomscale"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Zoomscale> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		instance.zoom(1, { animate: false });
    		instance.pan(0, 0);
    	};

    	$$self.$$set = $$props => {
    		if ("instance" in $$props) $$invalidate(0, instance = $$props.instance);
    		if ("zoomscale" in $$props) $$invalidate(1, zoomscale = $$props.zoomscale);
    	};

    	$$self.$capture_state = () => ({ instance, zoomscale });

    	$$self.$inject_state = $$props => {
    		if ("instance" in $$props) $$invalidate(0, instance = $$props.instance);
    		if ("zoomscale" in $$props) $$invalidate(1, zoomscale = $$props.zoomscale);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [instance, zoomscale, click_handler];
    }

    class Zoomscale extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance_1$1, create_fragment$3, safe_not_equal, { instance: 0, zoomscale: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Zoomscale",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*instance*/ ctx[0] === undefined && !("instance" in props)) {
    			console.warn("<Zoomscale> was created without expected prop 'instance'");
    		}

    		if (/*zoomscale*/ ctx[1] === undefined && !("zoomscale" in props)) {
    			console.warn("<Zoomscale> was created without expected prop 'zoomscale'");
    		}
    	}

    	get instance() {
    		throw new Error("<Zoomscale>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set instance(value) {
    		throw new Error("<Zoomscale>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get zoomscale() {
    		throw new Error("<Zoomscale>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set zoomscale(value) {
    		throw new Error("<Zoomscale>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    // (317:2) {#if settingsOpen}
    function create_if_block_2(ctx) {
    	let menu;
    	let current;

    	menu = new Menu({
    			props: {
    				settings: /*proxySettings*/ ctx[7],
    				recents: /*recents*/ ctx[8],
    				version: /*version*/ ctx[17]
    			},
    			$$inline: true
    		});

    	menu.$on("settingsOpen", /*settingsOpen_handler_1*/ ctx[28]);

    	const block = {
    		c: function create() {
    			create_component(menu.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const menu_changes = {};
    			if (dirty[0] & /*proxySettings*/ 128) menu_changes.settings = /*proxySettings*/ ctx[7];
    			if (dirty[0] & /*recents*/ 256) menu_changes.recents = /*recents*/ ctx[8];
    			menu.$set(menu_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(317:2) {#if settingsOpen}",
    		ctx
    	});

    	return block;
    }

    // (374:2) {:else}
    function create_else_block(ctx) {
    	let dropfield;
    	let current;

    	dropfield = new Dropfield({
    			props: { legacy: /*settings*/ ctx[4].theme },
    			$$inline: true
    		});

    	dropfield.$on("select", /*select_handler*/ ctx[33]);

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
    			if (dirty[0] & /*settings*/ 16) dropfield_changes.legacy = /*settings*/ ctx[4].theme;
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
    		source: "(374:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (326:2) {#if file}
    function create_if_block(ctx) {
    	let div1;
    	let t0;
    	let zoomscale_1;
    	let t1;
    	let div0;
    	let canvas;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*pickingmode*/ ctx[6] && /*mouseincanvas*/ ctx[12] && create_if_block_1(ctx);

    	zoomscale_1 = new Zoomscale({
    			props: {
    				zoomscale: /*zoomscale*/ ctx[13],
    				instance: /*instance*/ ctx[9]
    			},
    			$$inline: true
    		});

    	canvas = new Canvas({
    			props: {
    				width: /*width*/ ctx[1],
    				height: /*height*/ ctx[2],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	canvas.$on("mousemove", /*handleMousemove*/ ctx[19]);
    	canvas.$on("mouseenter", /*mouseenter_handler*/ ctx[29]);
    	canvas.$on("mouseleave", /*mouseleave_handler*/ ctx[30]);
    	canvas.$on("click", /*click_handler*/ ctx[31]);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			create_component(zoomscale_1.$$.fragment);
    			t1 = space();
    			div0 = element("div");
    			create_component(canvas.$$.fragment);
    			attr_dev(div0, "class", "canvas-container-inner svelte-fd7l68");
    			toggle_class(div0, "pickingmode", /*pickingmode*/ ctx[6]);
    			add_location(div0, file_1, 341, 4, 8611);
    			attr_dev(div1, "class", "canvas-container svelte-fd7l68");
    			toggle_class(div1, "pixelated", /*zoomed*/ ctx[3]);
    			add_location(div1, file_1, 326, 3, 8328);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t0);
    			mount_component(zoomscale_1, div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(canvas, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler_1*/ ctx[32], false, false, false),
    					listen_dev(div1, "mousemove", /*handleCursor*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*pickingmode*/ ctx[6] && /*mouseincanvas*/ ctx[12]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*pickingmode, mouseincanvas*/ 4160) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const zoomscale_1_changes = {};
    			if (dirty[0] & /*zoomscale*/ 8192) zoomscale_1_changes.zoomscale = /*zoomscale*/ ctx[13];
    			if (dirty[0] & /*instance*/ 512) zoomscale_1_changes.instance = /*instance*/ ctx[9];
    			zoomscale_1.$set(zoomscale_1_changes);
    			const canvas_changes = {};
    			if (dirty[0] & /*width*/ 2) canvas_changes.width = /*width*/ ctx[1];
    			if (dirty[0] & /*height*/ 4) canvas_changes.height = /*height*/ ctx[2];

    			if (dirty[0] & /*render*/ 65536 | dirty[1] & /*$$scope*/ 2048) {
    				canvas_changes.$$scope = { dirty, ctx };
    			}

    			canvas.$set(canvas_changes);

    			if (dirty[0] & /*pickingmode*/ 64) {
    				toggle_class(div0, "pickingmode", /*pickingmode*/ ctx[6]);
    			}

    			if (dirty[0] & /*zoomed*/ 8) {
    				toggle_class(div1, "pixelated", /*zoomed*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(zoomscale_1.$$.fragment, local);
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(zoomscale_1.$$.fragment, local);
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			destroy_component(zoomscale_1);
    			destroy_component(canvas);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(326:2) {#if file}",
    		ctx
    	});

    	return block;
    }

    // (332:4) {#if pickingmode && mouseincanvas}
    function create_if_block_1(ctx) {
    	let cursor;
    	let current;

    	cursor = new Cursor({
    			props: {
    				x: /*m*/ ctx[15].x,
    				y: /*m*/ ctx[15].y,
    				bg: /*chosenColor*/ ctx[11]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(cursor.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cursor, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const cursor_changes = {};
    			if (dirty[0] & /*m*/ 32768) cursor_changes.x = /*m*/ ctx[15].x;
    			if (dirty[0] & /*m*/ 32768) cursor_changes.y = /*m*/ ctx[15].y;
    			if (dirty[0] & /*chosenColor*/ 2048) cursor_changes.bg = /*chosenColor*/ ctx[11];
    			cursor.$set(cursor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cursor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cursor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cursor, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(332:4) {#if pickingmode && mouseincanvas}",
    		ctx
    	});

    	return block;
    }

    // (354:8) <Canvas           width={width}           height={height}           on:mousemove={handleMousemove}           on:mouseenter={() => {mouseincanvas=true;}}           on:mouseleave={() => {mouseincanvas=false;}}           on:click={() => {            if (pickingmode) {             pickingmode = false;            instance.setOptions({disablePan:false});             pickedColor = chosenColor;               console.log("COLOR UPDATE!", pickedColor);            }           }}          >
    function create_default_slot_1(ctx) {
    	let layer;
    	let current;

    	layer = new Layer({
    			props: { render: /*render*/ ctx[16] },
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
    			if (dirty[0] & /*render*/ 65536) layer_changes.render = /*render*/ ctx[16];
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
    		source: "(354:8) <Canvas           width={width}           height={height}           on:mousemove={handleMousemove}           on:mouseenter={() => {mouseincanvas=true;}}           on:mouseleave={() => {mouseincanvas=false;}}           on:click={() => {            if (pickingmode) {             pickingmode = false;            instance.setOptions({disablePan:false});             pickedColor = chosenColor;               console.log(\\\"COLOR UPDATE!\\\", pickedColor);            }           }}          >",
    		ctx
    	});

    	return block;
    }

    // (311:1) <Desktop    {backdropColor}    legacy={settings.theme}    on:dragover={(e) => { e.preventDefault(); }}    on:drop={handleFilesSelect}   >
    function create_default_slot(ctx) {
    	let t_1;
    	let current_block_type_index;
    	let if_block1;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*settingsOpen*/ ctx[5] && create_if_block_2(ctx);
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

    					if (dirty[0] & /*settingsOpen*/ 32) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
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
    		source: "(311:1) <Desktop    {backdropColor}    legacy={settings.theme}    on:dragover={(e) => { e.preventDefault(); }}    on:drop={handleFilesSelect}   >",
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
    	let updating_pickedColor;
    	let updating_backdropColor;
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
    				tips: /*settings*/ ctx[4].tooltips,
    				version: /*version*/ ctx[17]
    			},
    			$$inline: true
    		});

    	titlebar.$on("clear", /*clear_handler*/ ctx[23]);
    	titlebar.$on("settingsOpen", /*settingsOpen_handler*/ ctx[24]);

    	function toolbox_pickedColor_binding(value) {
    		/*toolbox_pickedColor_binding*/ ctx[25](value);
    	}

    	function toolbox_backdropColor_binding(value) {
    		/*toolbox_backdropColor_binding*/ ctx[26](value);
    	}

    	let toolbox_props = {
    		settingsOpen: /*settingsOpen*/ ctx[5],
    		fileSelected: /*file*/ ctx[0],
    		legacy: /*settings*/ ctx[4].theme,
    		tips: /*settings*/ ctx[4].tooltips
    	};

    	if (/*pickedColor*/ ctx[10] !== void 0) {
    		toolbox_props.pickedColor = /*pickedColor*/ ctx[10];
    	}

    	if (/*backdropColor*/ ctx[14] !== void 0) {
    		toolbox_props.backdropColor = /*backdropColor*/ ctx[14];
    	}

    	toolbox = new Toolbox({ props: toolbox_props, $$inline: true });
    	binding_callbacks.push(() => bind(toolbox, "pickedColor", toolbox_pickedColor_binding));
    	binding_callbacks.push(() => bind(toolbox, "backdropColor", toolbox_backdropColor_binding));
    	toolbox.$on("pickColor", /*pickColor_handler*/ ctx[27]);

    	desktop = new Desktop({
    			props: {
    				backdropColor: /*backdropColor*/ ctx[14],
    				legacy: /*settings*/ ctx[4].theme,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	desktop.$on("dragover", dragover_handler);
    	desktop.$on("drop", /*handleFilesSelect*/ ctx[20]);

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
    			attr_dev(div0, "class", "backdrop-bg backdrop-top svelte-fd7l68");
    			add_location(div0, file_1, 269, 1, 7020);
    			attr_dev(div1, "class", "backdrop-bg backdrop-right svelte-fd7l68");
    			add_location(div1, file_1, 270, 1, 7067);
    			attr_dev(div2, "class", "backdrop-bg backdrop-bottom svelte-fd7l68");
    			add_location(div2, file_1, 271, 1, 7116);
    			attr_dev(div3, "class", "backdrop-bg backdrop-left svelte-fd7l68");
    			add_location(div3, file_1, 272, 1, 7166);
    			attr_dev(div4, "class", "backdrop svelte-fd7l68");
    			toggle_class(div4, "legacy", /*settings*/ ctx[4].theme);
    			add_location(div4, file_1, 268, 0, 6965);
    			attr_dev(main, "class", "svelte-fd7l68");
    			toggle_class(main, "legacy", /*settings*/ ctx[4].theme);
    			add_location(main, file_1, 275, 0, 7223);
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
    				dispose = listen_dev(window, "paste", /*handlePaste*/ ctx[21], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*settings*/ 16) {
    				toggle_class(div4, "legacy", /*settings*/ ctx[4].theme);
    			}

    			const titlebar_changes = {};
    			if (dirty[0] & /*file*/ 1) titlebar_changes.fileSelected = /*file*/ ctx[0];
    			if (dirty[0] & /*settingsOpen*/ 32) titlebar_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			if (dirty[0] & /*settings*/ 16) titlebar_changes.overwrite = /*settings*/ ctx[4].overwrite;
    			if (dirty[0] & /*settings*/ 16) titlebar_changes.legacy = /*settings*/ ctx[4].theme;
    			if (dirty[0] & /*settings*/ 16) titlebar_changes.tips = /*settings*/ ctx[4].tooltips;
    			titlebar.$set(titlebar_changes);
    			const toolbox_changes = {};
    			if (dirty[0] & /*settingsOpen*/ 32) toolbox_changes.settingsOpen = /*settingsOpen*/ ctx[5];
    			if (dirty[0] & /*file*/ 1) toolbox_changes.fileSelected = /*file*/ ctx[0];
    			if (dirty[0] & /*settings*/ 16) toolbox_changes.legacy = /*settings*/ ctx[4].theme;
    			if (dirty[0] & /*settings*/ 16) toolbox_changes.tips = /*settings*/ ctx[4].tooltips;

    			if (!updating_pickedColor && dirty[0] & /*pickedColor*/ 1024) {
    				updating_pickedColor = true;
    				toolbox_changes.pickedColor = /*pickedColor*/ ctx[10];
    				add_flush_callback(() => updating_pickedColor = false);
    			}

    			if (!updating_backdropColor && dirty[0] & /*backdropColor*/ 16384) {
    				updating_backdropColor = true;
    				toolbox_changes.backdropColor = /*backdropColor*/ ctx[14];
    				add_flush_callback(() => updating_backdropColor = false);
    			}

    			toolbox.$set(toolbox_changes);
    			const desktop_changes = {};
    			if (dirty[0] & /*backdropColor*/ 16384) desktop_changes.backdropColor = /*backdropColor*/ ctx[14];
    			if (dirty[0] & /*settings*/ 16) desktop_changes.legacy = /*settings*/ ctx[4].theme;

    			if (dirty[0] & /*zoomed, pickingmode, instance, width, height, mouseincanvas, pickedColor, chosenColor, render, zoomscale, m, file, settings, proxySettings, recents, settingsOpen*/ 114687 | dirty[1] & /*$$scope*/ 2048) {
    				desktop_changes.$$scope = { dirty, ctx };
    			}

    			desktop.$set(desktop_changes);

    			if (dirty[0] & /*settings*/ 16) {
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

    function getMousePos(canvas, evt, rect) {
    	return {
    		x: evt.clientX - rect.left,
    		y: evt.clientY - rect.top
    	};
    }

    function scaleNumber(num, oldRange, newRange) {
    	var a = oldRange[0], b = oldRange[1], c = newRange[0], d = newRange[1];
    	return (b * c - a * d) / (b - a) + num * (d / (b - a));
    }

    const dragover_handler = e => {
    	e.preventDefault();
    };

    function instance_1($$self, $$props, $$invalidate) {
    	let render;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	var HTMLParser = require("node-html-parser");
    	const { ipcRenderer } = require("electron");
    	let file = false;
    	let width;
    	let height;
    	let zoomed = false;
    	let settings = {};
    	let settingsOpen = false;
    	let defaultDims;
    	let pickingmode = false;
    	let proxySettings;
    	let recents;
    	let initUpdate = 0;
    	let instance;
    	let version = "4.0.29";
    	let pickedColor;
    	let chosenColor;
    	let mouseincanvas = false;
    	let zoomscale = 1;
    	let backdropColor = "#2F2E33";
    	let readablefiletypes = ["img", "png", "bmp", "gif", "jpeg", "jpg", "psd", "tif", "tiff", "dng", "webp"];
    	let m = { x: 0, y: 0 };

    	function handleCursor(event) {
    		$$invalidate(15, m.x = event.clientX, m);
    		$$invalidate(15, m.y = event.clientY, m);
    	}

    	ipcRenderer.on("recents", (event, arg) => {
    		$$invalidate(8, recents = arg);
    	});

    	ipcRenderer.on("settings", (event, arg) => {
    		if (settings.zoom && settings.zoom != arg.zoom && instance) {
    			let element = document.querySelector(".canvas-container-inner");
    			initPan(element, arg.zoom);
    		}

    		$$invalidate(4, settings = arg);
    		initUpdate++;

    		if (initUpdate < 2) {
    			console.log("REPEATED UPDATE FAILED!", initUpdate);
    			$$invalidate(7, proxySettings = settings);
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
    		$$invalidate(9, instance = Panzoom(element, {
    			maxScale: 10000,
    			step: customZoom || settings.zoom
    		}));

    		element.parentElement.addEventListener("wheel", instance.zoomWithWheel);

    		element.addEventListener("panzoomchange", event => {
    			/*
    if (pickingmode) {
    	event.preventDefault();
    	console.log("pcikingmode change");
    }*/
    			$$invalidate(13, zoomscale = Number(event.detail.scale).toFixed(1));

    			if (event.detail.scale >= 10) $$invalidate(3, zoomed = true); else $$invalidate(3, zoomed = false);
    		});
    	}

    	

    	function verifyCompatibility(url) {
    		for (var i = 0; i < readablefiletypes.length; i++) {
    			if (url.toLowerCase().endsWith(readablefiletypes[i])) return true;
    		}

    		return false;
    	}

    	function handleMousemove(e) {
    		if (!pickingmode) return;
    		$$invalidate(12, mouseincanvas = true);
    		var canvas = e.srcElement;
    		var ctx = canvas.getContext("2d");
    		var positionInfo = canvas.getBoundingClientRect();

    		//console.log("POSINFO", positionInfo);
    		var mousePos = getMousePos(canvas, e, positionInfo);

    		var newWidth = scaleNumber(mousePos.x, [0, positionInfo.width], [0, width]);
    		var newHeight = scaleNumber(mousePos.y, [0, positionInfo.height], [0, height]);
    		var imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
    		var pixel = imageData.data;
    		"rgba(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ", " + pixel[3] + ")";
    		$$invalidate(11, chosenColor = tinycolor({ r: pixel[0], g: pixel[1], b: pixel[2] }).toHexString());
    	}

    	function handleFilesSelect(e) {
    		if (!settings.overwrite && file || settingsOpen) return;

    		//console.log(e.dataTransfer.files);
    		//console.log(e.dataTransfer.files);
    		const acceptedFiles = Array.from(e.dataTransfer.files);

    		const acceptedItems = Array.from(e.dataTransfer.items);

    		if (acceptedFiles.length > 0) {
    			ipcRenderer.send("file", acceptedFiles[0].path);
    		} else if (acceptedItems.length > 0) {
    			let items = e.dataTransfer;
    			let testHTML = items.getData("text/html");

    			if (testHTML) {
    				console.log("GOT HTML!", testHTML);

    				//gotten HTML, likely an IMG tag
    				let image = HTMLParser.parse(testHTML).querySelector("img");

    				let url = HTMLParser.parse(testHTML).querySelector("a");
    				console.log(image, url, "test123");

    				if (image) {
    					let srctext = image.getAttribute("src");
    					console.log("extracted src", srctext);

    					if (srctext.toLowerCase().startsWith("data")) {
    						ipcRenderer.send("file", srctext);
    					} else if (srctext.toLowerCase().startsWith("http")) {
    						console.log("got html, sending");
    						ipcRenderer.send("file", srctext);
    					}
    				} else if (url) {
    					let srctext = url.getAttribute("href");
    					ipcRenderer.send("file", srctext);
    				}
    			} else {
    				let text = items.getData("text");
    				console.log("hi idk lmao", text);
    				ipcRenderer.send("file", text);
    			}
    		} else {
    			let items = e.dataTransfer;
    			let text = items.getData("text");
    			console.log(text, "gotten text");
    		} //HANDLE URL, DATA, AND WHATEVER ERRORS HERE
    	}

    	img.onload = function () {
    		$$invalidate(1, width = img.width);
    		$$invalidate(2, height = img.height);
    	};

    	ipcRenderer.on("deliver", (event, arg) => {
    		console.log("loading file!");
    		$$invalidate(22, img.src = arg, img);
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
    		getIMG(blob);
    	}

    	function getIMG(blob) {
    		console.log("preparing img");
    		var a = new FileReader();

    		a.onload = function (e) {
    			$$invalidate(22, img.src = e.target.result, img);
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
    		$$invalidate(14, backdropColor = "#2F2E33");

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

    	function toolbox_pickedColor_binding(value) {
    		pickedColor = value;
    		$$invalidate(10, pickedColor);
    	}

    	function toolbox_backdropColor_binding(value) {
    		backdropColor = value;
    		$$invalidate(14, backdropColor);
    	}

    	const pickColor_handler = e => {
    		$$invalidate(6, pickingmode = true);
    		instance.setOptions({ disablePan: true });
    	};

    	const settingsOpen_handler_1 = e => {
    		$$invalidate(5, settingsOpen = e.detail);
    	};

    	const mouseenter_handler = () => {
    		$$invalidate(12, mouseincanvas = true);
    	};

    	const mouseleave_handler = () => {
    		$$invalidate(12, mouseincanvas = false);
    	};

    	const click_handler = () => {
    		if (pickingmode) {
    			$$invalidate(6, pickingmode = false);
    			instance.setOptions({ disablePan: false });
    			$$invalidate(10, pickedColor = chosenColor);
    			console.log("COLOR UPDATE!", pickedColor);
    		}
    	};

    	const click_handler_1 = () => {
    		setTimeout(
    			() => {
    				if (pickingmode) {
    					$$invalidate(6, pickingmode = false);
    					instance.setOptions({ disablePan: false });
    				}
    			},
    			100
    		);
    	};

    	const select_handler = e => {
    		alert("woop");
    	};

    	$$self.$capture_state = () => ({
    		Titlebar,
    		Desktop,
    		Toolbox,
    		Menu,
    		Dropfield,
    		Cursor,
    		Zoomscale,
    		tinycolor,
    		HTMLParser,
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
    		defaultDims,
    		pickingmode,
    		proxySettings,
    		recents,
    		initUpdate,
    		instance,
    		version,
    		pickedColor,
    		chosenColor,
    		mouseincanvas,
    		zoomscale,
    		backdropColor,
    		readablefiletypes,
    		m,
    		handleCursor,
    		img,
    		initPan,
    		verifyCompatibility,
    		getMousePos,
    		scaleNumber,
    		handleMousemove,
    		handleFilesSelect,
    		handlePaste,
    		getIMG,
    		render
    	});

    	$$self.$inject_state = $$props => {
    		if ("HTMLParser" in $$props) HTMLParser = $$props.HTMLParser;
    		if ("file" in $$props) $$invalidate(0, file = $$props.file);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("zoomed" in $$props) $$invalidate(3, zoomed = $$props.zoomed);
    		if ("settings" in $$props) $$invalidate(4, settings = $$props.settings);
    		if ("settingsOpen" in $$props) $$invalidate(5, settingsOpen = $$props.settingsOpen);
    		if ("defaultDims" in $$props) defaultDims = $$props.defaultDims;
    		if ("pickingmode" in $$props) $$invalidate(6, pickingmode = $$props.pickingmode);
    		if ("proxySettings" in $$props) $$invalidate(7, proxySettings = $$props.proxySettings);
    		if ("recents" in $$props) $$invalidate(8, recents = $$props.recents);
    		if ("initUpdate" in $$props) initUpdate = $$props.initUpdate;
    		if ("instance" in $$props) $$invalidate(9, instance = $$props.instance);
    		if ("version" in $$props) $$invalidate(17, version = $$props.version);
    		if ("pickedColor" in $$props) $$invalidate(10, pickedColor = $$props.pickedColor);
    		if ("chosenColor" in $$props) $$invalidate(11, chosenColor = $$props.chosenColor);
    		if ("mouseincanvas" in $$props) $$invalidate(12, mouseincanvas = $$props.mouseincanvas);
    		if ("zoomscale" in $$props) $$invalidate(13, zoomscale = $$props.zoomscale);
    		if ("backdropColor" in $$props) $$invalidate(14, backdropColor = $$props.backdropColor);
    		if ("readablefiletypes" in $$props) readablefiletypes = $$props.readablefiletypes;
    		if ("m" in $$props) $$invalidate(15, m = $$props.m);
    		if ("img" in $$props) $$invalidate(22, img = $$props.img);
    		if ("render" in $$props) $$invalidate(16, render = $$props.render);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*img*/ 4194304) {
    			$$invalidate(16, render = ({ context }) => {
    				try {
    					context.drawImage(img, 0, 0);
    					let element = document.querySelector(".canvas-container-inner");
    					initPan(element);
    				} catch(e) {
    					console.log("errrrr", e);
    				}
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
    		pickingmode,
    		proxySettings,
    		recents,
    		instance,
    		pickedColor,
    		chosenColor,
    		mouseincanvas,
    		zoomscale,
    		backdropColor,
    		m,
    		render,
    		version,
    		handleCursor,
    		handleMousemove,
    		handleFilesSelect,
    		handlePaste,
    		img,
    		clear_handler,
    		settingsOpen_handler,
    		toolbox_pickedColor_binding,
    		toolbox_backdropColor_binding,
    		pickColor_handler,
    		settingsOpen_handler_1,
    		mouseenter_handler,
    		mouseleave_handler,
    		click_handler,
    		click_handler_1,
    		select_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance_1, create_fragment, safe_not_equal, {}, [-1, -1]);

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
