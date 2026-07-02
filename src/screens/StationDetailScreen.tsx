import { useEffect, useRef, useState } from 'react';
import type { Station } from '../lib/stations';
import { stationImageUrl } from '../lib/wikimedia';
import { useDestination, sameSpot } from '../store/destinationStore';
import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

interface Props {
  station: Station;
  onDone: () => void;
  onBack: () => void;
}

export function StationDetailScreen({ station, onDone, onBack }: Props) {
  const lang = useSettings((s) => s.lang);
  const setDestination = useDestination((s) => s.setDestination);
  const favorites = useDestination((s) => s.favorites);
  const toggleFavorite = useDestination((s) => s.toggleFavorite);
  const [img, setImg] = useState<string | null>(null);
  const [imgTried, setImgTried] = useState(false);
  const gotImg = useRef(false);

  const spot = { name: station.name, lat: station.lat, lon: station.lon };
  const isFav = favorites.some((f) => sameSpot(f, spot));

  useEffect(() => {
    gotImg.current = false;
    setImg(null);
    setImgTried(false);
    if (!station.wikidata) {
      setImgTried(true);
      return;
    }
    const ctrl = new AbortController();
    stationImageUrl(station.wikidata, ctrl.signal)
      .then((url) => {
        gotImg.current = Boolean(url);
        setImg(url);
        setImgTried(true);
      })
      .catch(() => setImgTried(true));
    return () => ctrl.abort();
  }, [station.wikidata]);

  const go = () => {
    setDestination(spot);
    onDone();
  };

  return (
    <div className="sheet">
      <div className="sheet__head">
        <button className="btn-ghost" onClick={onBack}>
          ‹ {t('back', lang)}
        </button>
      </div>

      <div className="station">
        <div className="station__photo">
          {img ? (
            <img
              src={img}
              alt={station.name}
              className="station__img"
              onError={() => {
                setImg(null);
                setImgTried(true);
              }}
            />
          ) : (
            imgTried && (
              <div className="station__photo-empty">
                {t('stationPhotoUnavailable', lang)}
              </div>
            )
          )}
        </div>

        <div className="station__head">
          <div className="station__title">
            <h2 className="station__name">{station.name}</h2>
            {(station.kana || station.en) && (
              <div className="station__reading">
                {lang === 'en' && station.en ? station.en : station.kana || station.en}
              </div>
            )}
          </div>
          <button
            className="star-btn"
            data-on={isFav}
            aria-label={t(isFav ? 'removeFavorite' : 'addFavorite', lang)}
            aria-pressed={isFav}
            onClick={() => toggleFavorite(spot)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {station.lines.length > 0 && (
          <div className="station__section">
            <div className="section-label">{t('lines', lang)}</div>
            <div className="chips">
              {station.lines.map((l) => (
                <span key={l} className="chip">{l}</span>
              ))}
            </div>
          </div>
        )}

        {station.operators.length > 0 && (
          <div className="station__section">
            <div className="section-label">{t('operators', lang)}</div>
            <div className="chips">
              {station.operators.map((o) => (
                <span key={o} className="chip chip--muted">{o}</span>
              ))}
            </div>
          </div>
        )}

        <div className="station__source">{t('dataSourceOsm', lang)}</div>
      </div>

      <button className="btn-primary" onClick={go}>
        {t('goToStation', lang)}
      </button>
    </div>
  );
}
