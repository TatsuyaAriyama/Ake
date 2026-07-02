import { useState } from 'react';
import { useHeading } from '../store/headingStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

interface Props {
  onGranted: () => void;
}

// iOS では DeviceOrientation の requestPermission を「ユーザー操作起点」で呼ぶ必要がある。
export function OnboardingScreen({ onGranted }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestHeading = useHeading((s) => s.request);
  const requestLocation = useLocation((s) => s.request);
  const lang = useSettings((s) => s.lang);

  const start = async () => {
    setBusy(true);
    setError(null);
    // モーション（方位）は必ずタップ起点で
    const h = await requestHeading();
    const l = await requestLocation();
    setBusy(false);
    if (h === 'denied' || l === 'denied') {
      setError(t('permissionDenied', lang));
      return;
    }
    onGranted();
  };

  return (
    <div className="onboard">
      <img
        className="onboard__icon"
        src={`${import.meta.env.BASE_URL}icon.svg`}
        alt="朱 Ake"
      />
      <div className="onboard__title">{t('onboardTitle', lang)}</div>
      <p className="onboard__body">{t('onboardBody', lang)}</p>
      <button className="btn-primary" onClick={start} disabled={busy}>
        {t('grantPermissions', lang)}
      </button>
      <div className="onboard__error">{error}</div>
    </div>
  );
}
