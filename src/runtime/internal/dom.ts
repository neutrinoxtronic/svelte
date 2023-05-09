import { ResizeObserverSingleton } from './ResizeObserverSingleton.js';
import { contenteditable_truthy_values, has_prop } from './utils';
// Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
// at the end of hydration without touching the remaining nodes.
let is_hydrating = false;

/**
 * @returns {void} */
export function start_hydrating() {
    is_hydrating = true;
}

/**
 * @returns {void} */
export function end_hydrating() {
    is_hydrating = false;
}

/**
 * @param {number} low
 * @param {number} high
 * @param {(index: number) => number} key
 * @param {number} value
 * @returns {number}
 */
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

/**
 * @param {NodeEx} target
 * @returns {void}
 */
function init_hydrate(target) {
    if (target.hydrate_init)
        return;
    target.hydrate_init = true;
    // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>

 /**
  * @type {ArrayLike<NodeEx2>} */
    let children = target.childNodes;
    // If target is <head>, there may be children without claim_order
    if (target.nodeName === 'HEAD') {
        const myChildren = [];
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            if (node.claim_order !== undefined) {
                myChildren.push(node);
            }
        }
        children = myChildren;
    }
    /*
     * Reorder claimed children optimally.
     * We can reorder claimed children optimally by finding the longest subsequence of
     * nodes that are already claimed in order and only moving the rest. The longest
     * subsequence of nodes that are claimed in order can be found by
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
        // with fast path for when we are on the current longest subsequence
        const seqLen = (longest > 0 && children[m[longest]].claim_order <= current
            ? longest + 1
            : upper_bound(1, longest, (idx) => children[m[idx]].claim_order, current)) - 1;
        p[i] = m[seqLen] + 1;
        const newLen = seqLen + 1;
        // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
        m[newLen] = i;
        longest = Math.max(newLen, longest);
    }
    // The longest increasing subsequence of nodes (initially reversed)

 /**
  * @type {NodeEx2[]} */
    const lis = [];
    // The rest of the nodes, nodes that will be moved

 /**
  * @type {NodeEx2[]} */
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

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
export function append(target, node) {
    target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
export function append_styles(target, style_sheet_id, styles) {
    const append_styles_to = get_root_for_style(target);
    if (!append_styles_to.getElementById(style_sheet_id)) {
        const style = element('style');
        style.id = style_sheet_id;
        style.textContent = styles;
        append_stylesheet(append_styles_to, style);
    }
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
export function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}

/**
 * @param {Node} node
 * @returns {CSSStyleSheet}
 */
export function append_empty_stylesheet(node) {
    const style_element = element('style');
    // For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
    // these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
    // Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
    // So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
    // The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
    style_element.textContent = '/* empty */';
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}

/**
 * @param {NodeEx} target
 * @param {NodeEx} node
 * @returns {void}
 */
export function append_hydration(target, node) {
    if (is_hydrating) {
        init_hydrate(target);
        if (target.actual_end_child === undefined ||
            (target.actual_end_child !== null && target.actual_end_child.parentNode !== target)) {
            target.actual_end_child = target.firstChild;
        }
        // Skip nodes of undefined ordering
        while (target.actual_end_child !== null && target.actual_end_child.claim_order === undefined) {
            target.actual_end_child = target.actual_end_child.nextSibling;
        }
        if (node !== target.actual_end_child) {
            // We only insert if the ordering of this node should be modified or the parent node is not target
            if (node.claim_order !== undefined || node.parentNode !== target) {
                target.insertBefore(node, target.actual_end_child);
            }
        }
        else {
            target.actual_end_child = node.nextSibling;
        }
    }
    else if (node.parentNode !== target || node.nextSibling !== null) {
        target.appendChild(node);
    }
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} anchor
 * @returns {void}
 */
export function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}

/**
 * @param {NodeEx} target
 * @param {NodeEx} node
 * @param {NodeEx} anchor
 * @returns {void}
 */
export function insert_hydration(target, node, anchor) {
    if (is_hydrating && !anchor) {
        append_hydration(target, node);
    }
    else if (node.parentNode !== target || node.nextSibling != anchor) {
        target.insertBefore(node, anchor || null);
    }
}

/**
 * @param {Node} node
 * @returns {void}
 */
export function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

/**
 * @returns {void} */
export function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}

/**
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
export function element(name) {
    return document.createElement(name);
}

/**
 * @param {K} name
 * @param {string} is
 * @returns {HTMLElementTagNameMap[K]}
 */
export function element_is(name, is) {
    return document.createElement(name, { is });
}

/**
 * @param {T} obj
 * @param {K[]} exclude
 * @returns {Pick<T, Exclude<keyof T, K>>}
 */
export function object_without_properties(obj, exclude) {
    const target = {};
    for (const k in obj) {
        if (has_prop(obj, k) &&
            // @ts-ignore
            exclude.indexOf(k) === -1) {
            // @ts-ignore
            target[k] = obj[k];
        }
    }
    return target;
}

/**
 * @param {K} name
 * @returns {SVGElement}
 */
export function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
export function text(data) {
    return document.createTextNode(data);
}

/**
 * @returns {Text} */
export function space() {
    return text(' ');
}

/**
 * @returns {Text} */
export function empty() {
    return text('');
}

/**
 * @param {string} content
 * @returns {Comment}
 */
export function comment(content) {
    return document.createComment(content);
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} options
 * @returns {() => void}
 */
export function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}

/**
 * @returns {(event: any) => any} */
export function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}

/**
 * @returns {(event: any) => any} */
export function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}

/**
 * @returns {(event: any) => any} */
export function stop_immediate_propagation(fn) {
    return function (event) {
        event.stopImmediatePropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}

/**
 * @returns {(event: any) => void} */
export function self(fn) {
    return function (event) {
        // @ts-ignore
        if (event.target === this)
            fn.call(this, event);
    };
}

/**
 * @returns {(event: any) => void} */
export function trusted(fn) {
    return function (event) {
        // @ts-ignore
        if (event.isTrusted)
            fn.call(this, event);
    };
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} value
 * @returns {void}
 */
export function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
/**
 * List of attributes that should always be set through the attr method,
 * because updating them through the property setter doesn't work reliably.
 * In the example of `width`/`height`, the problem is that the setter only
 * accepts numeric values, but the attribute can also be set to a string like `50%`.
 * If this list becomes too big, rethink this approach.
 */
const always_set_through_set_attribute = ['width', 'height'];

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {{ [x: string]: string }} attributes
 * @returns {void}
 */
export function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] &&
            descriptors[key].set &&
            always_set_through_set_attribute.indexOf(key) === -1) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {{ [x: string]: string }} attributes
 * @returns {void}
 */
export function set_svg_attributes(node, attributes) {
    for (const key in attributes) {
        attr(node, key, attributes[key]);
    }
}

/**
 * @param {Record<string, unknown>} data_map
 * @returns {void}
 */
export function set_custom_element_data_map(node, data_map) {
    Object.keys(data_map).forEach((key) => {
        set_custom_element_data(node, key, data_map[key]);
    });
}

/**
 * @returns {void} */
export function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    }
    else {
        attr(node, prop, value);
    }
}

/**
 * @param {string} tag
 * @returns {Class<import>}
 */
export function set_dynamic_element_data(tag) {
    return /-/.test(tag) ? set_custom_element_data_map : set_attributes;
}

/**
 * @returns {void} */
export function xlink_attr(node, attribute, value) {
    node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
}

/**
 * @param {HTMLElement} node
 * @returns {string}
 */
export function get_svelte_dataset(node) {
    return node.dataset.svelteH;
}

/**
 * @returns {unknown[]} */
export function get_binding_group_value(group, __value, checked) {
    const value = new Set();
    for (let i = 0; i < group.length; i += 1) {
        if (group[i].checked)
            value.add(group[i].__value);
    }
    if (!checked) {
        value.delete(__value);
    }
    return Array.from(value);
}

/**
 * @param {HTMLInputElement[]} group
 * @returns {{ p(...inputs: HTMLInputElement[]): void; r(): void; }}
 */
export function init_binding_group(group) {

 /**
  * @type {HTMLInputElement[]} */
    let _inputs;
    return {
        /* push */ p(...inputs) {
            _inputs = inputs;
            _inputs.forEach((input) => group.push(input));
        },
        /* remove */ r() {
            _inputs.forEach((input) => group.splice(group.indexOf(input), 1));
        }
    };
}

/**
 * @param {number[]} indexes
 * @returns {{ u(new_indexes: number[]): void; p(...inputs: HTMLInputElement[]): void; r: () => void; }}
 */
export function init_binding_group_dynamic(group, indexes) {

 /**
  * @type {HTMLInputElement[]} */
    let _group = get_binding_group(group);

 /**
  * @type {HTMLInputElement[]} */
    let _inputs;

 /**
  * @returns {any} */
    function get_binding_group(group) {
        for (let i = 0; i < indexes.length; i++) {
            group = group[indexes[i]] = group[indexes[i]] || [];
        }
        return group;
    }

 /**
  * @returns {void} */
    function push() {
        _inputs.forEach((input) => _group.push(input));
    }

 /**
  * @returns {void} */
    function remove() {
        _inputs.forEach((input) => _group.splice(_group.indexOf(input), 1));
    }
    return {
        /* update */ u(new_indexes) {
            indexes = new_indexes;
            const new_group = get_binding_group(group);
            if (new_group !== _group) {
                remove();
                _group = new_group;
                push();
            }
        },
        /* push */ p(...inputs) {
            _inputs = inputs;
            push();
        },
        /* remove */ r: remove
    };
}

/**
 * @returns {number} */
export function to_number(value) {
    return value === '' ? null : +value;
}

/**
 * @returns {any[]} */
export function time_ranges_to_array(ranges) {
    const array = [];
    for (let i = 0; i < ranges.length; i += 1) {
        array.push({ start: ranges.start(i), end: ranges.end(i) });
    }
    return array;
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
export function children(element) {
    return Array.from(element.childNodes);
}

/**
 * @param {ChildNodeArray} nodes
 * @returns {void}
 */
function init_claim_info(nodes) {
    if (nodes.claim_info === undefined) {
        nodes.claim_info = { last_index: 0, total_claimed: 0 };
    }
}

/**
 * @param {ChildNodeArray} nodes
 * @param {(node: ChildNodeEx) => node is R} predicate
 * @param {(node: ChildNodeEx) => ChildNodeEx | undefined} processNode
 * @param {() => R} createNode
 * @param {boolean} dontUpdateLastIndex
 * @returns {R}
 */
function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
    // Try to find nodes in an order such that we lengthen the longest increasing subsequence
    init_claim_info(nodes);
    const resultNode = (() => {
        // We first try to find an element after the previous one
        for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
            const node = nodes[i];
            if (predicate(node)) {
                const replacement = processNode(node);
                if (replacement === undefined) {
                    nodes.splice(i, 1);
                }
                else {
                    nodes[i] = replacement;
                }
                if (!dontUpdateLastIndex) {
                    nodes.claim_info.last_index = i;
                }
                return node;
            }
        }
        // Otherwise, we try to find one before
        // We iterate in reverse so that we don't go too far back
        for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
            const node = nodes[i];
            if (predicate(node)) {
                const replacement = processNode(node);
                if (replacement === undefined) {
                    nodes.splice(i, 1);
                }
                else {
                    nodes[i] = replacement;
                }
                if (!dontUpdateLastIndex) {
                    nodes.claim_info.last_index = i;
                }
                else if (replacement === undefined) {
                    // Since we spliced before the last_index, we decrease it
                    nodes.claim_info.last_index--;
                }
                return node;
            }
        }
        // If we can't find any matching node, we create a new one
        return createNode();
    })();
    resultNode.claim_order = nodes.claim_info.total_claimed;
    nodes.claim_info.total_claimed += 1;
    return resultNode;
}

/**
 * @param {ChildNodeArray} nodes
 * @param {string} name
 * @param {{ [key: string]: boolean }} attributes
 * @param {(name: string) => Element | SVGElement} create_element
 * @returns {Element | SVGElement}
 */
function claim_element_base(nodes, name, attributes, create_element) {
    return claim_node(nodes, (node) => node.nodeName === name, (node) => {
        const remove = [];
        for (let j = 0; j < node.attributes.length; j++) {
            const attribute = node.attributes[j];
            if (!attributes[attribute.name]) {
                remove.push(attribute.name);
            }
        }
        remove.forEach((v) => node.removeAttribute(v));
        return undefined;
    }, () => create_element(name));
}

/**
 * @param {ChildNodeArray} nodes
 * @param {string} name
 * @param {{ [key: string]: boolean }} attributes
 * @returns {Element | SVGElement}
 */
export function claim_element(nodes, name, attributes) {
    return claim_element_base(nodes, name, attributes, element);
}

/**
 * @param {ChildNodeArray} nodes
 * @param {string} name
 * @param {{ [key: string]: boolean }} attributes
 * @returns {Element | SVGElement}
 */
export function claim_svg_element(nodes, name, attributes) {
    return claim_element_base(nodes, name, attributes, svg_element);
}

/**
 * @param {ChildNodeArray} nodes
 * @returns {Text}
 */
export function claim_text(nodes, data) {
    return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
        const dataStr = '' + data;
        if (node.data.startsWith(dataStr)) {
            if (node.data.length !== dataStr.length) {
                return node.splitText(dataStr.length);
            }
        }
        else {
            node.data = dataStr;
        }
    }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
    );
}

/**
 * @returns {Text} */
export function claim_space(nodes) {
    return claim_text(nodes, ' ');
}

/**
 * @param {ChildNodeArray} nodes
 * @returns {Comment}
 */
export function claim_comment(nodes, data) {
    return claim_node(nodes, (node) => node.nodeType === 8, (node) => {
        node.data = '' + data;
        return undefined;
    }, () => comment(data), true);
}

/**
 * @returns {any} */
function find_comment(nodes, text, start) {
    for (let i = start; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeType === 8 /* comment node */ && node.textContent.trim() === text) {
            return i;
        }
    }
    return nodes.length;
}

/**
 * @param {boolean} is_svg
 * @returns {import("C:/repos/svelte/svelte/dom.ts-to-jsdoc").HtmlTagHydration}
 */
export function claim_html_tag(nodes, is_svg) {
    // find html opening tag
    const start_index = find_comment(nodes, 'HTML_TAG_START', 0);
    const end_index = find_comment(nodes, 'HTML_TAG_END', start_index);
    if (start_index === end_index) {
        return new HtmlTagHydration(undefined, is_svg);
    }
    init_claim_info(nodes);
    const html_tag_nodes = nodes.splice(start_index, end_index - start_index + 1);
    detach(html_tag_nodes[0]);
    detach(html_tag_nodes[html_tag_nodes.length - 1]);
    const claimed_nodes = html_tag_nodes.slice(1, html_tag_nodes.length - 1);
    for (const n of claimed_nodes) {
        n.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
    }
    return new HtmlTagHydration(claimed_nodes, is_svg);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
export function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
export function set_data_contenteditable(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    text.data = data;
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @param {string} attr_value
 * @returns {void}
 */
export function set_data_maybe_contenteditable(text, data, attr_value) {
    if (~contenteditable_truthy_values.indexOf(attr_value)) {
        set_data_contenteditable(text, data);
    }
    else {
        set_data(text, data);
    }
}

/**
 * @returns {void} */
export function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}

/**
 * @returns {void} */
export function set_input_type(input, type) {
    try {
        input.type = type;
    }
    catch (e) {
        // do nothing
    }
}

/**
 * @returns {void} */
export function set_style(node, key, value, important) {
    if (value == null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}

/**
 * @returns {void} */
export function select_option(select, value, mounting) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
    if (!mounting || value !== undefined) {
        select.selectedIndex = -1; // no option should be selected
    }
}

/**
 * @returns {void} */
export function select_options(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        option.selected = ~value.indexOf(option.__value);
    }
}

/**
 * @returns {any} */
export function select_value(select) {
    const selected_option = select.querySelector(':checked');
    return selected_option && selected_option.__value;
}

/**
 * @returns {any} */
export function select_multiple_value(select) {
    return [].map.call(select.querySelectorAll(':checked'), (option) => option.__value);
}
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead

/**
 * @type {boolean} */
let crossorigin;

/**
 * @returns {boolean} */
export function is_crossorigin() {
    if (crossorigin === undefined) {
        crossorigin = false;
        try {
            if (typeof window !== 'undefined' && window.parent) {
                void window.parent.document;
            }
        }
        catch (error) {
            crossorigin = true;
        }
    }
    return crossorigin;
}

/**
 * @param {HTMLElement} node
 * @param {() => void} fn
 * @returns {() => void}
 */
export function add_iframe_resize_listener(node, fn) {
    const computed_style = getComputedStyle(node);
    if (computed_style.position === 'static') {
        node.style.position = 'relative';
    }
    const iframe = element('iframe');
    iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
        'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    const crossorigin = is_crossorigin();

 /**
  * @type {() => void} */
    let unsubscribe;
    if (crossorigin) {
        iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
        unsubscribe = listen(window, 'message', (event) => {
            if (event.source === iframe.contentWindow)
                fn();
        });
    }
    else {
        iframe.src = 'about:blank';
        iframe.onload = () => {
            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            // make sure an initial resize event is fired _after_ the iframe is loaded (which is asynchronous)
            // see https://github.com/sveltejs/svelte/issues/4233
            fn();
        };
    }
    append(node, iframe);
    return () => {
        if (crossorigin) {
            unsubscribe();
        }
        else if (unsubscribe && iframe.contentWindow) {
            unsubscribe();
        }
        detach(iframe);
    };
}
export const resize_observer_content_box = /* @__PURE__ */ new ResizeObserverSingleton({
    box: 'content-box'
});
export const resize_observer_border_box = /* @__PURE__ */ new ResizeObserverSingleton({
    box: 'border-box'
});
export const resize_observer_device_pixel_content_box = /* @__PURE__ */ new ResizeObserverSingleton({ box: 'device-pixel-content-box' });
export { ResizeObserverSingleton };

/**
 * @returns {void} */
export function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}

/**
 * @param {string} type
 * @param {T} detail
 * @returns {CustomEvent<T>}
 */
export function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {

 /**
  * @type {CustomEvent<T>} */
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

/**
 * @param {string} selector
 * @param {HTMLElement} parent
 * @returns {ChildNodeArray}
 */
export function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}

/**
 * @param {string} nodeId
 * @param {HTMLElement} head
 * @returns {any[]}
 */
export function head_selector(nodeId, head) {
    const result = [];
    let started = 0;
    for (const node of head.childNodes) {
        if (node.nodeType === 8 /* comment node */) {
            const comment = node.textContent.trim();
            if (comment === `HEAD_${nodeId}_END`) {
                started -= 1;
                result.push(node);
            }
            else if (comment === `HEAD_${nodeId}_START`) {
                started += 1;
                result.push(node);
            }
        }
        else if (started > 0) {
            result.push(node);
        }
    }
    return result;
}
/** */
export class HtmlTag {

 /**
  * @private
     * @default false
     */
    is_svg = false;
    // parent for creating node
    /** */
    e = undefined;
    // html tag nodes
    /** */
    n = undefined;
    // target
    /** */
    t = undefined;
    // anchor
    /** */
    a = undefined;
    constructor(is_svg = false) {
        this.is_svg = is_svg;
        this.e = this.n = null;
    }

 /**
  * @param {string} html
     * @returns {void}
     */
    c(html) {
        this.h(html);
    }

 /**
  * @param {string} html
     * @param {HTMLElement | SVGElement} target
     * @param {HTMLElement | SVGElement} anchor
     * @returns {void}
     */
    m(html, target, anchor = null) {
        if (!this.e) {
            if (this.is_svg)
                this.e = svg_element(target.nodeName);
            /** #7364  target for <template> may be provided as #document-fragment(11) */ else
                this.e = element((target.nodeType === 11 ? 'TEMPLATE' : target.nodeName));
            this.t = target.tagName !== 'TEMPLATE' ? target : target.content;
            this.c(html);
        }
        this.i(anchor);
    }

 /**
  * @param {string} html
     * @returns {void}
     */
    h(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.nodeName === 'TEMPLATE'
            ? this.e.content.childNodes
            : this.e.childNodes);
    }

 /**
  * @returns {void} */
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(this.t, this.n[i], anchor);
        }
    }

 /**
  * @param {string} html
     * @returns {void}
     */
    p(html) {
        this.d();
        this.h(html);
        this.i(this.a);
    }

 /**
  * @returns {void} */
    d() {
        this.n.forEach(detach);
    }
}

/**
 * @extends HtmlTag */
export class HtmlTagHydration extends HtmlTag {
    // hydration claimed nodes
    /** */
    l = undefined;
    constructor(claimed_nodes, is_svg = false) {
        super(is_svg);
        this.e = this.n = null;
        this.l = claimed_nodes;
    }

 /**
  * @param {string} html
     * @returns {void}
     */
    c(html) {
        if (this.l) {
            this.n = this.l;
        }
        else {
            super.c(html);
        }
    }

 /**
  * @returns {void} */
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert_hydration(this.t, this.n[i], anchor);
        }
    }
}

/**
 * @param {NamedNodeMap} attributes
 * @returns {{}}
 */
export function attribute_to_object(attributes) {
    const result = {};
    for (const attribute of attributes) {
        result[attribute.name] = attribute.value;
    }
    return result;
}

/**
 * @param {HTMLElement} element
 * @returns {{}}
 */
export function get_custom_elements_slots(element) {
    const result = {};
    element.childNodes.forEach((node) => {
        result[node.slot || 'default'] = true;
    });
    return result;
}

/**
 * @returns {any} */
export function construct_svelte_component(component, props) {
    return new component(props);
}


/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */
/** @typedef {ChildNode & NodeEx} ChildNodeEx */
/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		
 * 		last_index: number;
 * 		
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

