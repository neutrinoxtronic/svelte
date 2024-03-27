export const DERIVED = 1 << 1;
export const EFFECT = 1 << 2;
export const PRE_EFFECT = 1 << 3;
export const RENDER_EFFECT = 1 << 4;
export const BLOCK_EFFECT = 1 << 5;
export const BRANCH_EFFECT = 1 << 6;
export const ROOT_EFFECT = 1 << 7;
export const UNOWNED = 1 << 8;
export const CLEAN = 1 << 9;
export const DIRTY = 1 << 10;
export const MAYBE_DIRTY = 1 << 11;
export const INERT = 1 << 12;
export const DESTROYED = 1 << 13;
export const IS_ELSEIF = 1 << 14;
export const EFFECT_RAN = 1 << 15;

export const UNINITIALIZED = Symbol();
export const STATE_SYMBOL = Symbol('$state');
