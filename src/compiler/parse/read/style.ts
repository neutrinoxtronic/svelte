import parse from 'css-tree/lib/parser/index.js';
import { walk } from 'estree-walker';
import { Parser } from '../index';
import { Node } from 'estree';
import { Style } from '../../interfaces';
import { css_errors, template_errors } from '../errors';

export default function read_style(parser: Parser, start: number, attributes: Node[]): Style {
	const content_start = parser.index;
	const error_message = template_errors.unclosed_style();

	const styles = parser.read_until(/<\/style\s*>/, error_message);

	if (parser.index >= parser.template.length) {
		parser.error(error_message);
	}

	const content_end = parser.index;

	let ast;

	try {
		ast = parse(styles, {
			positions: true,
			offset: content_start,
			onParseError(error) {
				throw error;
			}
		});
	} catch (err) {
		if (err.name === 'SyntaxError') {
			parser.error(css_errors.syntax_error(err.message), err.offset);
		} else {
			throw err;
		}
	}

	ast = JSON.parse(JSON.stringify(ast));

	// tidy up AST
	walk(ast, {
		enter: (node: any) => { // `any` because this isn't an ESTree node
			// replace `ref:a` nodes
			if (node.type === 'Selector') {
				for (let i = 0; i < node.children.length; i += 1) {
					const a = node.children[i];
					const b = node.children[i + 1];

					if (is_ref_selector(a, b)) {
						parser.error(css_errors.invalid_ref_selector(), a.loc.start.offset);
					}
				}
			}

			if (node.type === 'Declaration' && node.value.type === 'Value' && node.value.children.length === 0) {
				parser.error(css_errors.invalid_declaration(), node.start);
			}

			if (node.type === 'PseudoClassSelector' && node.name === 'global' && node.children === null) {
				parser.error(css_errors.empty_global_selector(), node.loc.start.offset);
			}

			if (node.loc) {
				node.start = node.loc.start.offset;
				node.end = node.loc.end.offset;
				delete node.loc;
			}
		}
	});

	parser.read(/<\/style\s*>/);
	const end = parser.index;

	return {
		type: 'Style',
		start,
		end,
		attributes,
		children: ast.children,
		content: {
			start: content_start,
			end: content_end,
			styles
		}
	};
}

function is_ref_selector(a: any, b: any) { // TODO add CSS node types
	if (!b) return false;

	return (
		a.type === 'TypeSelector' &&
		a.name === 'ref' &&
		b.type === 'PseudoClassSelector'
	);
}
