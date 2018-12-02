/* generated by Svelte vX.Y.Z-alpha1 */
import { SvelteComponent as SvelteComponent_1, createElement, detachNode, flush, init, insert, run, safe_not_equal, setStyle } from "svelte/internal.js";

function create_fragment(component, ctx) {
	var div, current;

	return {
		c() {
			div = createElement("div");
			setStyle(div, "color", ctx.color);
		},

		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},

		p(changed, ctx) {
			if (changed.color) {
				setStyle(div, "color", ctx.color);
			}
		},

		i(target, anchor) {
			if (current) return;
			this.m(target, anchor);
		},

		o: run,

		d(detach) {
			if (detach) {
				detachNode(div);
			}
		}
	};
}

function define($$self, $$props) {
	let { color } = $$props;

	$$self.$$.get = () => ({ color });

	$$self.$$.set = $$props => {
		if ('color' in $$props) color = $$props.color;
	};
}

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, define, create_fragment, safe_not_equal);
	}

	get color() {
		return this.$$.get().color;
	}

	set color(value) {
		this.$set({ color: value });
		flush();
	}
}

export default SvelteComponent;