import remapper from '@ampproject/remapping';
import { decode as sourcemap_decode } from 'sourcemap-codec';
import { getLocator } from 'locate-character';
import { StringWithSourcemap, sourcemap_add_offset } from '../utils/string_with_sourcemap';


export interface Processed {
	code: string;
	map?: object | string;
	dependencies?: string[];
}

export interface PreprocessorGroup {
	markup?: (options: {
		content: string;
		filename: string;
	}) => Processed | Promise<Processed>;
	style?: Preprocessor;
	script?: Preprocessor;
}

export type Preprocessor = (options: {
	content: string;
	attributes: Record<string, string | boolean>;
	filename?: string;
}) => Processed | Promise<Processed>;

function parse_attributes(str: string) {
	const attrs = {};
	str.split(/\s+/).filter(Boolean).forEach(attr => {
		const p = attr.indexOf('=');
		if (p === -1) {
			attrs[attr] = true;
		} else {
			attrs[attr.slice(0, p)] = `'"`.includes(attr[p + 1]) ?
				attr.slice(p + 2, -1) :
				attr.slice(p + 1);
		}
	});
	return attrs;
}

interface Replacement {
	offset: number;
	length: number;
	replacement: StringWithSourcemap;
}

export default async function preprocess(
	source: string,
	preprocessor: PreprocessorGroup | PreprocessorGroup[],
	options?: { filename?: string }
) {
	// @ts-ignore todo: doublecheck
	const filename = (options && options.filename) || preprocessor.filename; // legacy
	const dependencies = [];

	const preprocessors = Array.isArray(preprocessor) ? preprocessor : [preprocessor];

	const markup = preprocessors.map(p => p.markup).filter(Boolean);
	const script = preprocessors.map(p => p.script).filter(Boolean);
	const style = preprocessors.map(p => p.style).filter(Boolean);

	const sourcemap_list: Array<Processed['map']> = [];

	let get_location: ReturnType<typeof getLocator>;

	function get_replacement(
		offset: number,
		original: string,
		processed: Processed,
		prefix: string,
		suffix: string
	): StringWithSourcemap {
		const generated_prefix = StringWithSourcemap.from_source(
			filename, prefix, get_location(offset));
		const generated_suffix = StringWithSourcemap.from_source(
			filename, suffix, get_location(offset + prefix.length + original.length));

		let generated;
		if (processed.map) {
			const full_map = typeof processed.map === "string" ? JSON.parse(processed.map) : processed.map;
			const decoded_map = { ...full_map, mappings: sourcemap_decode(full_map.mappings) };
			const processed_offset = get_location(offset + prefix.length);
			generated = StringWithSourcemap.from_generated(processed.code, sourcemap_add_offset(processed_offset, decoded_map));
		} else {
			generated = StringWithSourcemap.from_generated(processed.code);
		}
		const map = generated_prefix.concat(generated).concat(generated_suffix);
		return map;
	}

	async function replace_async(
		str: string,
		re: RegExp,
		func: (...any) => Promise<StringWithSourcemap>
	): Promise<StringWithSourcemap> {
		const replacement_promises: Array<Promise<Replacement>> = [];
		str.replace(re, (...args) => {
			replacement_promises.push(
				func(...args).then(
					(replacement) =>
						({
							offset: args[args.length - 2],
							length: args[0].length,
							replacement
						}) as Replacement
				)
			);
			return '';
		});
		const replacements = await Promise.all(replacement_promises);

		let out: StringWithSourcemap;
		let last_end = 0;
		for (const { offset, length, replacement } of replacements) {
			// content = source before replacement
			const content = StringWithSourcemap.from_source(
				filename, str.slice(last_end, offset), get_location(last_end));
			out = out ? out.concat(content) : content;
			out = out.concat(replacement);
			last_end = offset + length;
		}
		// final_content = source after last replacement
		const final_content = StringWithSourcemap.from_source(
			filename, str.slice(last_end), get_location(last_end));
		out = out.concat(final_content);
		return out;
	}

	for (const fn of markup) {

		// run markup preprocessor
		const processed = await fn({
			content: source,
			filename
		});

		if (processed && processed.dependencies) {
			dependencies.push(...processed.dependencies);
		}
		source = processed ? processed.code : source;
		if (processed && processed.map) {
			sourcemap_list.unshift(processed.map);
		}
	}

	for (const fn of script) {
		get_location = getLocator(source);
		const res = await replace_async(
			source,
			/<!--[^]*?-->|<script(\s[^]*?)?(?:>([^]*?)<\/script>|\/>)/gi,
			async (match, attributes = '', content, offset) => {
				const no_change = () => StringWithSourcemap.from_source(
					filename, match, get_location(offset));
				if (!attributes && !content) {
					return no_change();
				}
				attributes = attributes || '';

				// run script preprocessor
				const processed = await fn({
					content,
					attributes: parse_attributes(attributes),
					filename
				});

				if (!processed) {
					return no_change();
				}
				if (processed.dependencies) {
					dependencies.push(...processed.dependencies);
				}
				return get_replacement(
					offset, content, processed,
					`<script${attributes}>`, `</script>`
				);
			}
		);
		source = res.generated;
		sourcemap_list.unshift(res.get_sourcemap());
	}

	for (const fn of style) {
		get_location = getLocator(source);
		const res = await replace_async(
			source,
			/<!--[^]*?-->|<style(\s[^]*?)?(?:>([^]*?)<\/style>|\/>)/gi,
			async (match, attributes = '', content, offset) => {
				const no_change = () => StringWithSourcemap.from_source(
					filename, match, get_location(offset));
				if (!attributes && !content) {
					return no_change();
				}

				// run style preprocessor
				const processed: Processed = await fn({
					content,
					attributes: parse_attributes(attributes),
					filename
				});

				if (!processed) {
					return no_change();
				}
				if (processed.dependencies) {
					dependencies.push(...processed.dependencies);
				}
				return get_replacement(
					offset, content, processed,
					`<style${attributes}>`, `</style>`
				);
			}
		);

		source = res.generated;
		sourcemap_list.unshift(res.get_sourcemap());
	}

	const map: ReturnType<typeof remapper> =
		sourcemap_list.length == 0
			? null
			: remapper(sourcemap_list as any, () => null);

	return {
		// TODO return separated output, in future version where svelte.compile supports it:
		// style: { code: styleCode, map: styleMap },
		// script { code: scriptCode, map: scriptMap },
		// markup { code: markupCode, map: markupMap },

		code: source,
		dependencies: [...new Set(dependencies)],
		map,
		toString() {
			return source;
		}
	};
}
