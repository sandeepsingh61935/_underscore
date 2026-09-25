import { describe, expect, it } from 'vitest';

import { skipWxtContentScriptTabReloadTransform } from '../../../scripts/skip-wxt-tab-reload-transform';

const WXT_SNIPPET = `async function reloadTabsForContentScript(contentScript) {
	const allTabs = await browser.tabs.query({});
	await Promise.all(matchingTabs.map(async (tab) => {
		await browser.tabs.reload(tab.id);
	}));
}`;

describe('skipWxtContentScriptTabReloadTransform', () => {
  it('inserts an early return so tabs are not reloaded', () => {
    const out = skipWxtContentScriptTabReloadTransform(WXT_SNIPPET);
    expect(out).toContain('async function reloadTabsForContentScript(contentScript) {return;');
    expect(out).toContain('browser.tabs.reload');
  });

  it('leaves unrelated modules alone', () => {
    expect(skipWxtContentScriptTabReloadTransform('export const x = 1')).toBeNull();
  });
});
