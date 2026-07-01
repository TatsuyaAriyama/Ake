import { useEffect, useRef } from 'react';
import { Compass } from '../components/Compass';
import { ArrivalMark } from '../components/ArrivalMark';
import { useNavigation } from '../store/useNavigation';
import { useDestination } from '../store/destinationStore';
import { useHeading } from '../store/headingStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { formatDistance, formatDistanceImperial } from '../lib/geo';
import { tapLight, arriveBuzz } from '../lib/haptics';
import { t } from '../lib/i18n';

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
            headingForLabels={headingTrue}
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
                    : t('holdFlat', lang)}
          </div>
        </>
      )}
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
