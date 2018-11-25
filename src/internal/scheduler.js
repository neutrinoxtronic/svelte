let update_scheduled = false;

let dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];

export const intro = { enabled: false };

export function schedule_update(component) {
	dirty_components.push(component);
	if (!update_scheduled) {
		update_scheduled = true;
		queue_microtask(flush);
	}
}

export function add_render_callback(fn) {
	render_callbacks.push(fn);
}

export function add_binding_callback(fn) {
	binding_callbacks.push(fn);
}

export function flush() {
	const seen_callbacks = new Set();

	do {
		// first, call beforeRender functions
		// and update components
		while (dirty_components.length) {
			dirty_components.shift().$$update();
		}

		while (binding_callbacks.length) binding_callbacks.pop()();

		// then, once components are updated, call
		// afterRender functions. This may cause
		// subsequent updates...
		while (render_callbacks.length) {
			const callback = render_callbacks.pop();
			if (!seen_callbacks.has(callback)) {
				callback();

				// ...so guard against infinite loops
				seen_callbacks.add(callback);
			}
		}
	} while (dirty_components.length);

	update_scheduled = false;
}

function queue_microtask(callback) {
	Promise.resolve().then(() => {
		if (update_scheduled) callback();
	});
}