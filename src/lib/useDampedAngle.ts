// 針の連続回転 + ダンピング。累積角で最短方向に追従し、
// requestAnimationFrame でクリティカルダンプ気味に補間する。

import { useEffect, useRef, useState } from 'react';
import { UnwrappedAngle } from './smoothing';

/**
 * @param target 目標角（0..360, null なら停止）
 * @param stiffness 追従の速さ（大きいほど速い）
 */
export function useDampedAngle(target: number | null, stiffness = 6): number {
  const [display, setDisplay] = useState(0);
  const unwrap = useRef(new UnwrappedAngle());
  const posRef = useRef(0);
  const velRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const snappedRef = useRef(false);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const tick = (now: number) => {
      const last = lastRef.current || now;
      let dt = (now - last) / 1000;
      lastRef.current = now;
      if (dt > 0.05) dt = 0.05; // 大きな飛びを抑制

      const tgt = targetRef.current;
      if (tgt != null) {
        const goal = unwrap.current.update(tgt);
        if (!snappedRef.current) {
          // 初回はスイープせず即座に合わせる
          posRef.current = goal;
          velRef.current = 0;
          snappedRef.current = true;
          setDisplay(goal);
        } else {
          // クリティカルダンプのばね
          const k = stiffness * stiffness;
          const c = 2 * stiffness;
          const a = k * (goal - posRef.current) - c * velRef.current;
          velRef.current += a * dt;
          posRef.current += velRef.current * dt;
          setDisplay(posRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stiffness]);

  return display;
}
