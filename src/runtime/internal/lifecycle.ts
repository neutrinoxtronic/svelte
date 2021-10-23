import { custom_event } from './dom';

export let current_component;

export function set_current_component(component) {
	current_component = component;
}

export function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

export function beforeUpdate(fn: () => any) {
	get_current_component().$$.before_update.push(fn);
}

export function onMount(fn: () => any) {
	get_current_component().$$.on_mount.push(fn);
}

export function afterUpdate(fn: () => any) {
	get_current_component().$$.after_update.push(fn);
}

export function onDestroy(fn: () => any) {
	get_current_component().$$.on_destroy.push(fn);
}

export function createEventDispatcher<
	EventMap extends {} = any
>(): <EventKey extends Extract<keyof EventMap, string>>(type: EventKey, detail?: EventMap[EventKey]) => void {
	const component = get_current_component();

	return (type: string, detail?: any) => {
		const callbacks = component.$$.callbacks[type];
		const eventBinding = component.eventBindings && Object.prototype.hasOwnProperty.call(component.eventBindings, type) ? component.eventBindings[type] : undefined;
    const catchAll = component.eventBindings && Object.prototype.hasOwnProperty.call(component.eventBindings, '*') ? component.eventBindings['*'] : undefined;
		const catchAllBinding = component.$$.callbacks && Object.prototype.hasOwnProperty.call(component.$$.callbacks, '*') ? component.$$.callbacks['*'] : undefined;

		if (callbacks) {
			// TODO are there situations where events could be dispatched
			// in a server (non-DOM) environment?
			const event = custom_event(type, detail);
			callbacks.slice().forEach(fn => {
				fn.call(component, event);
			});
		}

		if (eventBinding) {
			// in a server (non-DOM) environment?
			try {
				const event = custom_event(type, detail);
				eventBinding[0].call(component, event, eventBinding[1].data);
			} catch (e) {
				console.warn(`A component was instantiated with invalid event:bindings -  ${e}`);
			}
		}

		if (catchAll) {
			// in a server (non-DOM) environment?
			try {
				const event = custom_event(type, detail);
				catchAll[0].call(component, event, catchAll[1].data);
			} catch (e) {
				console.warn(`A component was instantiated with invalid event:bindings -  ${e}`);
			}
		}

		if (catchAllBinding) {
			// in a server (non-DOM) environment?
			try {
				const event = custom_event(type, detail);
				catchAllBinding[0].call(component, event, catchAllBinding[1].data);
			} catch (e) {
				console.warn(`A component was instantiated with invalid on:* configuration -  ${e}`);
			}
		}
	};
}

export function setContext<T>(key, context: T) {
	get_current_component().$$.context.set(key, context);
}

export function getContext<T>(key): T {
	return get_current_component().$$.context.get(key);
}

export function getAllContexts<T extends Map<any, any> = Map<any, any>>(): T {
	return get_current_component().$$.context;
}

export function hasContext(key): boolean {
	return get_current_component().$$.context.has(key);
}

// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
export function bubble(component, event) {
	const callbacks = component.$$.callbacks[event.type];

	if (callbacks) {
		// @ts-ignore
		callbacks.slice().forEach(fn => fn.call(this, event));
	}
}
