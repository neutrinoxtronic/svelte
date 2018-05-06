import { createElement } from './dom.js';
import { noop } from './utils.js';

export function linear(t) {
	return t;
}

export function generateRule(
	a,
	b,
	delta,
	duration,
	ease,
	fn
) {
	let keyframes = '{\n';

	for (let p = 0; p <= 1; p += 16.666 / duration) {
		const t = a + delta * ease(p);
		keyframes += p * 100 + `%{${fn(t)}}\n`;
	}

	return keyframes + `100% {${fn(b)}}\n}`;
}

// https://github.com/darkskyapp/string-hash/blob/master/index.js
export function hash(str) {
	let hash = 5381;
	let i = str.length;

	while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
	return hash >>> 0;
}

export function wrapTransition(component, node, fn, params, intro) {
	const obj = fn(node, params);
	const duration = obj.duration || 300;
	const ease = obj.easing || linear;
	let cssText;

	// TODO share <style> tag between all transitions?
	if (obj.css && !transitionManager.stylesheet) {
		const style = createElement('style');
		document.head.appendChild(style);
		transitionManager.stylesheet = style.sheet;
	}

	if (intro) {
		if (obj.css && obj.delay) {
			cssText = node.style.cssText;
			node.style.cssText += obj.css(0);
		}

		if (obj.tick) obj.tick(0);
	}

	return {
		t: intro ? 0 : 1,
		running: false,
		program: null,
		pending: null,

		run(intro, callback) {
			const program = {
				start: window.performance.now() + (obj.delay || 0),
				intro,
				callback: callback || noop
			};

			if (!intro) {
				program.group = transitionManager.outros;
				transitionManager.outros.remaining += 1;
			}

			if (obj.delay) {
				this.pending = program;
			} else {
				this.start(program);
			}

			if (!this.running) {
				this.running = true;
				transitionManager.add(this);
			}
		},

		start(program) {
			component.fire(`${program.intro ? 'intro' : 'outro'}.start`, { node });

			program.a = this.t;
			program.b = program.intro ? 1 : 0;
			program.delta = program.b - program.a;
			program.duration = duration * Math.abs(program.b - program.a);
			program.end = program.start + program.duration;

			if (obj.css) {
				if (obj.delay) node.style.cssText = cssText;

				program.rule = generateRule(
					program.a,
					program.b,
					program.delta,
					program.duration,
					ease,
					obj.css
				);

				transitionManager.addRule(program.rule, program.name = '__svelte_' + hash(program.rule));

				node.style.animation = (node.style.animation || '')
					.split(', ')
					.filter(anim => anim && (program.delta < 0 || !/__svelte/.test(anim)))
					.concat(`${program.name} ${program.duration}ms linear 1 forwards`)
					.join(', ');
			}

			this.program = program;
			this.pending = null;
		},

		update(now) {
			const program = this.program;
			if (!program) return;

			const p = now - program.start;
			this.t = program.a + program.delta * ease(p / program.duration);
			if (obj.tick) obj.tick(this.t);
		},

		done() {
			const program = this.program;
			this.t = program.b;

			if (obj.tick) obj.tick(this.t);

			component.fire(`${program.intro ? 'intro' : 'outro'}.end`, { node });

			if (!program.intro) {
				program.group.callbacks.push(() => {
					program.callback();
					if (obj.css) transitionManager.deleteRule(node, program.name);
				});

				if (--program.group.remaining === 0) {
					program.group.callbacks.forEach(fn => {
						fn();
					});
				}
			}

			this.program = null;
			this.running = !!this.pending;
		},

		abort() {
			if (obj.tick) obj.tick(1);
			if (obj.css) transitionManager.deleteRule(node, this.program.name);
			this.program = this.pending = null;
			this.running = false;
		}
	};
}

export var transitionManager = {
	running: false,
	transitions: [],
	bound: null,
	stylesheet: null,
	activeRules: {},

	add(transition) {
		this.transitions.push(transition);

		if (!this.running) {
			this.running = true;
			requestAnimationFrame(this.bound || (this.bound = this.next.bind(this)));
		}
	},

	addRule(rule, name) {
		if (!this.activeRules[name]) {
			this.activeRules[name] = true;
			this.stylesheet.insertRule(`@keyframes ${name} ${rule}`, this.stylesheet.cssRules.length);
		}
	},

	next() {
		this.running = false;

		const now = window.performance.now();
		let i = this.transitions.length;

		while (i--) {
			const transition = this.transitions[i];

			if (transition.program && now >= transition.program.end) {
				transition.done();
			}

			if (transition.pending && now >= transition.pending.start) {
				transition.start(transition.pending);
			}

			if (transition.running) {
				transition.update(now);
				this.running = true;
			} else if (!transition.pending) {
				this.transitions.splice(i, 1);
			}
		}

		if (this.running) {
			requestAnimationFrame(this.bound);
		} else if (this.stylesheet) {
			let i = this.stylesheet.cssRules.length;
			while (i--) this.stylesheet.deleteRule(i);
			this.activeRules = {};
		}
	},

	deleteRule(node, name) {
		node.style.animation = node.style.animation
			.split(', ')
			.filter(anim => anim.indexOf(name) === -1)
			.join(', ');
	},

	groupOutros() {
		this.outros = {
			remaining: 0,
			callbacks: []
		};
	}
};
