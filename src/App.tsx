import { useEffect, useState } from 'react';
import { CompassScreen } from './screens/CompassScreen';
import { DestinationScreen } from './screens/DestinationScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { useLocation } from './store/locationStore';
import { useHeading } from './store/headingStore';
import { useDestination } from './store/destinationStore';
import { useSettings } from './store/settingsStore';
import { useWidgetSync } from './lib/useWidgetSync';
import { KEYS, loadJSON, saveJSON } from './lib/storage';

type Screen = 'compass' | 'destination' | 'settings';

export function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [screen, setScreen] = useState<Screen>('compass');

  const hydrateDest = useDestination((s) => s.hydrate);
  const hydrateSettings = useSettings((s) => s.hydrate);

  const startLoc = useLocation((s) => s.start);
  const stopLoc = useLocation((s) => s.stop);
  const startHeading = useHeading((s) => s.start);
  const stopHeading = useHeading((s) => s.stop);
  const updateDeclination = useHeading((s) => s.updateDeclination);
  const fix = useLocation((s) => s.fix);

  // 目的地・現在地・設定の変化をホーム/ロック画面ウィジェットへ同期（Webでは no-op）
  useWidgetSync();

  // 初期ハイドレーション
  useEffect(() => {
    (async () => {
      await Promise.all([hydrateDest(), hydrateSettings()]);
      const done = await loadJSON<boolean>(KEYS.onboarded, false);
      setOnboarded(done);
      setReady(true);
    })();
  }, [hydrateDest, hydrateSettings]);

  // オンボード完了後にセンサー購読を開始
  useEffect(() => {
    if (!ready || !onboarded) return;
    startLoc();
    startHeading();
    return () => {
      stopLoc();
      stopHeading();
    };
  }, [ready, onboarded, startLoc, stopLoc, startHeading, stopHeading]);

  // 位置が更新されたら偏角を再計算（移動閾値ベースで発火）
  useEffect(() => {
    if (fix) updateDeclination(fix);
  }, [fix, updateDeclination]);

  // バックグラウンド時はセンサーを停止、復帰で再開（電池配慮）
  useEffect(() => {
    if (!onboarded) return;
    const onVisibility = () => {
      if (document.hidden) {
        stopLoc();
        stopHeading();
      } else {
        startLoc();
        startHeading();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [onboarded, startLoc, stopLoc, startHeading, stopHeading]);

  const handleGranted = () => {
    void saveJSON(KEYS.onboarded, true);
    setOnboarded(true);
  };

  if (!ready) return <div className="app" />;

  return (
    <div className="app">
      {!onboarded ? (
        <OnboardingScreen onGranted={handleGranted} />
      ) : screen === 'destination' ? (
        <DestinationScreen onDone={() => setScreen('compass')} />
      ) : screen === 'settings' ? (
        <SettingsScreen onDone={() => setScreen('compass')} />
      ) : (
        <CompassScreen
          onChooseDestination={() => setScreen('destination')}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
    </div>
  );
}
