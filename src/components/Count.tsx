import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

type P = { end: number; duration?: number; separator?: string; preserveValue?: boolean; enableScrollSpy?: boolean; scrollSpyOnce?: boolean };

/** Animated number counter (SSR-safe). */
export default function CountUp({ end, duration = 1.2 }: P) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(prev.current, end, { duration, onUpdate: (x) => setV(x) });
    prev.current = end;
    return () => c.stop();
  }, [end, inView, duration]);
  return <span ref={ref}>{Math.round(v).toLocaleString("en-IN")}</span>;
}
