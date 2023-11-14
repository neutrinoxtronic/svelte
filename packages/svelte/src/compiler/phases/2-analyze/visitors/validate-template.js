import { error } from '../../../errors.js';
import { is_text_attribute } from '../../../utils/ast.js';
import { warn } from '../../../warnings.js';
import fuzzymatch from '../../1-parse/utils/fuzzymatch.js';
import { binding_properties } from '../../bindings.js';
import { SVGElements } from '../../constants.js';
import { is_custom_element_node } from '../../nodes.js';
import { regex_not_whitespace, regex_only_whitespaces } from '../../patterns.js';
import { validate_no_const_assignment } from '../utils.js';

/**
 * @param {import('#compiler').Component | import('#compiler').SvelteComponent | import('#compiler').SvelteSelf} node
 * @param {import('../types').Context} context
 */
function validate_component(node, context) {
	for (const attribute of node.attributes) {
		if (
			attribute.type !== 'Attribute' &&
			attribute.type !== 'SpreadAttribute' &&
			attribute.type !== 'LetDirective' &&
			attribute.type !== 'OnDirective' &&
			attribute.type !== 'BindDirective'
		) {
			error(attribute, 'invalid-component-directive');
		}
	}

	context.next({
		...context.state,
		parent_element: null,
		component_slots: new Set()
	});
}

/**
 * @param {import('#compiler').RegularElement | import('#compiler').SvelteElement} node
 * @param {import('../types').Context} context
 */
function validate_element(node, context) {
	for (const attribute of node.attributes) {
		if (
			attribute.type === 'Attribute' &&
			attribute.name === 'is' &&
			context.state.options.namespace !== 'foreign'
		) {
			warn(context.state.analysis.warnings, attribute, context.path, 'avoid-is');
		}
		if (attribute.type === 'Attribute' && attribute.name === 'slot') {
			/** @type {import('#compiler').RegularElement | import('#compiler').SvelteElement | import('#compiler').Component | import('#compiler').SvelteComponent | import('#compiler').SvelteSelf | undefined} */
			validate_slot_attribute(context, attribute);
		}
	}
}

/**
 * @param {import('../types').Context} context
 * @param {import('#compiler').Attribute} attribute
 */
function validate_slot_attribute(context, attribute) {
	let owner = undefined;

	let i = context.path.length;
	while (i--) {
		const ancestor = context.path[i];
		if (
			!owner &&
			(ancestor.type === 'Component' ||
				ancestor.type === 'SvelteComponent' ||
				ancestor.type === 'SvelteSelf' ||
				ancestor.type === 'SvelteElement' ||
				(ancestor.type === 'RegularElement' && is_custom_element_node(ancestor)))
		) {
			owner = ancestor;
		}
	}

	if (owner) {
		if (!is_text_attribute(attribute)) {
			error(attribute, 'invalid-slot-attribute');
		}

		if (owner.type === 'Component' || owner.type === 'SvelteComponent') {
			if (owner !== context.path.at(-2)) {
				error(attribute, 'invalid-slot-placement');
			}
		}

		const name = attribute.value[0].data;
		if (context.state.component_slots.has(name)) {
			error(attribute, 'duplicate-slot-name', name, owner.name);
		}
		context.state.component_slots.add(name);

		if (name === 'default') {
			for (const node of owner.fragment.nodes) {
				if (node.type === 'Text' && regex_only_whitespaces.test(node.data)) {
					continue;
				}

				if (node.type === 'RegularElement' || node.type === 'SvelteFragment') {
					if (node.attributes.some((a) => a.type === 'Attribute' && a.name === 'slot')) {
						continue;
					}
				}

				error(node, 'invalid-default-slot-content');
			}
		}
	} else {
		error(attribute, 'invalid-slot-placement');
	}
}

// https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
const implied_end_tags = ['dd', 'dt', 'li', 'option', 'optgroup', 'p', 'rp', 'rt'];

/**
 * @param {string} tag
 * @param {string} parent_tag
 * @returns {boolean}
 */
function is_tag_valid_with_parent(tag, parent_tag) {
	// First, let's check if we're in an unusual parsing mode...
	switch (parent_tag) {
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
		case 'select':
			return tag === 'option' || tag === 'optgroup' || tag === '#text';
		case 'optgroup':
			return tag === 'option' || tag === '#text';
		// Strictly speaking, seeing an <option> doesn't mean we're in a <select>
		// but
		case 'option':
			return tag === '#text';
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
		// No special behavior since these rules fall back to "in body" mode for
		// all except special table nodes which cause bad parsing behavior anyway.

		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
		case 'tr':
			return (
				tag === 'th' || tag === 'td' || tag === 'style' || tag === 'script' || tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
		case 'tbody':
		case 'thead':
		case 'tfoot':
			return tag === 'tr' || tag === 'style' || tag === 'script' || tag === 'template';
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
		case 'colgroup':
			return tag === 'col' || tag === 'template';
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
		case 'table':
			return (
				tag === 'caption' ||
				tag === 'colgroup' ||
				tag === 'tbody' ||
				tag === 'tfoot' ||
				tag === 'thead' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
		case 'head':
			return (
				tag === 'base' ||
				tag === 'basefont' ||
				tag === 'bgsound' ||
				tag === 'link' ||
				tag === 'meta' ||
				tag === 'title' ||
				tag === 'noscript' ||
				tag === 'noframes' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
		case 'html':
			return tag === 'head' || tag === 'body' || tag === 'frameset';
		case 'frameset':
			return tag === 'frame';
		case '#document':
			return tag === 'html';
	}

	// Probably in the "in body" parsing mode, so we outlaw only tag combos
	// where the parsing rules cause implicit opens or closes to be added.
	// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
	switch (tag) {
		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6':
			return (
				parent_tag !== 'h1' &&
				parent_tag !== 'h2' &&
				parent_tag !== 'h3' &&
				parent_tag !== 'h4' &&
				parent_tag !== 'h5' &&
				parent_tag !== 'h6'
			);

		case 'rp':
		case 'rt':
			return implied_end_tags.indexOf(parent_tag) === -1;

		case 'body':
		case 'caption':
		case 'col':
		case 'colgroup':
		case 'frameset':
		case 'frame':
		case 'head':
		case 'html':
		case 'tbody':
		case 'td':
		case 'tfoot':
		case 'th':
		case 'thead':
		case 'tr':
			// These tags are only valid with a few parents that have special child
			// parsing rules -- if we're down here, then none of those matched and
			// so we allow it only if we don't know what the parent is, as all other
			// cases are invalid.
			return parent_tag == null;
	}

	return true;
}

/**
 * @type {import('../types').Visitors}
 */
export const validate_template = {
	Attribute(node) {
		if (node.name.startsWith('on') && node.name.length > 2) {
			if (node.value === true || is_text_attribute(node) || node.value.length > 1) {
				error(node, 'invalid-event-attribute-value');
			}
		}
	},
	BindDirective(node, context) {
		validate_no_const_assignment(node, node.expression, context.state.scope, true);

		let left = node.expression;
		while (left.type === 'MemberExpression') {
			left = /** @type {import('estree').MemberExpression} */ (left.object);
		}

		if (left.type !== 'Identifier') {
			error(node, 'invalid-binding-expression');
		}

		if (
			node.expression.type === 'Identifier' &&
			node.name !== 'this' // bind:this also works for regular variables
		) {
			const binding = context.state.scope.get(left.name);
			// reassignment
			if (
				!binding ||
				(binding.kind !== 'state' &&
					binding.kind !== 'prop' &&
					binding.kind !== 'each' &&
					binding.kind !== 'store_sub' &&
					!binding.mutated)
			) {
				error(node.expression, 'invalid-binding-value');
			}

			// TODO handle mutations of non-state/props in runes mode
		}

		if (node.name === 'group') {
			const binding = context.state.scope.get(left.name);
			if (!binding) {
				error(node, 'INTERNAL', 'Cannot find declaration for bind:group');
			}
		}

		const parent = context.path.at(-1);

		if (
			parent?.type === 'RegularElement' ||
			parent?.type === 'SvelteElement' ||
			parent?.type === 'SvelteWindow' ||
			parent?.type === 'SvelteDocument' ||
			parent?.type === 'SvelteBody'
		) {
			if (context.state.options.namespace === 'foreign' && node.name !== 'this') {
				error(
					node,
					'invalid-binding',
					node.name,
					undefined,
					'. Foreign elements only support bind:this'
				);
			}

			if (node.name in binding_properties) {
				const property = binding_properties[node.name];
				if (property.valid_elements && !property.valid_elements.includes(parent.name)) {
					error(
						node,
						'invalid-binding',
						node.name,
						property.valid_elements.map((valid_element) => `<${valid_element}>`).join(', ')
					);
				}

				if (parent.name === 'input') {
					const type = /** @type {import('#compiler').Attribute | undefined} */ (
						parent.attributes.find((a) => a.type === 'Attribute' && a.name === 'type')
					);
					if (type && !is_text_attribute(type)) {
						error(type, 'invalid-type-attribute');
					}

					if (node.name === 'checked' && type?.value[0].data !== 'checkbox') {
						error(node, 'invalid-binding', node.name, '<input type="checkbox">');
					}

					if (node.name === 'files' && type?.value[0].data !== 'file') {
						error(node, 'invalid-binding', node.name, '<input type="file">');
					}
				}

				if (parent.name === 'select') {
					const multiple = parent.attributes.find(
						(a) =>
							a.type === 'Attribute' &&
							a.name === 'multiple' &&
							!is_text_attribute(a) &&
							a.value !== true
					);
					if (multiple) {
						error(multiple, 'invalid-multiple-attribute');
					}
				}

				if (node.name === 'offsetWidth' && SVGElements.includes(parent.name)) {
					error(
						node,
						'invalid-binding',
						node.name,
						`non-<svg> elements. Use 'clientWidth' for <svg> instead`
					);
				}
			} else {
				const match = fuzzymatch(node.name, Object.keys(binding_properties));
				if (match) {
					const property = binding_properties[match];
					if (!property.valid_elements || property.valid_elements.includes(parent.name)) {
						error(node, 'invalid-binding', node.name, undefined, ` (did you mean '${match}'?)`);
					}
				}
				error(node, 'invalid-binding', node.name);
			}
		}
	},
	RegularElement(node, context) {
		if (node.name === 'textarea' && node.fragment.nodes.length > 0) {
			for (const attribute of node.attributes) {
				if (attribute.type === 'Attribute' && attribute.name === 'value') {
					error(node, 'invalid-textarea-content');
				}
			}
		}

		validate_element(node, context);

		if (context.state.parent_element) {
			if (!is_tag_valid_with_parent(node.name, context.state.parent_element)) {
				error(node, 'invalid-node-placement', `<${node.name}>`, context.state.parent_element);
			}
		}

		context.next({
			...context.state,
			parent_element: node.name
		});
	},
	SvelteElement(node, context) {
		validate_element(node, context);
		context.next({
			...context.state,
			parent_element: null
		});
	},
	SvelteFragment(node, context) {
		for (const attribute of node.attributes) {
			if (attribute.type === 'Attribute') {
				if (attribute.name === 'slot') {
					validate_slot_attribute(context, attribute);
				}
			} else if (attribute.type !== 'LetDirective') {
				error(attribute, 'invalid-svelte-fragment-attribute');
			}
		}
	},
	SlotElement(node) {
		for (const attribute of node.attributes) {
			if (attribute.type === 'Attribute') {
				if (attribute.name === 'name') {
					if (!is_text_attribute(attribute)) {
						error(attribute, 'invalid-slot-name');
					}
				}
			} else if (attribute.type !== 'SpreadAttribute') {
				error(attribute, 'invalid-slot-element-attribute');
			}
		}
	},
	Component: validate_component,
	SvelteComponent: validate_component,
	SvelteSelf: validate_component,
	Text(node, context) {
		if (!node.parent) return;
		if (context.state.parent_element && regex_not_whitespace.test(node.data)) {
			if (!is_tag_valid_with_parent('#text', context.state.parent_element)) {
				error(node, 'invalid-node-placement', 'Text node', context.state.parent_element);
			}
		}
	},
	ExpressionTag(node, context) {
		if (!node.parent) return;
		if (context.state.parent_element) {
			if (!is_tag_valid_with_parent('#text', context.state.parent_element)) {
				error(node, 'invalid-node-placement', '{expression}', context.state.parent_element);
			}
		}
	}
};
