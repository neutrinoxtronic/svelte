export default {
	props: {
		class: 'foo'
	},

	html: `
		<div class="foo"></div>123
		<div class="foo"></div>123
	`,

	test ( assert, component, target ) {
		component.class = 'bar';
		assert.htmlEqual( target.innerHTML, `
			<div class="bar"></div>123
			<div class="bar"></div>123
		` );

		component.destroy();
	}
};
