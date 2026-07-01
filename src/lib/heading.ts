// コンパスヘディングのパイプライン（DeviceOrientation API）。
// 生の「磁北基準ヘディング」を emit する。偏角補正・平滑化は store 側で行う。

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface HeadingSample {
  /** 磁北基準ヘディング（端末が向いている方向、0=磁北、時計回り 0–360）。 */
  magnetic: number;
  /** キャリブレーション精度が悪い可能性（Android の accuracy 等）。 */
  lowAccuracy: boolean;
}

type Listener = (s: HeadingSample) => void;

interface DOEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

function screenAngle(): number {
  const so = screen.orientation as ScreenOrientation | undefined;
  if (so && typeof so.angle === 'number') return so.angle;
  // 古い実装のフォールバック
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

export class HeadingSource {
  private listeners = new Set<Listener>();
  private active = false;
  private handler: ((e: DeviceOrientationEvent) => void) | null = null;
  private eventName: 'deviceorientation' | 'deviceorientationabsolute' =
    'deviceorientation';

  /** iOS 13+ は requestPermission が必要。ユーザー操作起点で呼ぶこと。 */
  async requestPermission(): Promise<PermissionState> {
    const anyDOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof anyDOE?.requestPermission === 'function') {
      try {
        const res = await anyDOE.requestPermission();
        return res === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }
    // requestPermission が無い環境（Android/Desktop）はイベント有無で判定
    if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
    return 'granted';
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    this.start();
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private emit(s: HeadingSample) {
    for (const l of this.listeners) l(s);
  }

  start(): void {
    if (this.active) return;
    // absolute を優先（Android の真の方位）。iOS は webkitCompassHeading を使う。
    this.eventName =
      'ondeviceorientationabsolute' in window
        ? 'deviceorientationabsolute'
        : 'deviceorientation';

    this.handler = (e: DeviceOrientationEvent) => {
      const ev = e as DOEvent;
      const screenAdj = screenAngle();
      let magnetic: number | null = null;
      let lowAccuracy = false;

      if (typeof ev.webkitCompassHeading === 'number') {
        // iOS: webkitCompassHeading は磁北基準（0=北, 時計回り）。
        magnetic = ev.webkitCompassHeading;
        if (typeof ev.webkitCompassAccuracy === 'number') {
          lowAccuracy = ev.webkitCompassAccuracy < 0 || ev.webkitCompassAccuracy > 25;
        }
      } else if (ev.absolute && typeof ev.alpha === 'number') {
        // Android absolute: heading ≈ (360 − alpha)
        magnetic = (360 - ev.alpha) % 360;
      } else if (typeof ev.alpha === 'number') {
        // 非 absolute の alpha（相対）。精度は落ちるがフォールバック。
        magnetic = (360 - ev.alpha) % 360;
        lowAccuracy = true;
      }

      if (magnetic == null || Number.isNaN(magnetic)) return;
      // 画面回転補正
      magnetic = (magnetic + screenAdj + 360) % 360;
      this.emit({ magnetic, lowAccuracy });
    };

    window.addEventListener(this.eventName, this.handler, true);
    this.active = true;
  }

  stop(): void {
    if (!this.active || !this.handler) return;
    window.removeEventListener(this.eventName, this.handler, true);
    this.active = false;
    this.handler = null;
  }
}

export const headingSource = new HeadingSource();
