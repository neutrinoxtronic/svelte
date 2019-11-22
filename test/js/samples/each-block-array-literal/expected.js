/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	append,
	destroy_each,
	detach,
	element,
	empty,
	init,
	insert,
	noop,
	safe_not_equal,
	set_data,
	text
} from "svelte/internal";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

// (9:0) {#each [a, b, c, d, e] as num}
function create_each_block(ctx) {
	let span;
	let t_value = ctx[5] + "";
	let t;

	return {
		c() {
			span = element("span");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /* _id9uocqrtmw00_1_ */ 31 && t_value !== (t_value = ctx[5] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment(ctx) {
	let each_1_anchor;
	let each_value = [ctx[0], ctx[1], ctx[2], ctx[3], ctx[4]];
	let each_blocks = [];

	for (let i = 0; i < 5; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			for (let i = 0; i < 5; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < 5; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /* _id9uocqrtmw00_1_ */ 31) {
				each_value = [ctx[0], ctx[1], ctx[2], ctx[3], ctx[4]];
				let i;

				for (i = 0; i < 5; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < 5; i += 1) {
					each_blocks[i].d(1);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { a } = $$props;
	let { b } = $$props;
	let { c } = $$props;
	let { d } = $$props;
	let { e } = $$props;

	$$self.$set = $$props => {
		if ("a" in $$props) $$invalidate(0, a = $$props.a);
		if ("b" in $$props) $$invalidate(1, b = $$props.b);
		if ("c" in $$props) $$invalidate(2, c = $$props.c);
		if ("d" in $$props) $$invalidate(3, d = $$props.d);
		if ("e" in $$props) $$invalidate(4, e = $$props.e);
	};

	return [a, b, c, d, e];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { a: 0, b: 1, c: 2, d: 3, e: 4 });
	}
}

export default Component;