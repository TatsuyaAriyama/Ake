import { useEffect, useRef, useState } from 'react';
import { searchPlaces, hasGeocoder, type Place } from '../lib/geocoding';
import { useDestination, type Destination } from '../store/destinationStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

interface Props {
  onDone: () => void;
}

export function DestinationScreen({ onDone }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const setDestination = useDestination((s) => s.setDestination);
  const history = useDestination((s) => s.history);
  const fix = useLocation((s) => s.fix);
  const lang = useSettings((s) => s.lang);
  const abortRef = useRef<AbortController | null>(null);

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
        const r = await searchPlaces(query, fix ?? undefined, ctrl.signal);
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
  }, [query, fix]);

  const choose = (d: Destination | Place) => {
    setDestination(d);
    onDone();
  };

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
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        enterKeyHint="search"
      />

      {!hasGeocoder() && <div className="notice">{t('noGeocoder', lang)}</div>}
      {error && <div className="notice">{error}</div>}

      {results.length > 0 ? (
        <ul className="results">
          {results.map((r) => (
            <li key={r.id} className="result" onClick={() => choose(r)}>
              <span className="result__name">{r.name}</span>
              {r.context && <span className="result__ctx">{r.context}</span>}
            </li>
          ))}
        </ul>
      ) : (
        history.length > 0 && (
          <>
            <div className="section-label">{t('history', lang)}</div>
            <ul className="results">
              {history.map((h, i) => (
                <li key={`${h.lat},${h.lon},${i}`} className="result" onClick={() => choose(h)}>
                  <span className="result__name">{h.name}</span>
                  <span className="result__ctx">
                    {h.lat.toFixed(4)}, {h.lon.toFixed(4)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )
      )}
    </div>
  );
}
