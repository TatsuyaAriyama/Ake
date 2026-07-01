// 循環量（角度）のスムージング。0/360 の折り返しを正しく扱う。

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * 循環移動平均。直近サンプルの sin/cos をそれぞれ指数平滑し atan2 で戻す。
 * ジッター除去 + 折り返し安全。
 */
export class CircularSmoother {
  private sin = 0;
  private cos = 0;
  private primed = false;

  /** 平滑係数 α（0<α≤1）。小さいほど滑らかで遅延が増える。 */
  constructor(private alpha = 0.15) {}

  push(deg: number): number {
    const r = deg * D2R;
    const s = Math.sin(r);
    const c = Math.cos(r);
    if (!this.primed) {
      this.sin = s;
      this.cos = c;
      this.primed = true;
    } else {
      this.sin += this.alpha * (s - this.sin);
      this.cos += this.alpha * (c - this.cos);
    }
    const out = Math.atan2(this.sin, this.cos) * R2D;
    return (out + 360) % 360;
  }

  reset(): void {
    this.primed = false;
    this.sin = 0;
    this.cos = 0;
  }
}

/**
 * 累積角トラッカー。表示用に「最短方向で連続回転」する角度を出す。
 * 359→0 で長回りしないよう、累積値として保持する。
 */
export class UnwrappedAngle {
  private acc = 0;
  private primed = false;

  update(target: number): number {
    if (!this.primed) {
      this.acc = target;
      this.primed = true;
      return this.acc;
    }
    // 現在の累積角と目標(0..360)の最短差分を足し込む
    const current = ((this.acc % 360) + 360) % 360;
    let delta = ((target - current) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    this.acc += delta;
    return this.acc;
  }

  get value(): number {
    return this.acc;
  }

  reset(): void {
    this.primed = false;
    this.acc = 0;
  }
}
