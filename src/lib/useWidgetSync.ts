// 目的地・現在地・設定の変化をウィジェットへ同期する。
// 位置更新は頻度が高いので、目的地変更/一定距離/一定時間で間引く
// （WidgetKit のタイムライン更新は iOS の予算があるため）。

import { useEffect, useRef } from 'react';
import { useDestination } from '../store/destinationStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { bearing, distance } from './geo';
import { updateWidgetSnapshot, type WidgetSnapshot } from './widgetBridge';

const MIN_INTERVAL_MS = 30_000; // 位置由来の反映は最短30秒間隔
const MIN_DISTANCE_DELTA_M = 40; // 40m以上の距離変化なら間隔を待たず反映

interface LastWrite {
  at: number;
  distanceM: number;
  destKey: string;
  units: string;
  lang: string;
}

export function useWidgetSync(): void {
  const dest = useDestination((s) => s.current);
  const destHydrated = useDestination((s) => s.hydrated);
  const fix = useLocation((s) => s.fix);
  const units = useSettings((s) => s.units);
  const lang = useSettings((s) => s.lang);
  const settingsHydrated = useSettings((s) => s.hydrated);

  const last = useRef<LastWrite | null>(null);

  useEffect(() => {
    // 永続値の読み込み前は書かない（ブート直後の「目的地なし」誤書き込みを防ぐ）。
    if (!destHydrated || !settingsHydrated) return;

    const destKey = dest ? `${dest.lat},${dest.lon},${dest.name}` : '';
    let distanceM = -1;
    let bearingTrue = -1;
    if (dest && fix) {
      distanceM = distance(fix, dest);
      bearingTrue = bearing(fix, dest);
    }

    const now = Date.now();
    const prev = last.current;
    const destChanged = !prev || prev.destKey !== destKey;
    const settingsChanged = !prev || prev.units !== units || prev.lang !== lang;
    // 距離が「不明(-1) ⇄ 既知(>=0)」を跨いだら即反映する。
    // 例: 起動直後は目的地だけ復元され fix が未取得(-1)で書き込み、その数秒後に
    // GPS が取れても他の条件が立たず、最大30秒「距離不明」のまま残るのを防ぐ。
    const fixAvailabilityChanged =
      !!prev && (distanceM >= 0) !== (prev.distanceM >= 0);
    const movedEnough =
      !!prev &&
      distanceM >= 0 &&
      prev.distanceM >= 0 &&
      Math.abs(distanceM - prev.distanceM) >= MIN_DISTANCE_DELTA_M;
    const staleEnough = !prev || now - prev.at >= MIN_INTERVAL_MS;

    if (
      !destChanged &&
      !settingsChanged &&
      !fixAvailabilityChanged &&
      !movedEnough &&
      !staleEnough
    )
      return;

    const snapshot: WidgetSnapshot = {
      hasDestination: !!dest,
      destName: dest?.name ?? '',
      destLat: dest?.lat ?? 0,
      destLon: dest?.lon ?? 0,
      hasFix: !!fix,
      fixLat: fix?.lat ?? 0,
      fixLon: fix?.lon ?? 0,
      distanceM,
      bearingTrue,
      units,
      lang,
      updatedAt: now,
    };

    last.current = { at: now, distanceM, destKey, units, lang };
    void updateWidgetSnapshot(snapshot);
  }, [dest, fix, units, lang, destHydrated, settingsHydrated]);
}
