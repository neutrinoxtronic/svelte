/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	append,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	set_data,
	text
} from "svelte/internal";

import { onMount } from "svelte";

function create_fragment(ctx) {
	let p;
	let t;

	return {
		c() {
			p = element("p");
			t = text(/*y*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},
		p(ctx, [dirty]) {
			if (dirty & /*y*/ 1) set_data(t, /*y*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(p);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let a = 1, b = 2, c = 3;

	onMount(() => {
		const interval = setInterval(
			() => {
				$$invalidate(1, b += 1);
				c += 1;
				console.log(b, c);
			},
			1000
		);

		return () => clearInterval(interval);
	});

	let x;
	let y;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*b*/ 2) {
			$: $$invalidate(0, y = b * 2);
		}
	};

	$: x = a * 2;
	return [y];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {}, noop);
	}
}

export default Component;