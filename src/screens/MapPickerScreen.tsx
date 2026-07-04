import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildMapStyle } from '../lib/mapStyle';
import { reverseGeocode } from '../lib/geocoding';
import { useDestination } from '../store/destinationStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import type { LatLon } from '../lib/geo';
import { t } from '../lib/i18n';

interface Props {
  onDone: () => void;
  onBack: () => void;
}

// 目的地未設定でも地図を出せるよう、既定は東京駅付近。
const DEFAULT_CENTER: LatLon = { lat: 35.681, lon: 139.767 };

export function MapPickerScreen({ onDone, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const centerRef = useRef<LatLon>(DEFAULT_CENTER);
  const [busy, setBusy] = useState(false);
  const setDestination = useDestination((s) => s.setDestination);
  const currentDest = useDestination((s) => s.current);
  const fix = useLocation((s) => s.fix);
  const lang = useSettings((s) => s.lang);

  useEffect(() => {
    if (!containerRef.current) return;
    const start: LatLon = currentDest ?? fix ?? DEFAULT_CENTER;
    centerRef.current = start;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: [start.lon, start.lat],
      zoom: 14,
      minZoom: 4,
      maxZoom: 19,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    // 回転だけ止める。ピンチ/スクロール/ダブルタップのズームは自由に残す。
    map.touchZoomRotate.disableRotation();
    map.on('move', () => {
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lon: c.lng };
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // マウント時に一度だけ生成。中心は centerRef で追う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const at = centerRef.current;
    let name: string;
    try {
      name = await reverseGeocode(at);
    } catch {
      name = `${at.lat.toFixed(4)}, ${at.lon.toFixed(4)}`;
    }
    setDestination({ name, lat: at.lat, lon: at.lon });
    onDone();
  };

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 150 });
  };

  return (
    <div className="sheet sheet--map">
      <div className="sheet__head">
        <button className="btn-ghost" onClick={onBack}>
          ‹ {t('back', lang)}
        </button>
        <div className="sheet__title">{t('pickOnMap', lang)}</div>
      </div>

      <div className="map-wrap">
        <div ref={containerRef} className="map-canvas" />
        <div className="map-pin" aria-hidden>
          <MapPin />
        </div>
        <div className="map-hint">{t('dragToAim', lang)}</div>
        <div className="map-zoom">
          <button
            className="map-zoom__btn"
            onClick={() => zoomBy(1)}
            aria-label={t('zoomIn', lang)}
          >
            +
          </button>
          <button
            className="map-zoom__btn"
            onClick={() => zoomBy(-1)}
            aria-label={t('zoomOut', lang)}
          >
            −
          </button>
        </div>
      </div>

      <button className="btn-primary map-confirm" onClick={confirm} disabled={busy}>
        {t('goHere', lang)}
      </button>
    </div>
  );
}

function MapPin() {
  // コンパスの南針と同じ手描き言語。軸は ink、先端は accent。
  return (
    <svg width="30" height="42" viewBox="0 0 30 42" fill="none">
      <line x1="15" y1="8" x2="15" y2="34" stroke="#181311" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="8" r="6" fill="#9f3327" />
      <circle cx="15" cy="36" r="2" fill="#181311" />
    </svg>
  );
}
