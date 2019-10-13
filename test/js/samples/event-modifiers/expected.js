import {
	SvelteComponent,
	append,
	detach,
	element,
	init,
	insert,
	listen,
	noop,
	prevent_default,
	run_all,
	safe_not_equal,
	space,
	stop_propagation
} from "svelte/internal";

function create_fragment(ctx) {
	let div;
	let button0;
	let t1;
	let button1;
	let t3;
	let button2;
	let dispose;

	return {
		c() {
			div = element("div");
			button0 = element("button");
			button0.textContent = "click me";
			t1 = space();
			button1 = element("button");
			button1.textContent = "or me";
			t3 = space();
			button2 = element("button");
			button2.textContent = "or me!";
			dispose = [
				listen(button0, "click", stop_propagation(prevent_default(handleClick))),
				listen(button1, "click", handleClick, { once: true, capture: true }),
				listen(button2, "click", handleClick, true),
				listen(div, "touchstart", handleTouchstart, { passive: true })
			];
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button0);
			append(div, t1);
			append(div, button1);
			append(div, t3);
			append(div, button2);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			run_all(dispose);
		}
	};
}

function handleTouchstart() {

}

function handleClick() {

}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, []);
	}
}

export default Component;