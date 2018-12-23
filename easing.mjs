/*
Adapted from https://github.com/mattdesl
Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
*/

export function backInOut(t) {
	var s = 1.70158 * 1.525;
	if ((t *= 2) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
	return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
}

export function backIn(t) {
	var s = 1.70158;
	return t * t * ((s + 1) * t - s);
}

export function backOut(t) {
	var s = 1.70158;
	return --t * t * ((s + 1) * t + s) + 1;
}

export function bounceOut(t) {
	var a = 4.0 / 11.0;
	var b = 8.0 / 11.0;
	var c = 9.0 / 10.0;

	var ca = 4356.0 / 361.0;
	var cb = 35442.0 / 1805.0;
	var cc = 16061.0 / 1805.0;

	var t2 = t * t;

	return t < a
		? 7.5625 * t2
		: t < b
		? 9.075 * t2 - 9.9 * t + 3.4
		: t < c
		? ca * t2 - cb * t + cc
		: 10.8 * t * t - 20.52 * t + 10.72;
}

export function bounceInOut(t) {
	return t < 0.5
		? 0.5 * (1.0 - bounceOut(1.0 - t * 2.0))
		: 0.5 * bounceOut(t * 2.0 - 1.0) + 0.5;
}

export function bounceIn(t) {
	return 1.0 - bounceOut(1.0 - t);
}

export function circInOut(t) {
	if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
	return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
}

export function circIn(t) {
	return 1.0 - Math.sqrt(1.0 - t * t);
}

export function circOut(t) {
	return Math.sqrt(1 - --t * t);
}

export function cubicInOut(t) {
	return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
}

export function cubicIn(t) {
	return t * t * t;
}

export function cubicOut(t) {
	var f = t - 1.0;
	return f * f * f + 1.0;
}

export function elasticInOut(t) {
	return t < 0.5
		? 0.5 *
				Math.sin(((+13.0 * Math.PI) / 2) * 2.0 * t) *
				Math.pow(2.0, 10.0 * (2.0 * t - 1.0))
		: 0.5 *
				Math.sin(((-13.0 * Math.PI) / 2) * (2.0 * t - 1.0 + 1.0)) *
				Math.pow(2.0, -10.0 * (2.0 * t - 1.0)) +
				1.0;
}

export function elasticIn(t) {
	return Math.sin((13.0 * t * Math.PI) / 2) * Math.pow(2.0, 10.0 * (t - 1.0));
}

export function elasticOut(t) {
	return (
		Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -10.0 * t) + 1.0
	);
}

export function expoInOut(t) {
	return t === 0.0 || t === 1.0
		? t
		: t < 0.5
		? +0.5 * Math.pow(2.0, 20.0 * t - 10.0)
		: -0.5 * Math.pow(2.0, 10.0 - t * 20.0) + 1.0;
}

export function expoIn(t) {
	return t === 0.0 ? t : Math.pow(2.0, 10.0 * (t - 1.0));
}

export function expoOut(t) {
	return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
}

export function linear(t) {
	return t;
}

export function quadInOut(t) {
	t /= 0.5;
	if (t < 1) return 0.5 * t * t;
	t--;
	return -0.5 * (t * (t - 2) - 1);
}

export function quadIn(t) {
	return t * t;
}

export function quadOut(t) {
	return -t * (t - 2.0);
}

export function quarticInOut(t) {
	return t < 0.5
		? +8.0 * Math.pow(t, 4.0)
		: -8.0 * Math.pow(t - 1.0, 4.0) + 1.0;
}

export function quarticIn(t) {
	return Math.pow(t, 4.0);
}

export function quarticOut(t) {
	return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0;
}

export function qinticInOut(t) {
	if ((t *= 2) < 1) return 0.5 * t * t * t * t * t;
	return 0.5 * ((t -= 2) * t * t * t * t + 2);
}

export function qinticIn(t) {
	return t * t * t * t * t;
}

export function qinticOut(t) {
	return --t * t * t * t * t + 1;
}

export function sineInOut(t) {
	return -0.5 * (Math.cos(Math.PI * t) - 1);
}

export function sineIn(t) {
	var v = Math.cos(t * Math.PI * 0.5);
	if (Math.abs(v) < 1e-14) return 1;
	else return 1 - v;
}

export function sineOut(t) {
	return Math.sin((t * Math.PI) / 2);
}
