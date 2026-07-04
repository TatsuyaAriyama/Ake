// コンパスの"脇役"ミニマップ。現在地・目的地・両者を結ぶ線を表示。
// 地図スタイルは目的地ピッカーと共通の buildMapStyle()（朱雀のブランド配色）を使う。
//
// 「迷わない」設計: 歩いている間、現在地が常に画面内に収まるよう自動追従する
// （以前は目的地確定時に一度だけフレーミングし、以後は追従しなかった）。
// ただしユーザーが指で動かした/ズームしたら自動追従を止め、探索を邪魔しない。
// 「現在地に戻す」ボタンでいつでも自動追従を再開できる。

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { hasMap, buildMapStyle, ACCENT } from '../lib/mapStyle';
import type { LatLon } from '../lib/geo';
import { t } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

interface Props {
  me: LatLon | null;
  destination: LatLon | null;
  /** 端末ヘディング（真北基準, 度）。現在地マーカーの向き表示に使う。 */
  heading: number | null;
  lang: Lang;
}

function meElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-me';
  el.innerHTML = `
    <span class="map-me__wedge"></span>
    <span class="map-me__dot"></span>
  `;
  return el;
}

function destElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-dest';
  return el;
}

export function MiniMap({ me, destination, heading, lang }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);
  const wedgeRef = useRef<HTMLElement | null>(null);
  const readyRef = useRef(false);
  // 自動追従中か。true の間は現在地・目的地が常に画面内に収まるよう毎回フレーミングする。
  const autoFollowRef = useRef(true);
  const [autoFollow, setAutoFollow] = useState(true);

  // 初期化（1回）
  useEffect(() => {
    if (!containerRef.current || !hasMap()) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: me ? [me.lon, me.lat] : [139.767, 35.681],
      zoom: 13,
      minZoom: 3,
      maxZoom: 18,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    // 回転だけ止める。ピンチ/スクロール/ダブルタップのズームは自由に残す。
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );
    mapRef.current = map;

    // ユーザー自身の操作（ドラッグ/ピンチ/ホイール）でカメラが動き始めたら自動追従を止める。
    // originalEvent はプログラム側の fitBounds/easeTo では undefined になるため、
    // 「ユーザーが触ったかどうか」の判定に使える（MapLibre/Mapbox GL の定石）。
    map.on('movestart', (e) => {
      if (e.originalEvent) {
        autoFollowRef.current = false;
        setAutoFollow(false);
      }
    });

    map.on('load', () => {
      readyRef.current = true;
      // 目的地への直線
      map.addSource('link', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'link',
        type: 'line',
        source: 'link',
        paint: {
          'line-color': ACCENT,
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      });
      sync();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      autoFollowRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マーカー・線・フレーミングの同期
  const sync = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // 現在地マーカー
    if (me) {
      if (!meMarker.current) {
        const el = meElement();
        wedgeRef.current = el.querySelector('.map-me__wedge');
        meMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([me.lon, me.lat])
          .addTo(map);
      } else {
        meMarker.current.setLngLat([me.lon, me.lat]);
      }
    }

    // 目的地マーカー
    if (destination) {
      if (!destMarker.current) {
        destMarker.current = new maplibregl.Marker({ element: destElement(), anchor: 'bottom' })
          .setLngLat([destination.lon, destination.lat])
          .addTo(map);
      } else {
        destMarker.current.setLngLat([destination.lon, destination.lat]);
      }
    } else if (destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }

    // 直線
    const link = map.getSource('link') as maplibregl.GeoJSONSource | undefined;
    if (link) {
      const coords = me && destination
        ? [[me.lon, me.lat], [destination.lon, destination.lat]]
        : [];
      link.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
    }

    // 自動追従中は、歩いて現在地が動くたびに現在地(+目的地)を画面内に収め直す。
    // ユーザーが手で動かした後は触らない（explore を邪魔しない）— 再開は「現在地に戻す」ボタンで。
    if (autoFollowRef.current && me && destination) {
      const b = new maplibregl.LngLatBounds(
        [me.lon, me.lat],
        [me.lon, me.lat]
      );
      b.extend([destination.lon, destination.lat]);
      map.fitBounds(b, { padding: 56, maxZoom: 15, duration: 600 });
    } else if (autoFollowRef.current && me) {
      map.easeTo({ center: [me.lon, me.lat], zoom: 14, duration: 400 });
    }
  };

  // 位置・目的地が変わったら同期
  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.lat, me?.lon, destination?.lat, destination?.lon]);

  // 目的地が変わったら自動追従を再開（新しい旅として、まず全体を映す）
  useEffect(() => {
    autoFollowRef.current = true;
    setAutoFollow(true);
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lon]);

  const recenter = () => {
    autoFollowRef.current = true;
    setAutoFollow(true);
    sync();
  };

  // ヘディングでウェッジを回転
  useEffect(() => {
    if (wedgeRef.current && heading != null) {
      wedgeRef.current.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;
    }
  }, [heading]);

  if (!hasMap()) {
    return <div className="minimap minimap--empty" />;
  }
  return (
    <div className="minimap-shell">
      <div className="minimap" ref={containerRef} />
      {!autoFollow && (
        <button className="map-recenter" onClick={recenter} aria-label={t('recenter', lang)}>
          <RecenterIcon />
        </button>
      )}
    </div>
  );
}

function RecenterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
    </svg>
  );
}
