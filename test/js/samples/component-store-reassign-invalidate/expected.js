/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	append,
	detach,
	element,
	init,
	insert,
	listen,
	noop,
	safe_not_equal,
	set_data,
	space,
	subscribe,
	text
} from "svelte/internal";

import { writable } from "svelte/store";

function create_fragment(ctx) {
	let h1;
	let t0;
	let t1;
	let button;
	let dispose;

	return {
		c() {
			h1 = element("h1");
			t0 = text(ctx[1]);
			t1 = space();
			button = element("button");
			button.textContent = "reset";
			dispose = listen(button, "click", ctx[2]);
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			append(h1, t0);
			insert(target, t1, anchor);
			insert(target, button, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /* _id9uocqrtmw00_1_ */ 2) set_data(t0, ctx[1]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(button);
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $foo,
		$$unsubscribe_foo = noop,
		$$subscribe_foo = () => ($$unsubscribe_foo(), $$unsubscribe_foo = subscribe(foo, $$value => $$invalidate(1, $foo = $$value)), foo);

	$$self.$$.on_destroy.push(() => $$unsubscribe_foo());
	let foo = writable(0);
	$$subscribe_foo();
	const click_handler = () => $$subscribe_foo($$invalidate(0, foo = writable(0)));
	return [foo, $foo, click_handler];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

export default Component;