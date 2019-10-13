import { create_ssr_component, debug, each, escape } from "svelte/internal";

const Component = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { things } = $$props;
	let { foo } = $$props;
	if ($$props.things === void 0 && $$bindings.things && things !== void 0) $$bindings.things(things);
	if ($$props.foo === void 0 && $$bindings.foo && foo !== void 0) $$bindings.foo(foo);

	return `${each(things, thing => `<span>${escape(thing.name)}</span>
	${debug(null, 7, 2, { foo })}`)}

<p>foo: ${escape(foo)}</p>`;
});

export default Component;