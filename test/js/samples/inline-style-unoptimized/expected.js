/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent as SvelteComponent_1,
	create_text,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal
} from "svelte/internal";

function create_fragment(ctx) {
	var div0, t, div1, div1_style_value;

	return {
		c() {
			div0 = element("div");
			t = create_text("\n");
			div1 = element("div");
			div0.style.cssText = ctx.style;
			div1.style.cssText = div1_style_value = "" + ctx.key + ": " + ctx.value;
		},

		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t, anchor);
			insert(target, div1, anchor);
		},

		p(changed, ctx) {
			if (changed.style) {
				div0.style.cssText = ctx.style;
			}

			if ((changed.key || changed.value) && div1_style_value !== (div1_style_value = "" + ctx.key + ": " + ctx.value)) {
				div1.style.cssText = div1_style_value;
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(div0);
				detach(t);
				detach(div1);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { style, key, value } = $$props;

	$$self.$set = $$props => {
		if ('style' in $$props) $$invalidate('style', style = $$props.style);
		if ('key' in $$props) $$invalidate('key', key = $$props.key);
		if ('value' in $$props) $$invalidate('value', value = $$props.value);
	};

	return { style, key, value };
}

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["style", "key", "value"]);
	}
}

export default SvelteComponent;