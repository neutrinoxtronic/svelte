/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	add_render_callback,
	append,
	detach,
	element,
	init,
	insert,
	listen,
	noop,
	safe_not_equal,
	set_data,
	text
} from "svelte/internal";

function create_fragment(ctx) {
	let scrolling = false;

	let clear_scrolling = () => {
		scrolling = false;
	};

	let scrolling_timeout;
	let p;
	let t0;
	let t1;
	let dispose;
	add_render_callback(ctx[1]);

	return {
		c() {
			p = element("p");
			t0 = text("scrolled to ");
			t1 = text(ctx[0]);

			dispose = listen(window, "scroll", () => {
				scrolling = true;
				clearTimeout(scrolling_timeout);
				scrolling_timeout = setTimeout(clear_scrolling, 100);
				ctx[1]();
			});
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
		},
		p(ctx, [dirty]) {
			if (dirty & /* _id9uocqrtmw00_1_ */ 1 && !scrolling) {
				scrolling = true;
				clearTimeout(scrolling_timeout);
				scrollTo(window.pageXOffset, ctx[0]);
				scrolling_timeout = setTimeout(clear_scrolling, 100);
			}

			if (dirty & /* _id9uocqrtmw00_1_ */ 1) set_data(t1, ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(p);
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { y } = $$props;

	function onwindowscroll() {
		$$invalidate(0, y = window.pageYOffset)
	}

	$$self.$set = $$props => {
		if ("y" in $$props) $$invalidate(0, y = $$props.y);
	};

	return [y, onwindowscroll];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { y: 0 });
	}
}

export default Component;