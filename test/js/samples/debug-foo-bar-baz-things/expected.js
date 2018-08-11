/* generated by Svelte vX.Y.Z */
import { append, assign, createElement, createText, destroyEach, detachNode, init, insert, proto, setData } from "svelte/shared.js";

function create_main_fragment(component, ctx) {
	var text, p, text_1, text_2;

	var each_value = ctx.things;

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			text = createText("\n\n");
			p = createElement("p");
			text_1 = createText("foo: ");
			text_2 = createText(ctx.foo);
		},

		m(target, anchor) {
			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, text, anchor);
			insert(target, p, anchor);
			append(p, text_1);
			append(p, text_2);
		},

		p(changed, ctx) {
			if (changed.things) {
				each_value = ctx.things;

				for (var i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(component, child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(text.parentNode, text);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (changed.foo) {
				setData(text_2, ctx.foo);
			}
		},

		d(detach) {
			destroyEach(each_blocks, detach);

			if (detach) {
				detachNode(text);
				detachNode(p);
			}
		}
	};
}

// (1:0) {#each things as thing}
function create_each_block(component, ctx) {
	var span, text_value = ctx.thing.name, text, text_1;

	return {
		c() {
			span = createElement("span");
			text = createText(text_value);
			text_1 = createText("\n\t");

			const { foo, bar, baz, thing } = ctx;
			console.log({ foo, bar, baz, thing });
			debugger;
		},

		m(target, anchor) {
			insert(target, span, anchor);
			append(span, text);
			insert(target, text_1, anchor);
		},

		p(changed, ctx) {
			if ((changed.things) && text_value !== (text_value = ctx.thing.name)) {
				setData(text, text_value);
			}

			if (changed.foo || changed.bar || changed.baz || changed.things) {
				const { foo, bar, baz, thing } = ctx;
				console.log({ foo, bar, baz, thing });
				debugger;
			}
		},

		d(detach) {
			if (detach) {
				detachNode(span);
				detachNode(text_1);
			}
		}
	};
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.thing = list[i];
	child_ctx.each_value = list;
	child_ctx.thing_index = i;
	return child_ctx;
}

function SvelteComponent(options) {
	init(this, options);
	this._state = assign({}, options.data);
	this._intro = true;

	this._fragment = create_main_fragment(this, this._state);

	if (options.target) {
		this._fragment.c();
		this._mount(options.target, options.anchor);
	}
}

assign(SvelteComponent.prototype, proto);
export default SvelteComponent;