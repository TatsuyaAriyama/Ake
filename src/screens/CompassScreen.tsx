import { useEffect, useRef } from 'react';
import { Compass } from '../components/Compass';
import { ArrivalMark } from '../components/ArrivalMark';
import { MiniMap } from '../components/MiniMap';
import { useNavigation, ARRIVE_THRESHOLD_M } from '../store/useNavigation';
import { useDestination } from '../store/destinationStore';
import { useHeading } from '../store/headingStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { formatDistance, formatDistanceImperial } from '../lib/geo';
import { tapLight, tapMedium, arriveBuzz } from '../lib/haptics';
import { t, type StringKey } from '../lib/i18n';

// 距離の節目（m, 降順）。内側へ横切るたびに軽い触覚で「近づいた」を知らせる。
// ポケットの中でも進捗が分かるように。50m 以内は強め。
const DISTANCE_MILESTONES = [500, 200, 100, 50];

/** 針の指す先を言葉でも伝える。一瞥の分かりやすさは針＋ことばの二重表現で担保する。 */
function turnCueKey(offsetDeg: number): StringKey {
  const abs = Math.abs(offsetDeg);
  if (abs > 135) return 'behind';
  if (abs > 30) return offsetDeg > 0 ? 'turnRight' : 'turnLeft';
  return offsetDeg > 0 ? 'turnSlightRight' : 'turnSlightLeft';
}

interface Props {
  onChooseDestination: () => void;
  onOpenSettings: () => void;
}

export function CompassScreen({ onChooseDestination, onOpenSettings }: Props) {
  const nav = useNavigation();
  const dest = useDestination((s) => s.current);
  const lowAccuracy = useHeading((s) => s.lowAccuracy);
  const smoothedMagnetic = useHeading((s) => s.smoothedMagnetic);
  const declination = useHeading((s) => s.declination);
  const locError = useLocation((s) => s.error);
  const fix = useLocation((s) => s.fix);
  const { units, haptics, lang, northRef } = useSettings();

  const wasAligned = useRef(false);
  const wasArrived = useRef(false);
  const bandRef = useRef(0);
  const bandInitRef = useRef(false);

  // 整列トグルでハプティクス（立ち上がりのみ）
  useEffect(() => {
    if (nav.hasArrived) return;
    if (nav.isAligned && !wasAligned.current) {
      if (haptics) void tapLight();
    }
    wasAligned.current = nav.isAligned;
  }, [nav.isAligned, nav.hasArrived, haptics]);

  // 到着でハプティクス（立ち上がりのみ）
  useEffect(() => {
    if (nav.hasArrived && !wasArrived.current) {
      if (haptics) void arriveBuzz();
    }
    wasArrived.current = nav.hasArrived;
  }, [nav.hasArrived, haptics]);

  // 目的地が変わったら距離帯の記憶をリセット（新しい旅として再カウント）
  useEffect(() => {
    bandRef.current = 0;
    bandInitRef.current = false;
  }, [dest?.lat, dest?.lon]);

  // 距離の節目を内側へ横切ったら触覚で知らせる。ヒステリシス(×1.12)で明滅防止。
  useEffect(() => {
    const d = nav.distanceM;
    if (d == null || nav.hasArrived) return;

    let band = bandRef.current;
    while (band < DISTANCE_MILESTONES.length && d < DISTANCE_MILESTONES[band]) band++;
    while (band > 0 && d > DISTANCE_MILESTONES[band - 1] * 1.12) band--;

    // 初回は現在の距離帯を無音で記録（購読開始時の連打を避ける）
    if (!bandInitRef.current) {
      bandInitRef.current = true;
      bandRef.current = band;
      return;
    }

    if (band > bandRef.current) {
      // 50m 圏(最内)だけ強め、それ以外は軽く
      if (haptics) void (band >= DISTANCE_MILESTONES.length ? tapMedium() : tapLight());
    }
    bandRef.current = band;
  }, [nav.distanceM, nav.hasArrived, haptics]);

  const headingTrue =
    smoothedMagnetic != null
      ? (smoothedMagnetic + (northRef === 'true' ? declination : 0) + 360) % 360
      : null;

  const dist =
    nav.distanceM != null
      ? units === 'km'
        ? formatDistance(nav.distanceM)
        : formatDistanceImperial(nav.distanceM)
      : null;

  // 目的地への近さ 0..1。到着圏(35m)で1、BREATHE_RANGE(500m)以遠で0。
  // コンパスの"鼓動"が近づくほど速まる（数字を足さずリズムで伝える）。
  const BREATHE_RANGE_M = 500;
  const nearness =
    nav.distanceM != null
      ? Math.max(
          0,
          Math.min(
            1,
            1 - (nav.distanceM - ARRIVE_THRESHOLD_M) / (BREATHE_RANGE_M - ARRIVE_THRESHOLD_M)
          )
        )
      : 0;

  return (
    <div className="compass-screen">
      <div className="topbar">
        <button className="icon-btn" onClick={onOpenSettings} aria-label={t('settings', lang)}>
          <GearIcon />
        </button>
        <button
          className="icon-btn"
          onClick={onChooseDestination}
          aria-label={t('changeDestination', lang)}
        >
          <PinIcon />
        </button>
      </div>

      <div className="compass-region">
      {!dest ? (
        <div className="arrival">
          <Compass needle={null} aligned={false} />
          <button className="btn-primary" onClick={onChooseDestination}>
            {t('setDestination', lang)}
          </button>
        </div>
      ) : nav.hasArrived ? (
        <div className="arrival">
          <ArrivalMark />
          <div className="arrival__label">{t('arrived', lang)}</div>
          {dest && <div className="dest-name">{dest.name}</div>}
        </div>
      ) : (
        <>
          <Compass
            needle={nav.needle}
            aligned={nav.isAligned}
            offsetDeg={nav.offsetDeg}
            headingForLabels={headingTrue}
            nearness={nearness}
          />
          {dist && (
            <div className="distance">
              <span className="distance__value">{dist.value}</span>
              <span className="distance__unit">{dist.unit}</span>
            </div>
          )}
          {dest && <div className="dest-name">{dest.name}</div>}
          <div className="hint">
            {locError
              ? t('permissionDenied', lang)
              : !fix
                ? t('locating', lang)
                : nav.isAligned
                  ? <span className="aligned-note">{t('aligned', lang)}</span>
                  : lowAccuracy
                    ? t('calibrate', lang)
                    : nav.offsetDeg != null
                      ? t(turnCueKey(nav.offsetDeg), lang)
                      : t('holdFlat', lang)}
          </div>
        </>
      )}
      </div>
      <MiniMap me={fix} destination={dest} heading={headingTrue} lang={lang} />
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21c4-5 7-8.5 7-12a7 7 0 0 0-14 0c0 3.5 3 7 7 12z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
