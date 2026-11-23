// 26-byte secret loader: logic in solver_min.ts (imported).
import s from './solver_min.ts';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
s(I, O);
