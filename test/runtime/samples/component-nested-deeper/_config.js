export default {
	props: {
		values: [1, 2, 3, 4]
	},

	test(assert, component) {
		component.values = [2, 3];
	}
};
