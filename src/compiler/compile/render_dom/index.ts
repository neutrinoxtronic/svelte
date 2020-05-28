import { b, x, p } from 'code-red';
import Component from '../Component';
import Renderer from './Renderer';
import { CompileOptions, CssResult } from '../../interfaces';
import { walk } from 'estree-walker';
import { extract_names, Scope } from '../utils/scope';
import { invalidate } from './invalidate';
import Block from './Block';
import { ClassDeclaration, FunctionExpression, Node, Statement, ObjectExpression, Expression } from 'estree';

export default function dom(
	component: Component,
	options: CompileOptions
): { js: Node[]; css: CssResult } {
	const { name } = component;

	const renderer = new Renderer(component, options);
	const { block } = renderer;

	block.has_outro_method = true;

	// prevent fragment being created twice (#1063)
	if (options.customElement) block.chunks.create.push(b`this.c = @noop;`);

	const body = [];

	if (renderer.file_var) {
		const file = component.file ? x`"${component.file}"` : x`undefined`;
		body.push(b`const ${renderer.file_var} = ${file};`);
	}

	const css = component.stylesheet.render(options.filename, !options.customElement);
	const styles = component.stylesheet.has_styles && options.dev
		? `${css.code}\n/*# sourceMappingURL=${css.map.toUrl()} */`
		: css.code;

	const add_css = component.get_unique_name('add_css');

	const should_add_css = (
		!options.customElement &&
		!!styles &&
		options.css !== false
	);

	if (should_add_css) {
		body.push(b`
			function ${add_css}() {
				var style = @element("style");
				style.id = "${component.stylesheet.id}-style";
				style.textContent = "${styles}";
				@append(@_document.head, style);
			}
		`);
	}

	// fix order
	// TODO the deconflicted names of blocks are reversed... should set them here
	const blocks = renderer.blocks.slice().reverse();

	body.push(...blocks.map(block => {
		// TODO this is a horrible mess — renderer.blocks
		// contains a mixture of Blocks and Nodes
		if ((block as Block).render) return (block as Block).render();
		return block;
	}));

	if (options.dev && !options.hydratable) {
		block.chunks.claim.push(
			b`throw new @_Error("options.hydrate only works if the component was compiled with the \`hydratable: true\` option");`
		);
	}

	const uses_props = component.var_lookup.has('$$props');
	const uses_rest = component.var_lookup.has('$$restProps');
	const uses_$$ = uses_props || uses_rest;
	const $$props = uses_$$ ? `$$new_props` : `$$props`;
	const props = component.vars.filter(variable => !variable.module && variable.export_name);
	const writable_props = props.filter(variable => variable.writable);

	const rest = uses_rest ? b`
		const #keys = new Set([${props.map(prop => `"${prop.export_name}"`).join()}]);
		const $$restProps = {}; 
		for (#k in $$props) { 
			if (!#keys.has(#k) && #k[0] !== '$') { 
				$$restProps[#k] = $$props[#k];
			}
		}
	` : null;

	const process_new_$$ = b`
		for (#k in $$new_props) { 
			if (#k[0] !== '$') {
			${uses_rest ? b`
				if (!#keys.has(#k)) { 
					$$props[#k] = ($$restProps[#k] = $$new_props[#k]);
				} else {
					$$props[#k] = $$new_props[#k];
				}`
			: b`$$props[#k] = $$new_props[#k];`}
			}
		}
		${uses_props && renderer.invalidate("$$props")}
		${uses_rest && renderer.invalidate("$$restProps")}
	`
	
	const set = (uses_$$ || writable_props.length > 0 || component.slots.size > 0)
	? x`${$$props} => {
		${uses_$$ ? process_new_$$ : null}
		${writable_props.map(prop => b`if ('${prop.export_name}' in ${$$props}) ${renderer.invalidate(prop.name, x`${prop.name} = ${$$props}.${prop.export_name}`)};`)}
		${component.slots.size > 0 && b`if ('$$scope' in ${$$props}) ${renderer.invalidate('$$scope', x`$$scope = ${$$props}.$$scope`)};`}
	}`
	: null;
			
	const k = uses_$$ ? b`let #k;` : null
	const accessors = [];

	const not_equal = component.component_options.immutable ? x`@not_equal` : x`@safe_not_equal`;
	let dev_props_check: Node[] | Node;
	let inject_state: Expression;
	let capture_state: Expression;
	let props_inject: Node[] | Node;

	props.forEach(prop => {
		const variable = component.var_lookup.get(prop.name);

		if (!variable.writable || component.component_options.accessors) {
			accessors.push({
				type: 'MethodDefinition',
				kind: 'get',
				key: { type: 'Identifier', name: prop.export_name },
				value: x`function() {
					return ${prop.hoistable ? prop.name : x`this.$$.ctx[${renderer.context_lookup.get(prop.name).index}]`}
				}`
			});
		} else if (component.compile_options.dev) {
			accessors.push({
				type: 'MethodDefinition',
				kind: 'get',
				key: { type: 'Identifier', name: prop.export_name },
				value: x`function() {
					throw new @_Error("<${component.tag}>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
				}`
			});
		}

		if (component.component_options.accessors) {
			if (variable.writable && !renderer.readonly.has(prop.name)) {
				accessors.push({
					type: 'MethodDefinition',
					kind: 'set',
					key: { type: 'Identifier', name: prop.export_name },
					value: x`function(${prop.name}) {
						this.$set({ ${prop.export_name}: ${prop.name} });
						@flush();
					}`
				});
			} else if (component.compile_options.dev) {
				accessors.push({
					type: 'MethodDefinition',
					kind: 'set',
					key: { type: 'Identifier', name: prop.export_name },
					value: x`function(value) {
						throw new @_Error("<${component.tag}>: Cannot set read-only property '${prop.export_name}'");
					}`
				});
			}
		} else if (component.compile_options.dev) {
			accessors.push({
				type: 'MethodDefinition',
				kind: 'set',
				key: { type: 'Identifier', name: prop.export_name },
				value: x`function(value) {
					throw new @_Error("<${component.tag}>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
				}`
			});
		}
	});

	if (component.compile_options.dev) {
		// checking that expected ones were passed
		const expected = props.filter(prop => prop.writable && !prop.initialised);

		if (expected.length) {
			dev_props_check = b`
				const { ctx: #ctx } = this.$$;
				const props = ${options.customElement ? x`this.attributes` : x`options.props || {}`};
				${expected.map(prop => b`
				if (${renderer.reference(prop.name)} === undefined && !('${prop.export_name}' in props)) {
					@_console.warn("<${component.tag}> was created without expected prop '${prop.export_name}'");
				}`)}
			`;
		}

		const capturable_vars = component.vars.filter(v => !v.internal && !v.global && !v.name.startsWith('$$'));

		if (capturable_vars.length > 0) {
			capture_state = x`() => ({ ${capturable_vars.map(prop => p`${prop.name}`)} })`;
		}

		const injectable_vars = capturable_vars.filter(v => !v.module && v.writable && v.name[0] !== '$');

		if (uses_props || injectable_vars.length > 0) {
			inject_state = x`
				${$$props} => {
					${uses_props && renderer.invalidate('$$props', x`$$props = { ...$$props, ...$$new_props }`)}
					${injectable_vars.map(
						v => b`if ('${v.name}' in $$props) ${renderer.invalidate(v.name, x`${v.name} = ${$$props}.${v.name}`)};`
					)}
				}
			`;

			props_inject = b`
				if ($$props && "$$inject" in $$props) {
					$$self.$inject_state($$props.$$inject);
				}
			`;
		}
	}

	// instrument assignments
	if (component.ast.instance) {
		let scope = component.instance_scope;
		const map = component.instance_scope_map;
		let execution_context: Node | null = null;

		walk(component.ast.instance.content, {
			enter(node: Node) {
				if (map.has(node)) {
					scope = map.get(node) as Scope;

					if (!execution_context && !scope.block) {
						execution_context = node;
					}
				} else if (!execution_context && node.type === 'LabeledStatement' && node.label.name === '$') {
					execution_context = node;
				}
			},

			leave(node: Node) {
				if (map.has(node)) {
					scope = scope.parent;
				}

				if (execution_context === node) {
					execution_context = null;
				}

				if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
					const assignee = node.type === 'AssignmentExpression' ? node.left : node.argument;

					// normally (`a = 1`, `b.c = 2`), there'll be a single name
					// (a or b). In destructuring cases (`[d, e] = [e, d]`) there
					// may be more, in which case we need to tack the extra ones
					// onto the initial function call
					const names = new Set(extract_names(assignee));

					this.replace(invalidate(renderer, scope, node, names, execution_context === null));
				}
			}
		});

		component.rewrite_props(({ name, reassigned, export_name }) => {
			const value = `$${name}`;
			const i = renderer.context_lookup.get(`$${name}`).index;

			const insert = (reassigned || export_name)
				? b`${`$$subscribe_${name}`}()`
				: b`$$self.$$.on_destroy.push(@subscribe(${name}, #value => {$$invalidate(${i}, ${value} = #value);}))`;

			if (component.compile_options.dev) {
				return b`@validate_store(${name}, '${name}'); ${insert}`;
			}

			return insert;
		});
	}

	const args = [x`$$self`];
	const has_invalidate = props.length > 0 ||
		component.has_reactive_assignments ||
		component.slots.size > 0 ||
		capture_state ||
		inject_state;
	if (has_invalidate) {
		args.push(x`$$props`, x`$$invalidate`);
	} else if (component.compile_options.dev) {
		// $$props arg is still needed for unknown prop check
		args.push(x`$$props`);
	}

	const has_create_fragment = component.compile_options.dev || block.has_content();
	if (has_create_fragment) {
		body.push(b`
			function create_fragment(#ctx) {
				${block.get_contents()}
			}
		`);
	}

	body.push(b`
		${component.extract_javascript(component.ast.module)}

		${component.fully_hoisted}
	`);

	const filtered_props = props.filter(prop => {
		const variable = component.var_lookup.get(prop.name);

		if (variable.hoistable) return false;
		if (prop.name[0] === '$') return false;
		return true;
	});

	const reactive_stores = component.vars.filter(variable => variable.name[0] === '$' && variable.name[1] !== '$');

	const instance_javascript = component.extract_javascript(component.ast.instance);

	let i = renderer.context.length;
	while (i--) {
		const member = renderer.context[i];
		if (member.variable) {
			if (member.variable.referenced || member.variable.export_name) break;
		} else if (member.is_non_contextual) {
			break;
		}
	}
	const initial_context = renderer.context.slice(0, i + 1);

	const has_definition = (
		component.compile_options.dev ||
		(instance_javascript && instance_javascript.length > 0) ||
		filtered_props.length > 0 ||
		uses_props ||
		component.partly_hoisted.length > 0 ||
		initial_context.length > 0 ||
		component.reactive_declarations.length > 0 ||
		capture_state ||
		inject_state
	);

	const definition = has_definition
		? component.alias('instance')
		: { type: 'Literal', value: null };

	const reactive_store_subscriptions = reactive_stores
		.filter(store => {
			const variable = component.var_lookup.get(store.name.slice(1));
			return !variable || variable.hoistable;
		})
		.map(({ name }) => b`
			${component.compile_options.dev && b`@validate_store(${name.slice(1)}, '${name.slice(1)}');`}
			$$self.$$.on_destroy.push(@subscribe(${name.slice(1)}, #value => {
				$$invalidate(${renderer.context_lookup.get(name).index}, (${name} = #value));
			}));
		`);

	const resubscribable_reactive_store_unsubscribers = reactive_stores
		.filter(store => {
			const variable = component.var_lookup.get(store.name.slice(1));
			return variable && (variable.reassigned || variable.export_name);
		})
		.map(({ name }) => b`$$self.$$.on_destroy.push(() => ${`$$unsubscribe_${name.slice(1)}`}());`);

	if (has_definition) {
		const reactive_declarations: (Node | Node[]) = [];
		const fixed_reactive_declarations = []; // not really 'reactive' but whatever

		component.reactive_declarations.forEach(d => {
			const dependencies = Array.from(d.dependencies);
			const uses_rest_or_props = !!dependencies.find(n => n === '$$props' || n === '$$restProps');

			const writable = dependencies.filter(n => {
				const variable = component.var_lookup.get(n);
				return variable && (variable.export_name || variable.mutated || variable.reassigned);
			});

			const condition = !uses_rest_or_props && writable.length > 0 && renderer.dirty(writable, true);

			let statement = d.node; // TODO remove label (use d.node.body) if it's not referenced

			if (condition) statement = b`if (${condition}) { ${statement} }`[0] as Statement;

			if (condition || uses_rest_or_props) {
				reactive_declarations.push(statement);
			} else {
				fixed_reactive_declarations.push(statement);
			}
		});

		const injected = Array.from(component.injected_reactive_declaration_vars).filter(name => {
			const variable = component.var_lookup.get(name);
			return variable.injected && variable.name[0] !== '$';
		});

		const reactive_store_declarations = reactive_stores.map(variable => {
			const $name = variable.name;
			const name = $name.slice(1);

			const store = component.var_lookup.get(name);
			if (store && (store.reassigned || store.export_name)) {
				const unsubscribe = `$$unsubscribe_${name}`;
				const subscribe = `$$subscribe_${name}`;
				const i = renderer.context_lookup.get($name).index;

				return b`
				let ${$name}, ${unsubscribe} = @noop;
				const ${subscribe} = () => { 
					${unsubscribe}();
					${unsubscribe} = @subscribe(${name}, (#value) => { $$invalidate(${i}, (${$name} = #value)); });
					return ${name};
				};`;
			}

			return b`let ${$name};`;
		});

		let unknown_props_check;
		if (component.compile_options.dev && !(uses_props || uses_rest)) {
			unknown_props_check = b`
				const writable_props = [${writable_props.map(prop => x`'${prop.export_name}'`)}];
				@_Object.keys($$props).forEach(key => {
					if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$') @_console.warn(\`<${component.tag}> was created with unknown prop '\${key}'\`);
				});
			`;
		}

		const return_value = {
			type: 'ArrayExpression',
			elements: initial_context.map(member => ({
				type: 'Identifier',
				name: member.name
			}) as Expression)
		};

		body.push(b`
			function ${definition}(${args}) {
				${k}

				${rest}

				${reactive_store_declarations}

				${reactive_store_subscriptions}

				${resubscribable_reactive_store_unsubscribers}

				${instance_javascript}

				${unknown_props_check}

				${component.slots.size || component.compile_options.dev ? b`let { $$slots = {}, $$scope } = $$props;` : null}
				${component.compile_options.dev && b`@validate_slots('${component.tag}', $$slots, [${[...component.slots.keys()].map(key => `'${key}'`).join(',')}]);`}

				${renderer.binding_groups.length > 0 && b`const $$binding_groups = [${renderer.binding_groups.map(_ => x`[]`)}];`}

				${component.partly_hoisted}

				${set && b`$$self.$set = ${set};`}

				${capture_state && b`$$self.$capture_state = ${capture_state};`}

				${inject_state && b`$$self.$inject_state = ${inject_state};`}

				${injected.map(name => b`let ${name};`)}

				${/* before reactive declarations */ props_inject}

				${reactive_declarations.length > 0 && b`
				$$self.$$.update = () => {
					${reactive_declarations}
				};
				`}

				${fixed_reactive_declarations}

				${uses_props && b`for (#k in $$props) if (#k[0] === '$') delete $$props[#k];`}

				return ${return_value};
			}
		`);
	}

	const prop_indexes = x`{
		${props.filter(v => v.export_name && !v.module).map(v => p`${v.export_name}: ${renderer.context_lookup.get(v.name).index}`)}
	}` as ObjectExpression;

	let dirty;
	if (renderer.context_overflow) {
		dirty = x`[]`;
		for (let i = 0; i < renderer.context.length; i += 31) {
			dirty.elements.push(x`-1`);
		}
	}

	if (options.customElement) {
		const declaration = b`
			class ${name} extends @SvelteElement {
				constructor(options) {
					super();

					${css.code && b`this.shadowRoot.innerHTML = \`<style>${css.code.replace(/\\/g, '\\\\')}${options.dev ? `\n/*# sourceMappingURL=${css.map.toUrl()} */` : ''}</style>\`;`}

					@init(this, { target: this.shadowRoot }, ${definition}, ${has_create_fragment ? 'create_fragment': 'null'}, ${not_equal}, ${prop_indexes}, ${dirty});

					${dev_props_check}

					if (options) {
						if (options.target) {
							@insert(options.target, this, options.anchor);
						}

						${(props.length > 0 || uses_props || uses_rest) && b`
						if (options.props) {
							this.$set(options.props);
							@flush();
						}`}
					}
				}
			}
		`[0] as ClassDeclaration;

		if (props.length > 0) {
			declaration.body.body.push({
				type: 'MethodDefinition',
				kind: 'get',
				static: true,
				computed: false,
				key: { type: 'Identifier', name: 'observedAttributes' },
				value: x`function() {
					return [${props.map(prop => x`"${prop.export_name}"`)}];
				}` as FunctionExpression
			});
		}

		declaration.body.body.push(...accessors);

		body.push(declaration);

		if (component.tag != null) {
			body.push(b`
				@_customElements.define("${component.tag}", ${name});
			`);
		}
	} else {
		const superclass = {
			type: 'Identifier',
			name: options.dev ? '@SvelteComponentDev' : '@SvelteComponent'
		};

		const declaration = b`
			class ${name} extends ${superclass} {
				constructor(options) {
					super(${options.dev && `options`});
					${should_add_css && b`if (!@_document.getElementById("${component.stylesheet.id}-style")) ${add_css}();`}
					@init(this, options, ${definition}, ${has_create_fragment ? 'create_fragment': 'null'}, ${not_equal}, ${prop_indexes}, ${dirty});
					${options.dev && b`@dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "${name.name}", options, id: create_fragment.name });`}

					${dev_props_check}
				}
			}
		`[0] as ClassDeclaration;

		declaration.body.body.push(...accessors);

		body.push(declaration);
	}

	return { js: flatten(body, []), css };
}

function flatten(nodes: any[], target: any[]) {
	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		if (Array.isArray(node)) {
			flatten(node, target);
		} else {
			target.push(node);
		}
	}

	return target;
}
