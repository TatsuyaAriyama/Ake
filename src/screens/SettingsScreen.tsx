import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

interface Props {
  onDone: () => void;
}

export function SettingsScreen({ onDone }: Props) {
  const { units, northRef, haptics, lang, setUnits, setNorthRef, setHaptics } =
    useSettings();

  return (
    <div className="sheet">
      <div className="sheet__head">
        <button className="btn-ghost" onClick={onDone}>
          ‹ {t('back', lang)}
        </button>
        <div className="sheet__title">{t('settings', lang)}</div>
      </div>

      <div className="setting-row">
        <span className="setting-row__label">{t('units', lang)}</span>
        <div className="segmented">
          <button data-active={units === 'km'} onClick={() => setUnits('km')}>
            km
          </button>
          <button data-active={units === 'mi'} onClick={() => setUnits('mi')}>
            mi
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-row__label">{t('northRef', lang)}</span>
        <div className="segmented">
          <button data-active={northRef === 'true'} onClick={() => setNorthRef('true')}>
            {t('trueNorth', lang)}
          </button>
          <button data-active={northRef === 'magnetic'} onClick={() => setNorthRef('magnetic')}>
            {t('magneticNorth', lang)}
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-row__label">{t('haptics', lang)}</span>
        <div className="segmented">
          <button data-active={haptics} onClick={() => setHaptics(true)}>
            {t('on', lang)}
          </button>
          <button data-active={!haptics} onClick={() => setHaptics(false)}>
            {t('off', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
