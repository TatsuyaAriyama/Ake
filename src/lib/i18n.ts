// 最小限のローカライズ（ja / en）。UI はブランド上、既定 ja。

export type Lang = 'ja' | 'en';

const strings = {
  ja: {
    setDestination: '行き先を決める',
    changeDestination: '行き先を変える',
    arrived: '到着',
    holdFlat: '端末を水平に持ってください',
    calibrate: '8の字を描いて調整してください',
    searchPlaceholder: '目的地を検索',
    history: '最近の行き先',
    goHere: 'ここに向かう',
    back: '戻る',
    settings: '設定',
    units: '単位',
    km: 'キロメートル',
    mi: 'マイル',
    northRef: '方位の基準',
    trueNorth: '真北',
    magneticNorth: '磁北',
    haptics: 'ハプティクス',
    on: 'オン',
    off: 'オフ',
    onboardTitle: '朱',
    onboardBody:
      '目的地の方向をコンパスで指し示します。現在地と方位センサーを使います。',
    grantPermissions: 'はじめる',
    permissionDenied: '権限が必要です。設定から許可してください。',
    locating: '現在地を取得中…',
    noGeocoder:
      'MapTiler の API キーが未設定です。.env に VITE_MAPTILER_KEY を設定してください。',
    aligned: 'この方向です',
  },
  en: {
    setDestination: 'Choose a destination',
    changeDestination: 'Change destination',
    arrived: 'Arrived',
    holdFlat: 'Hold your device flat',
    calibrate: 'Draw a figure-8 to calibrate',
    searchPlaceholder: 'Search destination',
    history: 'Recent',
    goHere: 'Go here',
    back: 'Back',
    settings: 'Settings',
    units: 'Units',
    km: 'Kilometers',
    mi: 'Miles',
    northRef: 'North reference',
    trueNorth: 'True north',
    magneticNorth: 'Magnetic north',
    haptics: 'Haptics',
    on: 'On',
    off: 'Off',
    onboardTitle: 'Ake',
    onboardBody:
      'A compass that points to your destination. Uses your location and heading sensor.',
    grantPermissions: 'Get started',
    permissionDenied: 'Permission required. Please allow it in Settings.',
    locating: 'Locating…',
    noGeocoder: 'MapTiler API key missing. Set VITE_MAPTILER_KEY in .env.',
    aligned: 'This way',
  },
} as const;

export type StringKey = keyof typeof strings.ja;

export function detectLang(): Lang {
  const n = navigator.language.toLowerCase();
  return n.startsWith('ja') ? 'ja' : 'en';
}

export function t(key: StringKey, lang: Lang = detectLang()): string {
  return strings[lang][key];
}
