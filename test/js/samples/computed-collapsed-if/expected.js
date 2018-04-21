/* generated by Svelte vX.Y.Z */
import { Component, assign, noop } from "svelte/shared.js";

function a({ x }) {
	return x * 2;
}

function b({ x }) {
	return x * 3;
}

function create_main_fragment(component, state) {

	return {
		c: noop,

		m: noop,

		p: noop,

		u: noop,

		d: noop
	};
}

class SvelteComponent extends Component {
	constructor(options) {
		super(options);
		this._state = assign({}, options.data);
		this._recompute({ x: 1 }, this._state);

		this._fragment = create_main_fragment(this, this._state);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	_recompute(changed, state) {
		if (changed.x) {
			if (this._differs(state.a, (state.a = a(state)))) changed.a = true;
			if (this._differs(state.b, (state.b = b(state)))) changed.b = true;
		}
	}
}
export default SvelteComponent;