/* generated by Svelte vX.Y.Z */
import { SvelteComponent as SvelteComponent_1, identity, init, noop, safe_not_equal } from "svelte/internal";

function create_fragment($$, ctx) {
	return {
		c: noop,
		m: noop,
		p: noop,
		i: noop,
		o: noop,
		d: noop
	};
}

const SOME_CONSTANT = 42;

function foo(bar) {
	console.log(bar);
}

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, identity, create_fragment, safe_not_equal);
	}

	get foo() {
		return foo;
	}
}

export default SvelteComponent;
export { SOME_CONSTANT };