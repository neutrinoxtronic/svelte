import { test } from '../../test';
import { setTimeout } from 'node:timers/promises';

export default test({
	html: `
		<p>Name: tom</p>
		<p>Email: tom@mail.com</p>
		<p>Number: 555</p>
		<button>Update me</button>
	`,
	async test({ assert, target }) {
		const [button] = target.querySelectorAll('button');
		const event = new window.MouseEvent('click', { bubbles: true });

		await button.dispatchEvent(event);
		await setTimeout(100);

		assert.htmlEqual(
			target.innerHTML,
			`
			<p>Name: jerry</p>
			<p>Email: jerry@mail.com</p>
			<p>Number: 777</p>
			<button>Update me</button>
			`
		);
	}
});
