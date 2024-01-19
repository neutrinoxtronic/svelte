declare module '*.svelte' {
	export { SvelteComponent as default } from 'svelte';
}

/**
 * Declares reactive state.
 *
 * Example:
 * ```ts
 * let count = $state(0);
 * ```
 *
 * https://svelte-5-preview.vercel.app/docs/runes#$state
 *
 * @param initial The initial value
 */
declare function $state<T>(initial: T): T;
declare function $state<T>(): T | undefined;

declare namespace $state {
	/**
	 * Declares reactive read-only state that is shallowly immutable.
	 *
	 * Example:
	 * ```ts
	 * <script>
	 *   let items = $state.frozen([0]);
	 *
	 *   const addItem = () => {
	 *     items = [...items, items.length];
	 *   };
	 * </script>
	 *
	 * <button on:click={addItem}>
	 *   {items.join(', ')}
	 * </button>
	 * ```
	 *
	 * https://svelte-5-preview.vercel.app/docs/runes#$state-raw
	 *
	 * @param initial The initial value
	 */
	export function frozen<T>(initial: T): Readonly<T>;
	export function frozen<T>(): Readonly<T> | undefined;
}

/**
 * Declares derived state, i.e. one that depends on other state variables.
 * The expression inside `$derived(...)` should be free of side-effects.
 *
 * Example:
 * ```ts
 * let double = $derived(count * 2);
 * ```
 *
 * https://svelte-5-preview.vercel.app/docs/runes#$derived
 *
 * @param expression The derived state expression
 */
declare function $derived<T>(expression: T): T;

declare namespace $derived {
	/**
	 * Sometimes you need to create complex derivations which don't fit inside a short expression.
	 * In this case, you can resort to `$derived.fn` which accepts a function as its argument and returns its value.
	 *
	 * Example:
	 * ```ts
	 * $derived.fn(() => {
	 *   let tmp = count;
	 *	 if (count > 10) {
	 *	   tmp += 100;
	 *	 }
	 *	 return tmp * 2;
	 * });
	 * ```
	 *
	 * `$derived.fn` passes the previous derived value as a single argument to the derived function. This can be useful for when
	 * you might want to compare the latest derived value with the previous derived value. Furthermore, you might want to pluck out
	 * specific properties of derived state to use in the new derived state given a certain condition – which can be useful when dealing
	 * with more complex state machines.
	 *
	 * https://svelte-5-preview.vercel.app/docs/runes#$derived-fn
	 */
	export function fn<T>(fn: (prev: T) => T): void;
}

/**
 * Runs code when a component is mounted to the DOM, and then whenever its dependencies change, i.e. `$state` or `$derived` values.
 * The timing of the execution is after the DOM has been updated.
 *
 * Example:
 * ```ts
 * $effect(() => console.log('The count is now ' + count));
 * ```
 *
 * If you return a function from the effect, it will be called right before the effect is run again, or when the component is unmounted.
 *
 * Does not run during server side rendering.
 *
 * https://svelte-5-preview.vercel.app/docs/runes#$effect
 * @param fn The function to execute
 */
declare function $effect(fn: () => void | (() => void)): void;

declare namespace $effect {
	/**
	 * Runs code right before a component is mounted to the DOM, and then whenever its dependencies change, i.e. `$state` or `$derived` values.
	 * The timing of the execution is right before the DOM is updated.
	 *
	 * Example:
	 * ```ts
	 * $effect.pre(() => console.log('The count is now ' + count));
	 * ```
	 *
	 * If you return a function from the effect, it will be called right before the effect is run again, or when the component is unmounted.
	 *
	 * Does not run during server side rendering.
	 *
	 * https://svelte-5-preview.vercel.app/docs/runes#$effect-pre
	 * @param fn The function to execute
	 */
	export function pre(fn: () => void | (() => void)): void;

	/**
	 * The `$effect.active` rune is an advanced feature that tells you whether or not the code is running inside an effect or inside your template.
	 *
	 * Example:
	 * ```svelte
	 * <script>
	 *   console.log('in component setup:', $effect.active()); // false
	 *
	 *   $effect(() => {
	 *     console.log('in effect:', $effect.active()); // true
	 *   });
	 * </script>
	 *
	 * <p>in template: {$effect.active()}</p> <!-- true -->
	 * ```
	 *
	 * This allows you to (for example) add things like subscriptions without causing memory leaks, by putting them in child effects.
	 *
	 * https://svelte-5-preview.vercel.app/docs/runes#$effect-active
	 */
	export function active(): boolean;

	/**
	 * The `$effect.root` rune is an advanced feature that creates a non-tracked scope that doesn't auto-cleanup. This is useful for
	 * nested effects that you want to manually control. This rune also allows for creation of effects outside of the component
	 * initialisation phase.
	 *
	 * Example:
	 * ```svelte
	 * <script>
	 *   let count = $state(0);
	 *
	 *   const cleanup = $effect.root(() => {
	 *	    $effect(() => {
	 *				console.log(count);
	 *			})
	 *
	 *      return () => {
	 *        console.log('effect root cleanup');
	 * 			}
	 *   });
	 * </script>
	 *
	 * <button onclick={() => cleanup()}>cleanup</button>
	 * ```
	 *
	 * https://svelte-5-preview.vercel.app/docs/runes#$effect-root
	 */
	export function root(fn: () => void | (() => void)): () => void;
}

/**
 * Declares the props that a component accepts. Example:
 *
 * ```ts
 * let { optionalProp = 42, requiredProp } = $props<{ optionalProp?: number; requiredProps: string}>();
 * ```
 *
 * https://svelte-5-preview.vercel.app/docs/runes#$props
 */
declare function $props<T>(): T;

/**
 * Inspects one or more values whenever they, or the properties they contain, change. Example:
 *
 * ```ts
 * $inspect(someValue, someOtherValue)
 * ```
 *
 * `$inspect` returns a `with` function, which you can invoke with a callback function that
 * will be called with the value and the event type (`'init'` or `'update'`) on every change.
 * By default, the values will be logged to the console.
 *
 * ```ts
 * $inspect(x).with(console.trace);
 * $inspect(x, y).with(() => { debugger; });
 * ```
 *
 * https://svelte-5-preview.vercel.app/docs/runes#$inspect
 */
declare function $inspect<T extends any[]>(
	...values: T
): { with: (fn: (type: 'init' | 'update', ...values: T) => void) => void };
