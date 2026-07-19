import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  searchPlaces,
  hasGeocoder,
  nameKey,
  STATION_CATEGORY,
  type Place,
} from '../lib/geocoding';
import { hasMap } from '../lib/mapStyle';
import {
  loadStations,
  searchStations,
  stationName,
  stationLines,
  stationOperators,
  type Station,
} from '../lib/stations';
import {
  NEARBY_CATEGORIES,
  searchNearby,
  categoryLabel,
  poiLabel,
  type NearbyCategory,
} from '../lib/nearby';
import { distance, formatDistance, formatDistanceImperial } from '../lib/geo';
import {
  useDestination,
  sameSpot,
  type Destination,
} from '../store/destinationStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { t, type Lang } from '../lib/i18n';

// 地図（maplibre-gl）は目的地選択を開いたときだけ読み込む。
// コンパス本体はオフライン動作のため初期バンドルに含めない。
const MapPickerScreen = lazy(() =>
  import('./MapPickerScreen').then((m) => ({ default: m.MapPickerScreen }))
);
const StationDetailScreen = lazy(() =>
  import('./StationDetailScreen').then((m) => ({
    default: m.StationDetailScreen,
  }))
);

interface Props {
  onDone: () => void;
}

export function DestinationScreen({ onDone }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [stationHits, setStationHits] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [station, setStation] = useState<Station | null>(null);
  const [activeCat, setActiveCat] = useState<NearbyCategory | null>(null);
  const [nearby, setNearby] = useState<Place[]>([]);
  const [nearbyState, setNearbyState] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  );
  const stationsRef = useRef<Station[] | null>(null);
  const setDestination = useDestination((s) => s.setDestination);
  const history = useDestination((s) => s.history);
  const favorites = useDestination((s) => s.favorites);
  const toggleFavorite = useDestination((s) => s.toggleFavorite);
  const fix = useLocation((s) => s.fix);
  const { lang, units } = useSettings();
  const abortRef = useRef<AbortController | null>(null);
  const nearbyAbortRef = useRef<AbortController | null>(null);

  const isFav = (d: Destination | Place) =>
    favorites.some((f) => sameSpot(f, d));

  const fmtDist = (m: number) =>
    units === 'km' ? formatDistance(m) : formatDistanceImperial(m);

  // Place と Station の双方を受けるため、座標だけを要求する。
  const distOf = (p: { lat: number; lon: number; distanceM?: number }) => {
    const m = p.distanceM ?? (fix ? distance(fix, p) : null);
    return m == null ? null : fmtDist(m);
  };

  // 駅は同梱データからローカルで即時検索（オフライン・低遅延）。
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setStationHits([]);
      return;
    }
    let alive = true;
    (async () => {
      const list = stationsRef.current ?? (stationsRef.current = await loadStations());
      if (!alive) return;
      setStationHits(searchStations(list, q, 6));
    })();
    return () => {
      alive = false;
    };
  }, [query]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (!hasGeocoder()) return;
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        const r = await searchPlaces(query, {
          near: fix ?? undefined,
          lang,
          signal: ctrl.signal,
        });
        setResults(r);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(String(e));
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, fix, lang]);

  // カテゴリを選ぶと現在地まわりを Overpass で検索。
  useEffect(() => {
    if (!activeCat || !fix) return;
    const ctrl = new AbortController();
    nearbyAbortRef.current?.abort();
    nearbyAbortRef.current = ctrl;
    setNearbyState('loading');
    setNearby([]);
    (async () => {
      try {
        const r = await searchNearby(
          activeCat,
          fix,
          categoryLabel(activeCat, lang),
          lang,
          ctrl.signal
        );
        setNearby(r);
        setNearbyState('idle');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setNearbyState('error');
      }
    })();
    return () => ctrl.abort();
  }, [activeCat, fix, lang]);

  const pickCategory = (cat: NearbyCategory) => {
    setQuery('');
    setActiveCat((cur) => (cur?.id === cat.id ? null : cat));
  };

  // 上の「駅」セクションに出ている駅は「その他の場所」から除く。
  // 収録外（東京以外）の駅は Photon 側の 1 件が残るので取りこぼさない。
  const otherResults = results.filter((r) => {
    if (r.category !== STATION_CATEGORY) return true;
    const k = nameKey(r.name);
    return !stationHits.some(
      (s) =>
        nameKey(s.name) === k ||
        nameKey(s.en) === k ||
        distance(r, s) < 800 // 表記が違っても座標で同一と判定できるように
    );
  });

  const choose = (d: Destination | Place) => {
    setDestination(d);
    onDone();
  };

  if (mapOpen) {
    return (
      <Suspense fallback={<div className="sheet" />}>
        <MapPickerScreen onDone={onDone} onBack={() => setMapOpen(false)} />
      </Suspense>
    );
  }

  if (station) {
    return (
      <Suspense fallback={<div className="sheet" />}>
        <StationDetailScreen
          station={station}
          onDone={onDone}
          onBack={() => setStation(null)}
        />
      </Suspense>
    );
  }

  return (
    <div className="sheet">
      <div className="sheet__head">
        <button className="btn-ghost" onClick={onDone}>
          ‹ {t('back', lang)}
        </button>
        <div className="sheet__title">{t('setDestination', lang)}</div>
      </div>

      <input
        className="search-input"
        placeholder={t('searchPlaceholder', lang)}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim()) setActiveCat(null);
        }}
        autoFocus
        enterKeyHint="search"
      />

      {hasMap() && (
        <button className="btn-outline map-open" onClick={() => setMapOpen(true)}>
          <MapGlyph />
          {t('chooseOnMap', lang)}
        </button>
      )}

      {fix && (
        <div className="cats">
          {NEARBY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className="cat-chip"
              data-active={activeCat?.id === c.id}
              onClick={() => pickCategory(c)}
            >
              {categoryLabel(c, lang)}
            </button>
          ))}
        </div>
      )}

      {error && <div className="notice">{error}</div>}

      {activeCat ? (
        <div className="results">
          <div className="section-label">
            {lang === 'en'
              ? `${t('nearbyOf', lang)} ${categoryLabel(activeCat, lang)}`
              : `${t('nearbyOf', lang)}${categoryLabel(activeCat, lang)}`}
          </div>
          {nearbyState === 'loading' && (
            <div className="hint hint--pad">{t('searching', lang)}</div>
          )}
          {nearbyState === 'error' && (
            <div className="notice">{t('nearbyFailed', lang)}</div>
          )}
          {nearbyState === 'idle' && nearby.length === 0 && (
            <div className="hint hint--pad">{t('noResults', lang)}</div>
          )}
          {nearby.length > 0 && (
            <>
              <ul className="results__list">
                {nearby.map((r) => (
                  <PlaceRow
                    key={r.id}
                    place={r}
                    lang={lang}
                    fav={isFav(r)}
                    dist={distOf(r)}
                    onChoose={() => choose(r)}
                    onToggleFav={() => toggleFavorite(r)}
                  />
                ))}
              </ul>
              <div className="source-note">{t('poiSourceOsm', lang)}</div>
            </>
          )}
        </div>
      ) : stationHits.length > 0 || otherResults.length > 0 ? (
        <div className="results">
          {stationHits.length > 0 && (
            <>
              <div className="section-label">{t('stations', lang)}</div>
              <ul className="results__list">
                {stationHits.map((s) => {
                  const lines = stationLines(s, lang);
                  const ops = stationOperators(s, lang);
                  const sub = lines.length > 0 ? lines : ops;
                  const d = distOf(s);
                  return (
                    <li key={`st-${s.lat},${s.lon}`} className="result">
                      <button
                        className="result__main"
                        onClick={() => setStation(s)}
                      >
                        <span className="result__name">
                          {stationName(s, lang)}
                        </span>
                        {sub.length > 0 && (
                          <span className="result__ctx">{sub.join(' · ')}</span>
                        )}
                      </button>
                      {d && (
                        <span className="result__dist">
                          {d.value}
                          <span className="result__dist-unit">{d.unit}</span>
                        </span>
                      )}
                      <span className="result__chevron" aria-hidden>›</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {otherResults.length > 0 && (
            <>
              {stationHits.length > 0 && (
                <div className="section-label">{t('otherPlaces', lang)}</div>
              )}
              <ul className="results__list">
                {otherResults.map((r) => (
                  <PlaceRow
                    key={r.id}
                    place={r}
                    lang={lang}
                    fav={isFav(r)}
                    dist={distOf(r)}
                    onChoose={() => choose(r)}
                    onToggleFav={() => toggleFavorite(r)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="results">
          {favorites.length > 0 && (
            <>
              <div className="section-label">{t('favorites', lang)}</div>
              <ul className="results__list">
                {favorites.map((f, i) => (
                  <li key={`fav-${f.lat},${f.lon},${i}`} className="result">
                    <button className="result__main" onClick={() => choose(f)}>
                      <span className="result__name">{f.name}</span>
                      <span className="result__ctx">
                        {f.lat.toFixed(4)}, {f.lon.toFixed(4)}
                      </span>
                    </button>
                    <StarButton on lang={lang} onClick={() => toggleFavorite(f)} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {history.filter((h) => !isFav(h)).length > 0 && (
            <>
              <div className="section-label">{t('history', lang)}</div>
              <ul className="results__list">
                {history
                  .filter((h) => !isFav(h))
                  .map((h, i) => (
                    <li key={`his-${h.lat},${h.lon},${i}`} className="result">
                      <button className="result__main" onClick={() => choose(h)}>
                        <span className="result__name">{h.name}</span>
                        <span className="result__ctx">
                          {h.lat.toFixed(4)}, {h.lon.toFixed(4)}
                        </span>
                      </button>
                      <StarButton
                        on={false}
                        lang={lang}
                        onClick={() => toggleFavorite(h)}
                      />
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PlaceRow({
  place,
  lang,
  fav,
  dist,
  onChoose,
  onToggleFav,
}: {
  place: Place;
  lang: Lang;
  fav: boolean;
  dist: { value: string; unit: string } | null;
  onChoose: () => void;
  onToggleFav: () => void;
}) {
  const badge = poiLabel(place.category, lang);
  const ctx = [badge, place.context].filter(Boolean).join(' · ');
  return (
    <li className="result">
      <button className="result__main" onClick={onChoose}>
        <span className="result__name">{place.name}</span>
        {ctx && <span className="result__ctx">{ctx}</span>}
      </button>
      {dist && (
        <span className="result__dist">
          {dist.value}
          <span className="result__dist-unit">{dist.unit}</span>
        </span>
      )}
      <StarButton on={fav} lang={lang} onClick={onToggleFav} />
    </li>
  );
}

function StarButton({
  on,
  lang,
  onClick,
}: {
  on: boolean;
  lang: Lang;
  onClick: () => void;
}) {
  return (
    <button
      className="star-btn"
      data-on={on}
      aria-label={t(on ? 'removeFavorite' : 'addFavorite', lang)}
      aria-pressed={on}
      onClick={onClick}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function MapGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21c4-5 7-8.5 7-12a7 7 0 0 0-14 0c0 3.5 3 7 7 12z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
