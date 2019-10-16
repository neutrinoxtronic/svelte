import {
	SvelteComponent,
	attr,
	detach,
	element,
	empty,
	init,
	insert,
	noop,
	safe_not_equal
} from "svelte/internal";

function create_if_block(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "divider");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment(ctx) {
	let show_if = ctx.item.divider && ctx.item.divider.includes(1);
	let if_block_anchor;
	let if_block = show_if && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance($$self) {
	let item = { divider: [1] };
	return { item };
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, []);
	}
}

export default Component;