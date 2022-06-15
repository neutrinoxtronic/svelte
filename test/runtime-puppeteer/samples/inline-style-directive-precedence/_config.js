export default {
	html: `
		<p style="font-size: 32px; color: red;"></p>
	`,
	solo: true,

	test({ assert, target, window, component }) {
		const p = target.querySelector("p");
		const styles = window.getComputedStyle(p);
		assert.equal(styles.color, "rgb(255, 0, 0)");
		assert.equal(styles.fontSize, "32px");

		component.foo = "font-size: 50px; color: green;"; // Update style attribute
		{
			const p = target.querySelector("p");
			const styles = window.getComputedStyle(p);
			assert.equal(styles.color, "rgb(255, 0, 0)");
			assert.equal(styles.fontSize, "32px");
		}
	},
};
