import { create_ssr_component } from "svelte/internal";

const Component = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	return `<div>content</div>

<div>more content</div>`;
});

export default Component;