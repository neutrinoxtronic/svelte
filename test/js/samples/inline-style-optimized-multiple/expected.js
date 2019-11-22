/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	set_style
} from "svelte/internal";

function create_fragment(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			set_style(div, "color", ctx[0]);
			set_style(div, "transform", "translate(" + ctx[1] + "px," + ctx[2] + "px)");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /* _id9uocqrtmw00_1_ */ 1) {
				set_style(div, "color", ctx[0]);
			}

			if (dirty & /* _id9uocqrtmw00_1_ */ 6) {
				set_style(div, "transform", "translate(" + ctx[1] + "px," + ctx[2] + "px)");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { color } = $$props;
	let { x } = $$props;
	let { y } = $$props;

	$$self.$set = $$props => {
		if ("color" in $$props) $$invalidate(0, color = $$props.color);
		if ("x" in $$props) $$invalidate(1, x = $$props.x);
		if ("y" in $$props) $$invalidate(2, y = $$props.y);
	};

	return [color, x, y];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { color: 0, x: 1, y: 2 });
	}
}

export default Component;