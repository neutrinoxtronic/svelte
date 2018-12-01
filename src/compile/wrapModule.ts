import deindent from '../utils/deindent';
import list from '../utils/list';
import { CompileOptions, ModuleFormat, Node } from '../interfaces';

interface Dependency {
	name: string;
	statements: string[];
	source: string;
}

const wrappers = { esm, cjs, eval: expr };

type Export = {
	name: string;
	as: string;
};

export default function wrapModule(
	code: string,
	format: ModuleFormat,
	name: string,
	options: CompileOptions,
	banner: string,
	sharedPath: string,
	helpers: { name: string, alias: string }[],
	imports: Node[],
	module_exports: Export[],
	source: string
): string {
	if (format === 'esm') {
		return esm(code, name, options, banner, sharedPath, helpers, imports, module_exports, source);
	}

	if (format === 'cjs') return cjs(code, name, banner, sharedPath, helpers, imports, module_exports);
	if (format === 'eval') return expr(code, name, options, banner, imports);

	throw new Error(`options.format is invalid (must be ${list(Object.keys(wrappers))})`);
}

function esm(
	code: string,
	name: string,
	options: CompileOptions,
	banner: string,
	sharedPath: string,
	helpers: { name: string, alias: string }[],
	imports: Node[],
	module_exports: Export[],
	source: string
) {
	const importHelpers = helpers.length > 0 && (
		`import { ${helpers.map(h => h.name === h.alias ? h.name : `${h.name} as ${h.alias}`).join(', ')} } from ${JSON.stringify(sharedPath)};`
	);

	const importBlock = imports.length > 0 && (
		imports
			.map((declaration: Node) => source.slice(declaration.start, declaration.end))
			.join('\n')
	);

	return deindent`
		${banner}
		${importHelpers}
		${importBlock}

		${code}
		export default ${name};
		export { $render };
		${module_exports.length > 0 && `export { ${module_exports.map(e => e.name === e.as ? e.name : `${e.name} as ${e.as}`).join(', ')} };`}`;
}

function cjs(
	code: string,
	name: string,
	banner: string,
	sharedPath: string,
	helpers: { name: string, alias: string }[],
	imports: Node[],
	module_exports: Export[]
) {
	const helperDeclarations = helpers.map(h => `${h.alias === h.name ? h.name : `${h.name}: ${h.alias}`}`).join(', ');

	const helperBlock = helpers.length > 0 && (
		`const { ${helperDeclarations} } = require(${JSON.stringify(sharedPath)});\n`
	);

	const requires = imports.map(node => {
		let lhs;

		if (node.specifiers[0].type === 'ImportNamespaceSpecifier') {
			lhs = node.specifiers[0].local.name;
		} else {
			const properties = node.specifiers.map(s => {
				if (s.type === 'ImportDefaultSpecifier') {
					return `default: ${s.local.name}`;
				}

				return s.local.name === s.imported.name
					? s.local.name
					: `${s.imported.name}: ${s.local.name}`;
			});

			lhs = `{ ${properties.join(', ')} }`;
		}

		return `const ${lhs} = require("${node.source.value}");`
	});

	const exports = [`exports.default = ${name};`, `exports.$render = $render;`].concat(
		module_exports.map(x => `exports.${x.as} = ${x.name};`)
	);

	return deindent`
		${banner}
		"use strict";

		${helperBlock}
		${requires}

		${code}

		${exports}`
}

function expr(
	code: string,
	name: string,
	options: CompileOptions,
	banner: string,
	imports: Node[]
) {
	const dependencies = imports.map((declaration, i) => {
		const defaultImport = declaration.specifiers.find(
			(x: Node) =>
				x.type === 'ImportDefaultSpecifier' ||
				(x.type === 'ImportSpecifier' && x.imported.name === 'default')
		);

		const namespaceImport = declaration.specifiers.find(
			(x: Node) => x.type === 'ImportNamespaceSpecifier'
		);

		const namedImports = declaration.specifiers.filter(
			(x: Node) =>
				x.type === 'ImportSpecifier' && x.imported.name !== 'default'
		);

		const name = defaultImport || namespaceImport
			? (defaultImport || namespaceImport).local.name
			: `__import${i}`;

		const statements: string[] = [];

		namedImports.forEach((specifier: Node) => {
			statements.push(
				`var ${specifier.local.name} = ${name}.${specifier.imported.name};`
			);
		});

		if (defaultImport) {
			statements.push(
				`${name} = (${name} && ${name}.__esModule) ? ${name}["default"] : ${name};`
			);
		}

		return { name, statements, source: declaration.source.value };
	});

	const globals = getGlobals(dependencies, options);

	return deindent`
		(function (${paramString(dependencies)}) { "use strict";
			${banner}

			${getCompatibilityStatements(dependencies)}

			${code}

			return ${name};
		}(${globals.join(', ')}))`;
}

function paramString(dependencies: Dependency[]) {
	return dependencies.map(dep => dep.name).join(', ');
}

function getCompatibilityStatements(dependencies: Dependency[]) {
	if (!dependencies.length) return null;

	const statements: string[] = [];

	dependencies.forEach(dependency => {
		statements.push(...dependency.statements);
	});

	return statements.join('\n');
}

function getGlobals(dependencies: Dependency[], options: CompileOptions) {
	const { globals, onwarn } = options;
	const globalFn = getGlobalFn(globals);

	return dependencies.map(d => {
		let name = globalFn(d.source);

		if (!name) {
			if (d.name.startsWith('__import')) {
				throw new Error(
					`Could not determine name for imported module '${d.source}' – use options.globals`
				);
			} else {
				const warning = {
					code: `options-missing-globals`,
					message: `No name was supplied for imported module '${d.source}'. Guessing '${d.name}', but you should use options.globals`,
				};

				onwarn(warning);
			}

			name = d.name;
		}

		return name;
	});
}

function getGlobalFn(globals: any): (id: string) => string {
	if (typeof globals === 'function') return globals;
	if (typeof globals === 'object') {
		return id => globals[id];
	}

	return () => undefined;
}
