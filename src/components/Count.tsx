import * as Mod from "react-countup";
import type { ComponentType } from "react";
type P = { end: number; duration?: number; separator?: string; preserveValue?: boolean; enableScrollSpy?: boolean; scrollSpyOnce?: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m: any = Mod;
const CountUp: ComponentType<P> = m.default?.default ?? m.default ?? m;
export default CountUp;
