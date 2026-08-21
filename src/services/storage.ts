import { DEFAULT_SETTINGS } from '../shared/constants';
import { ISettings, ITranslateResult } from '../shared/types';

/** 用户设置的存储 key */
const SETTINGS_KEY = 'settings';
/** 最近一次翻译结果的存储 key */
const LAST_TRANSLATION_KEY = 'lastTranslation';

/**
 * 读取用户设置，若不存在则返回默认设置
 */
export async function getSettings(): Promise<ISettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as ISettings | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

/**
 * 保存用户设置
 */
export async function saveSettings(settings: ISettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

/**
 * 读取最近一次翻译结果，若不存在则返回 null
 */
export async function getLastTranslation(): Promise<ITranslateResult | null> {
  const result = await chrome.storage.local.get(LAST_TRANSLATION_KEY);
  return (result[LAST_TRANSLATION_KEY] as ITranslateResult | undefined) ?? null;
}

/**
 * 保存最近一次翻译结果（覆盖写入）
 */
export async function saveLastTranslation(result: ITranslateResult): Promise<void> {
  await chrome.storage.local.set({ [LAST_TRANSLATION_KEY]: result });
}
