/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent as SvelteComponent_1,
	append,
	create_text,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal
} from "svelte/internal";

function create_fragment(ctx) {
	var h1, t0, t1, t2;

	return {
		c() {
			h1 = element("h1");
			t0 = create_text("Hello ");
			t1 = create_text(name);
			t2 = create_text("!");
		},

		m(target, anchor) {
			insert(target, h1, anchor);
			append(h1, t0);
			append(h1, t1);
			append(h1, t2);
		},

		p: noop,
		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(h1);
			}
		}
	};
}

let name = 'world';

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, []);
	}
}

export default SvelteComponent;