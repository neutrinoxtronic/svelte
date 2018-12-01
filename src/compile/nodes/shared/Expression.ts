import Component from '../../Component';
import { walk } from 'estree-walker';
import isReference from 'is-reference';
import flattenReference from '../../../utils/flattenReference';
import { createScopes, Scope } from '../../../utils/annotateWithScopes';
import { Node } from '../../../interfaces';
import addToSet from '../../../utils/addToSet';
import globalWhitelist from '../../../utils/globalWhitelist';
import deindent from '../../../utils/deindent';
import Wrapper from '../../render-dom/wrappers/shared/Wrapper';
import sanitize from '../../../utils/sanitize';
import TemplateScope from './TemplateScope';

const binaryOperators: Record<string, number> = {
	'**': 15,
	'*': 14,
	'/': 14,
	'%': 14,
	'+': 13,
	'-': 13,
	'<<': 12,
	'>>': 12,
	'>>>': 12,
	'<': 11,
	'<=': 11,
	'>': 11,
	'>=': 11,
	'in': 11,
	'instanceof': 11,
	'==': 10,
	'!=': 10,
	'===': 10,
	'!==': 10,
	'&': 9,
	'^': 8,
	'|': 7
};

const logicalOperators: Record<string, number> = {
	'&&': 6,
	'||': 5
};

const precedence: Record<string, (node?: Node) => number> = {
	Literal: () => 21,
	Identifier: () => 21,
	ParenthesizedExpression: () => 20,
	MemberExpression: () => 19,
	NewExpression: () => 19, // can be 18 (if no args) but makes no practical difference
	CallExpression: () => 19,
	UpdateExpression: () => 17,
	UnaryExpression: () => 16,
	BinaryExpression: (node: Node) => binaryOperators[node.operator],
	LogicalExpression: (node: Node) => logicalOperators[node.operator],
	ConditionalExpression: () => 4,
	AssignmentExpression: () => 3,
	YieldExpression: () => 2,
	SpreadElement: () => 1,
	SequenceExpression: () => 0
};

export default class Expression {
	component: Component;
	owner: Wrapper;
	node: any;
	snippet: string;
	references: Set<string>;
	dependencies: Set<string>;
	contextual_dependencies: Set<string>;

	template_scope: TemplateScope;
	scope: Scope;
	scope_map: WeakMap<Node, Scope>;

	is_synthetic: boolean;
	declarations: string[] = [];
	usesContext = false;
	usesEvent = false;

	rendered: string;

	constructor(component: Component, owner: Wrapper, template_scope: TemplateScope, info) {
		// TODO revert to direct property access in prod?
		Object.defineProperties(this, {
			component: {
				value: component
			},

			// TODO remove this, is just for debugging
			snippet: {
				get: () => {
					throw new Error(`cannot access expression.snippet, use expression.render() instead`)
				}
			}
		});

		this.node = info;
		this.template_scope = template_scope;
		this.owner = owner;
		this.is_synthetic = owner.isSynthetic;

		const expression_dependencies = new Set();
		const expression_contextual_dependencies = new Set();

		let dependencies = expression_dependencies;
		let contextual_dependencies = expression_contextual_dependencies;

		let { map, scope } = createScopes(info);
		this.scope = scope;
		this.scope_map = map;

		const expression = this;

		// discover dependencies, but don't change the code yet
		walk(info, {
			enter(node: any, parent: any, key: string) {
				// don't manipulate shorthand props twice
				if (key === 'value' && parent.shorthand) return;

				if (map.has(node)) {
					scope = map.get(node);
				}

				if (isReference(node, parent)) {
					const { name } = flattenReference(node);

					if (scope.has(name)) return;
					if (globalWhitelist.has(name) && component.declarations.indexOf(name) === -1) return;

					if (template_scope.names.has(name)) {
						expression.usesContext = true;

						contextual_dependencies.add(name);

						template_scope.dependenciesForName.get(name).forEach(dependency => {
							dependencies.add(dependency);
						});
					} else {
						dependencies.add(name);
						component.expectedProperties.add(name);
					}

					this.skip();
				}

				if (node.type === 'CallExpression') {
					// TODO remove this? rely on reactive declarations?
					if (node.callee.type === 'Identifier') {
						const dependencies_for_invocation = component.findDependenciesForFunctionCall(node.callee.name);
						if (dependencies_for_invocation) {
							addToSet(dependencies, dependencies_for_invocation);
						} else {
							dependencies.add('$$BAIL$$');
						}
					} else {
						dependencies.add('$$BAIL$$');
					}
				}
			}
		});

		this.dependencies = dependencies;
		this.contextual_dependencies = contextual_dependencies;
	}

	getPrecedence() {
		return this.node.type in precedence ? precedence[this.node.type](this.node) : 0;
	}

	render() {
		if (this.rendered) return this.rendered;

		const {
			component,
			declarations,
			scope_map: map,
			template_scope,
			owner,
			is_synthetic
		} = this;
		let scope = this.scope;

		const { code } = component;

		let function_expression;
		let pending_assignments = new Set();

		let dependencies: Set<string>;
		let contextual_dependencies: Set<string>;

		// rewrite code as appropriate
		walk(this.node, {
			enter(node: any, parent: any, key: string) {
				// don't manipulate shorthand props twice
				if (key === 'value' && parent.shorthand) return;

				code.addSourcemapLocation(node.start);
				code.addSourcemapLocation(node.end);

				if (map.has(node)) {
					scope = map.get(node);
				}

				if (isReference(node, parent)) {
					const { name, nodes } = flattenReference(node);

					if (scope.has(name)) return;
					if (globalWhitelist.has(name) && component.declarations.indexOf(name) === -1) return;

					if (function_expression) {
						if (template_scope.names.has(name)) {
							contextual_dependencies.add(name);

							template_scope.dependenciesForName.get(name).forEach(dependency => {
								dependencies.add(dependency);
							});
						} else {
							dependencies.add(name);
							component.expectedProperties.add(name);
						}
					} else if (!is_synthetic) {
						code.prependRight(node.start, key === 'key' && parent.shorthand
							? `${name}: ctx.`
							: 'ctx.');
					}

					if (node.type === 'MemberExpression') {
						nodes.forEach(node => {
							code.addSourcemapLocation(node.start);
							code.addSourcemapLocation(node.end);
						});
					}

					this.skip();
				}

				if (function_expression) {
					if (node.type === 'AssignmentExpression') {
						// TODO handle destructuring assignments
						const { name } = flattenReference(node.left);
						pending_assignments.add(name);

						// code.appendLeft(node.end, `; $$make_dirty('${name}')`);
					}
				} else {
					if (node.type === 'AssignmentExpression') {
						// TODO should this be a warning/error? `<p>{foo = 1}</p>`
					}

					if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
						function_expression = node;
						dependencies = new Set();
						contextual_dependencies = new Set();
					}
				}
			},

			leave(node: Node) {
				if (map.has(node)) scope = scope.parent;

				if (node === function_expression) {
					if (pending_assignments.size > 0) {
						if (node.type !== 'ArrowFunctionExpression') {
							// this should never happen!
							throw new Error(`Well that's odd`);
						}

						// TOOD optimisation — if this is an event handler,
						// the return value doesn't matter
					}

					const name = component.getUniqueName(
						sanitize(get_function_name(node, owner))
					);

					const args = contextual_dependencies.size > 0
						? [`{ ${[...contextual_dependencies].join(', ')} }`]
						: [];

					let original_params;

					if (node.params.length > 0) {
						original_params = code.slice(node.params[0].start, node.params[node.params.length - 1].end);
						args.push(original_params);
					}

					let body = code.slice(node.body.start, node.body.end).trim();
					if (node.body.type !== 'BlockStatement') {
						if (pending_assignments.size > 0) {
							const insert = [...pending_assignments].map(name => `$$make_dirty('${name}');`);
							pending_assignments = new Set();

							body = deindent`
								{
									const $$result = ${body};
									${insert}
									return $$result;
								}
							`;
						} else {
							body = `{\n\treturn ${body};\n}`;
						}
					}

					const fn = deindent`
						function ${name}(${args.join(', ')}) ${body}
					`;

					if (dependencies.size === 0 && contextual_dependencies.size === 0) {
						// we can hoist this out of the component completely
						component.fully_hoisted.push(fn);
						code.overwrite(node.start, node.end, name);
					}

					else if (contextual_dependencies.size === 0) {
						// function can be hoisted inside the component init
						component.partly_hoisted.push(fn);
						component.declarations.push(name);
						code.overwrite(node.start, node.end, `ctx.${name}`);
					}

					else {
						// we need a combo block/init recipe
						component.partly_hoisted.push(fn);
						component.declarations.push(name);
						code.overwrite(node.start, node.end, name);

						declarations.push(deindent`
							function ${name}(${original_params ? '...args' : ''}) {
								return ctx.${name}(ctx${original_params ? ', ...args' : ''});
							}
						`);
					}

					function_expression = null;
					dependencies = null;
					contextual_dependencies = null;
				}

				if (/Statement/.test(node.type)) {
					if (pending_assignments.size > 0) {
						const insert = [...pending_assignments].map(name => `$$make_dirty('${name}')`).join('; ');

						if (/^(Break|Continue|Return)Statement/.test(node.type)) {
							if (node.argument) {
								code.overwrite(node.start, node.argument.start, `var $$result = `);
								code.appendLeft(node.argument.end, `; ${insert}; return $$result`);
							} else {
								code.prependRight(node.start, `${insert}; `);
							}
						} else {
							code.appendLeft(node.end, `; ${insert}`);
						}

						pending_assignments = new Set();
					}
				}
			}
		});

		return this.rendered = `[✂${this.node.start}-${this.node.end}✂]`;
	}
}

function get_function_name(node, parent) {
	if (parent.type === 'EventHandler') {
		return `${parent.name}_handler`;
	}

	if (parent.type === 'Action') {
		return `${parent.name}_function`;
	}

	return 'func';
}