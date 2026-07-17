// ホーム/ロック画面ウィジェットへのデータ橋渡し。
// ネイティブ(iOS)では Capacitor プラグイン SuzakuWidget が App Group に書き込み、
// WidgetKit のタイムラインを更新する。Web では何もしない（no-op）。

import { Capacitor, registerPlugin } from '@capacitor/core';

/** ウィジェットへ渡すスナップショット。座標は生値、距離・方位は算出済み。 */
export interface WidgetSnapshot {
  hasDestination: boolean;
  destName: string;
  destLat: number;
  destLon: number;
  hasFix: boolean;
  fixLat: number;
  fixLon: number;
  /** 直線距離(m)。不明なら -1。 */
  distanceM: number;
  /** 真北基準の目的地方位(度, 0=北, 時計回り)。不明なら -1。 */
  bearingTrue: number;
  units: 'km' | 'mi';
  lang: 'ja' | 'en';
  /** 生成時刻(ms epoch)。 */
  updatedAt: number;
}

interface SuzakuWidgetPlugin {
  update(snapshot: WidgetSnapshot): Promise<void>;
  clear(): Promise<void>;
}

const SuzakuWidget = registerPlugin<SuzakuWidgetPlugin>('SuzakuWidget');

const isNative = Capacitor.getPlatform() !== 'web';

/** 最新スナップショットをウィジェットへ反映。Web/未実装環境では黙って no-op。 */
export async function updateWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!isNative) return;
  try {
    await SuzakuWidget.update(snapshot);
  } catch {
    // プラグイン未組込み等は無視（コンパス本体には影響しない）。
  }
}

/** ウィジェット表示をクリア（目的地なし相当）。 */
export async function clearWidgetSnapshot(): Promise<void> {
  if (!isNative) return;
  try {
    await SuzakuWidget.clear();
  } catch {
    // ignore
  }
}
