import { EFFECT_TRANSPARENT } from '../../constants.js';
import { branch, block, destroy_effect } from '../../reactivity/effects.js';

/**
 * @template {(node: import('#client').TemplateNode, ...args: any[]) => import('#client').Dom} SnippetFn
 * @param {() => SnippetFn | null | undefined} get_snippet
 * @param {import('#client').TemplateNode} node
 * @param {(() => any)[]} args
 * @returns {void}
 */
export function snippet(get_snippet, node, ...args) {
	/** @type {SnippetFn | null | undefined} */
	var snippet;

	/** @type {import('#client').Effect | null} */
	var snippet_effect;

	block(() => {
		if (snippet === (snippet = get_snippet())) return;

		if (snippet_effect) {
			destroy_effect(snippet_effect);
			snippet_effect = null;
		}

		if (snippet) {
			snippet_effect = branch(() => /** @type {SnippetFn} */ (snippet)(node, ...args));
		}
	}, EFFECT_TRANSPARENT);
}

const snippet_symbol = Symbol.for('svelte.snippet');

/**
 * @param {any} fn
 */
export function add_snippet_symbol(fn) {
	fn[snippet_symbol] = true;
	return fn;
}

/**
 * Returns true if given parameter is a snippet.
 * @param {any} maybeSnippet
 * @returns {maybeSnippet is import('svelte').Snippet}
 */
export function is_snippet(maybeSnippet) {
	return /** @type {any} */ (maybeSnippet)?.[snippet_symbol] === true;
}
