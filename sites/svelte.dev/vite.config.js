import * as fs from "fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { imagetools } from "vite-imagetools";

process.env.VITE_API_BASE = process.env.DOCS_PREVIEW
	? "http://localhost:8787"
	: "https://api.svelte.dev";

/**
 * @param {string[]} ext
 * @returns {import('vite').Plugin}
 */
function raw(ext) {
	return {
		name: "vite-plugin-raw",
		transform(_, id) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return { code: `export default ${JSON.stringify(buffer)}`, map: null };
			}
		},
	};
}

/** @type {import('vite').UserConfig} */
const config = {
	logLevel: "info",
	plugins: [raw([".ttf"]), imagetools(), sveltekit()],
	esbuild: {
		loader: {
			html: "text",
		},
	},
	optimizeDeps: {
		include: [
			"codemirror",
			"codemirror/mode/javascript/javascript.js",
			"codemirror/mode/handlebars/handlebars.js",
			"codemirror/mode/htmlmixed/htmlmixed.js",
			"codemirror/mode/xml/xml.js",
			"codemirror/mode/css/css.js",
			"codemirror/mode/markdown/markdown.js",
			"codemirror/addon/edit/closebrackets.js",
			"codemirror/addon/edit/closetag.js",
			"codemirror/addon/edit/continuelist.js",
			"codemirror/addon/comment/comment.js",
			"codemirror/addon/fold/foldcode.js",
			"codemirror/addon/fold/foldgutter.js",
			"codemirror/addon/fold/brace-fold.js",
			"codemirror/addon/fold/xml-fold.js",
			"codemirror/addon/fold/indent-fold.js",
			"codemirror/addon/fold/markdown-fold.js",
			"codemirror/addon/fold/comment-fold.js",
		],
	},
	server: {
		fs: {
			strict: false,
		},
	},
};

export default config;
