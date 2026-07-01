import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function tapLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (navigator.vibrate) navigator.vibrate(10);
  }
}

export async function arriveBuzz() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  }
}
