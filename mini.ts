// 26-byte secret loader: logic lives in solver.ts (imported).
import s from './solver.ts';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
s(I, O);
