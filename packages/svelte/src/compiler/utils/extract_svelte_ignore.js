import fuzzymatch from '../phases/1-parse/utils/fuzzymatch.js';
import * as w from '../warnings.js';

const regex_svelte_ignore = /^\s*svelte-ignore\s/;

/** @type {Record<string, string>} */
const replacements = {
	'non-top-level-reactive-declaration': 'reactive_declaration_invalid_placement'
};

/**
 * @param {number} offset
 * @param {string} text
 * @param {boolean} runes
 * @returns {string[]}
 */
export function extract_svelte_ignore(offset, text, runes) {
	const match = regex_svelte_ignore.exec(text);
	if (!match) return [];

	let length = match[0].length;
	offset += length;

	/** @type {string[]} */
	const ignores = [];

	for (const match of text.slice(length).matchAll(/\S+/gm)) {
		const code = match[0];

		ignores.push(code);

		if (!w.codes.includes(code)) {
			const replacement = replacements[code] ?? code.replace(/-/g, '_');

			if (runes) {
				const start = offset + match.index;
				const end = start + code.length;

				const suggestion = w.codes.includes(replacement) ? replacement : fuzzymatch(code, w.codes);

				w.unknown_code({ start, end }, code, suggestion);
			} else if (w.codes.includes(replacement)) {
				ignores.push(replacement);
			}
		}
	}

	return ignores;
}
