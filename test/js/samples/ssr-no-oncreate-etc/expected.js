import { create_ssr_component } from "svelte/internal";
import { onDestroy, onMount } from "svelte";

function preload(input) {
	return output;
}

function foo() {
	console.log("foo");
}

function swipe(node, callback) {

}

const Component = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	onMount(() => {
		console.log("onMount");
	});

	onDestroy(() => {
		console.log("onDestroy");
	});

	return ``;
});

export default Component;
export { preload };