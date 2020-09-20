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
	text
} from "svelte/internal";

function create_fragment(ctx) {
	let button;
	let t1;
	let p;
	let t2;
	let t3_value = /*things*/ ctx[0].length + "";
	let t3;
	let dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "foo";
			t1 = space();
			p = element("p");
			t2 = text("number of things: ");
			t3 = text(t3_value);
		},
		m(target, anchor, remount) {
			insert(target, button, anchor);
			insert(target, t1, anchor);
			insert(target, p, anchor);
			append(p, t2);
			append(p, t3);
			if (remount) dispose();
			dispose = listen(button, "click", /*click_handler*/ ctx[1]);
		},
		p(ctx, [dirty]) {
			if (dirty & /*things*/ 1 && t3_value !== (t3_value = /*things*/ ctx[0].length + "")) set_data(t3, t3_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(button);
			if (detaching) detach(t1);
			if (detaching) detach(p);
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let things = [];

	const click_handler = () => {
		things.push(1);
		$$invalidate(0, things);
	};

	return [things, click_handler];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

export default Component;