/* generated by Svelte vX.Y.Z */
import { assign, callAll, init, noop, proto } from "svelte/shared.js";

var Nested = window.Nested;

function create_main_fragment(component, ctx) {

	var nested_initial_data = { foo: "bar" };
	var nested = new Nested({
		root: component.root,
		store: component.store,
		data: nested_initial_data
	});

	return {
		c() {
			nested._fragment.c();
		},

		m(target, anchor) {
			nested._mount(target, anchor);
		},

		p: noop,

		d(detach) {
			nested.destroy(detach);
		}
	};
}

function SvelteComponent(options) {
	init(this, options);
	this._state = assign({}, options.data);
	this._intro = true;

	if (!options.root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment(this, this._state);

	if (options.target) {
		this._fragment.c();
		this._mount(options.target, options.anchor);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(SvelteComponent.prototype, proto);
export default SvelteComponent;