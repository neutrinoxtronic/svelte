/* generated by Svelte vX.Y.Z */
import { SvelteComponent as SvelteComponent_1, append, createSvgElement, createText, detachNode, identity, init, insert, noop, safe_not_equal } from "svelte/internal";

function create_fragment($$, ctx) {
	var svg, title, text;

	return {
		c() {
			svg = createSvgElement("svg");
			title = createSvgElement("title");
			text = createText("a title");
		},

		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, title);
			append(title, text);
		},

		p: noop,
		i: noop,
		o: noop,

		d(detach) {
			if (detach) {
				detachNode(svg);
			}
		}
	};
}

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, identity, create_fragment, safe_not_equal);
	}
}

export default SvelteComponent;