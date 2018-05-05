/* generated by Svelte vX.Y.Z */
import { appendNode, assign, createElement, createText, detachNode, init, insertNode, proto } from "svelte/shared.js";

function data() {
	return { foo: 42 }
};

function add_css() {
	var style = createElement("style");
	style.id = 'svelte-1a7i8ec-style';
	style.textContent = "p.svelte-1a7i8ec{color:red}";
	appendNode(style, document.head);
}

function create_main_fragment(component, ctx) {
	var p, text;

	return {
		c() {
			p = createElement("p");
			text = createText(ctx.foo);
			p.className = "svelte-1a7i8ec";
		},

		m(target, anchor) {
			insertNode(p, target, anchor);
			appendNode(text, p);
		},

		p(changed, ctx) {
			if (changed.foo) {
				text.data = ctx.foo;
			}
		},

		d(detach) {
			if (detach) {
				detachNode(p);
			}
		}
	};
}

function SvelteComponent(options) {
	init(this, options);
	this._state = assign(data(), options.data);

	if (!document.getElementById("svelte-1a7i8ec-style")) add_css();

	this._fragment = create_main_fragment(this, this._state);

	if (options.target) {
		this._fragment.c();
		this._mount(options.target, options.anchor);
	}
}

assign(SvelteComponent.prototype, proto);
export default SvelteComponent;