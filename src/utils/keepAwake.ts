import { KeepAwake } from '@capacitor-community/keep-awake';

export async function enableKeepAwake() {
  try {
    await KeepAwake.keepAwake();
  } catch (err) {
    console.error('KeepAwake enable failed:', err);
  }
}

export async function disableKeepAwake() {
  try {
    await KeepAwake.allowSleep();
  } catch (err) {
    console.error('KeepAwake disable failed:', err);
  }
}
