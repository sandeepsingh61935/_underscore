/** chrome.storage.local flag: show Upload-from-device prompt after sign-in. */
export const DEVICE_UPLOAD_PROMPT_KEY = 'device_upload_prompt_pending';

function localStorageArea(): chrome.storage.StorageArea | null {
  const g = globalThis as {
    chrome?: { storage?: { local?: chrome.storage.StorageArea } };
  };
  return g.chrome?.storage?.local ?? null;
}

export async function setDeviceUploadPromptPending(pending: boolean): Promise<void> {
  const area = localStorageArea();
  if (!area) return;
  if (pending) {
    await area.set({ [DEVICE_UPLOAD_PROMPT_KEY]: true });
    return;
  }
  await area.remove(DEVICE_UPLOAD_PROMPT_KEY);
}

export async function readDeviceUploadPromptPending(): Promise<boolean> {
  const area = localStorageArea();
  if (!area) return false;
  const stored = await area.get(DEVICE_UPLOAD_PROMPT_KEY);
  return stored[DEVICE_UPLOAD_PROMPT_KEY] === true;
}
