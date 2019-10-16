import {
	SvelteComponent,
	append,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	text
} from "svelte/internal";

function create_fragment(ctx) {
	let b;
	let t_value = get_answer() + "";
	let t;

	return {
		c() {
			b = element("b");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, b, anchor);
			append(b, t);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(b);
		}
	};
}

const ANSWER = 42;

function get_answer() {
	return ANSWER;
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, []);
	}
}

export default Component;