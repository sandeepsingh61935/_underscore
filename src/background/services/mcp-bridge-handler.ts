/**
 * @file mcp-bridge-handler.ts
 * @description Routes MCP bridge method calls to background services (ADR-023).
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import type { IKeyManager } from '@/background/auth/interfaces/i-key-manager';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { MODE_STORAGE_KEY, AUTH_REQUIRED_MODES, VALID_MODES } from '@/shared/constants/mode-storage';
import { buildMarkdownExport, toExportableHighlight } from '@/shared/highlight-export';
import type { ExportScope } from '@/shared/highlight-export';
import { buildHighlightMetadataUpdate } from '@/shared/utils/highlight-metadata';
import { broadcastModeToTabs } from '@/shared/services/broadcast-mode-to-tabs';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import { normalizeMode } from '@/shared/utils/normalize-mode';
import {
  buildMcpCapabilities,
  canUseFeature,
  getCapabilitiesForMode,
} from '@/shared/utils/mode-capabilities';
import { featureGateErrorCode, featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import { buildScopeQueryRequest } from '@/shared/llm/scope-query-request';
import { buildFallbackExcerpts } from '@/shared/llm/summarization-fallback';
import { PROMPT_TEMPLATES } from '@/shared/llm/prompts';
import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import { getSectionKey } from '@/shared/utils/section-key';
import type { McpSessionSnapshot } from '@/shared/mcp/session-types';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { browser } from 'wxt/browser';

export interface McpBridgeHandlerDeps {
  authManager: IAuthManager;
  getHighlightQueryService: () => HighlightQueryService;
  backgroundHighlightOrchestrator: BackgroundHighlightOrchestrator;
  scopedHighlightRepository: ScopedHighlightRepository;
  repositoryFacade: RepositoryFacade;
  cloudHydrationService: ICloudHydrationService;
  librarySyncCursor: LibrarySyncCursor;
  keyManager?: IKeyManager;
  llmChat?: (payload: { provider?: ProviderName; request: LLMRequest }) => Promise<{ text: string }>;
  getActiveMode?: () => Promise<ModeType>;
}

export class McpBridgeHandler {
  constructor(private readonly deps: McpBridgeHandlerDeps) {}

  async dispatch(method: string, payload: unknown): Promise<unknown> {
    switch (method) {
      case 'get_session':
        return this.getSession();
      case 'list_collections':
        return this.listCollections(payload);
      case 'get_highlights':
        return this.getHighlights(payload);
      case 'search_highlights':
        return this.searchHighlights(payload);
      case 'fetch_highlight':
        return this.fetchHighlight(payload);
      case 'export_highlights':
        return this.exportHighlights(payload);
      case 'update_highlight_metadata':
        return this.updateHighlightMetadata(payload);
      case 'sync_library':
        return this.syncLibrary();
      case 'get_sync_status':
        return this.getSyncStatus();
      case 'get_mode':
        return this.getMode();
      case 'set_mode':
        return this.setMode(payload);
      case 'ask_scope':
        return this.askScope(payload);
      case 'summarize_section':
        return this.summarizeSection(payload);
      case 'synthesize_domain':
        return this.synthesizeDomain(payload);
      default:
        throw Object.assign(new Error(`Unknown bridge method: ${method}`), { code: 'UNKNOWN_METHOD' });
    }
  }

  private async readMode(): Promise<ModeType> {
    if (this.deps.getActiveMode) {
      return this.deps.getActiveMode();
    }
    const stored = await browser.storage.local.get(MODE_STORAGE_KEY);
    return normalizeMode(stored[MODE_STORAGE_KEY]);
  }

  private dataCoverage(): McpSessionSnapshot['dataCoverage'] {
    return this.deps.scopedHighlightRepository.getActiveScope() === 'pro' ? 'pro_local' : 'basic_local';
  }

  private capabilitiesForMode(
    mode: ModeType,
    signedIn: boolean,
    storageScope: 'basic' | 'pro',
    vaultLocked: boolean,
  ): McpSessionSnapshot['capabilities'] {
    return buildMcpCapabilities({
      mode,
      capabilities: getCapabilitiesForMode(mode),
      isAuthenticated: signedIn,
      vaultLocked,
      storageScope,
    });
  }

  async getSession(): Promise<McpSessionSnapshot> {
    const mode = await this.readMode();
    const branding = getModeBranding(mode);
    const authState = this.deps.authManager.getAuthState();
    const storageScope = this.deps.scopedHighlightRepository.getActiveScope();
    const vaultLocked =
      authState.isAuthenticated && this.deps.keyManager
        ? !this.deps.keyManager.isUnlocked
        : false;

    const cursor = await this.deps.librarySyncCursor.get();

    return {
      mode,
      displayName: branding.displayName,
      storageScope,
      auth: {
        signedIn: authState.isAuthenticated,
        userId: authState.user?.id,
        email: authState.user?.email,
      },
      capabilities: this.capabilitiesForMode(mode, authState.isAuthenticated, storageScope, vaultLocked),
      vault: { locked: vaultLocked },
      sync: cursor ? { lastHydratedAt: cursor.toISOString() } : undefined,
      dataCoverage: this.dataCoverage(),
      bridgeConnected: true,
    };
  }

  async listCollections(payload: unknown): Promise<unknown> {
    const mode = typeof (payload as { mode?: string })?.mode === 'string'
      ? normalizeMode((payload as { mode: string }).mode)
      : await this.readMode();
    const collections = await this.deps.getHighlightQueryService().getCollections(mode);
    return {
      collections,
      dataCoverage: this.dataCoverage(),
      storageScope: this.deps.scopedHighlightRepository.getActiveScope(),
    };
  }

  async getHighlights(payload: unknown): Promise<unknown> {
    const input = payload as { domain?: string; limit?: number; cursor?: string };
    if (!input?.domain) {
      throw Object.assign(new Error('domain is required'), { code: 'INVALID_ARGUMENT' });
    }
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;
    if (Number.isNaN(offset) || offset < 0) {
      throw Object.assign(new Error('Invalid cursor'), { code: 'INVALID_ARGUMENT' });
    }

    const highlights = await this.deps.getHighlightQueryService().getHighlightsByDomain(input.domain);
    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
    const page = enriched.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < enriched.length ? String(nextOffset) : undefined;

    return {
      highlights: page,
      nextCursor,
      total: enriched.length,
      dataCoverage: this.dataCoverage(),
      storageScope: this.deps.scopedHighlightRepository.getActiveScope(),
    };
  }

  async searchHighlights(payload: unknown): Promise<unknown> {
    const input = payload as { query?: string; domain?: string; limit?: number; cursor?: string };
    const query = input?.query?.trim().toLowerCase();
    if (!query) {
      throw Object.assign(new Error('query is required'), { code: 'INVALID_ARGUMENT' });
    }
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;

    let candidates;
    if (input.domain) {
      candidates = await this.deps.getHighlightQueryService().getHighlightsByDomain(input.domain);
    } else {
      const collections = await this.deps.getHighlightQueryService().getCollections();
      const merged = [];
      for (const c of collections) {
        const rows = await this.deps.getHighlightQueryService().getHighlightsByDomain(c.domain);
        merged.push(...rows);
      }
      candidates = merged;
    }

    const matches = candidates.filter((hl) => {
      const haystack = [hl.text, hl.notes, ...(hl.tags ?? []), hl.url].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(
      matches.slice(offset, offset + limit),
    );
    const nextOffset = offset + limit;

    return {
      highlights: enriched,
      nextCursor: nextOffset < matches.length ? String(nextOffset) : undefined,
      total: matches.length,
      dataCoverage: this.dataCoverage(),
    };
  }

  async fetchHighlight(payload: unknown): Promise<unknown> {
    const input = payload as { id?: string };
    if (!input?.id?.trim()) {
      throw Object.assign(new Error('id is required'), { code: 'INVALID_ARGUMENT' });
    }

    const collections = await this.deps.getHighlightQueryService().getCollections();
    for (const collection of collections) {
      const rows = await this.deps.getHighlightQueryService().getHighlightsByDomain(collection.domain);
      const match = rows.find((hl) => hl.id === input.id);
      if (!match) continue;

      const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext([match]);
      const highlight = enriched[0];
      if (!highlight) {
        throw Object.assign(new Error(`Highlight not found: ${input.id}`), { code: 'NOT_FOUND' });
      }
      return highlight;
    }

    throw Object.assign(new Error(`Highlight not found: ${input.id}`), { code: 'NOT_FOUND' });
  }

  async exportHighlights(payload: unknown): Promise<unknown> {
    const scope = (payload as { scope?: ExportScope })?.scope ?? { kind: 'library' };
    const raw = await this.deps.getHighlightQueryService().findAllForExport(scope);
    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(
      raw.map((hl) => ({ id: hl.id, text: hl.text })),
    );
    const byId = new Map(enriched.map((item) => [item.id, item]));
    const exportable = raw
      .map((hl) => {
        const summary = byId.get(hl.id);
        return toExportableHighlight({ ...hl, text: summary?.text ?? hl.text }, summary?.decryptionStatus);
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const result = buildMarkdownExport(exportable, scope);
    return {
      ...result,
      dataCoverage: this.dataCoverage(),
    };
  }

  async updateHighlightMetadata(payload: unknown): Promise<unknown> {
    const input = payload as { id?: string; notes?: string; tags?: string[] };
    if (!input?.id) {
      throw Object.assign(new Error('id is required'), { code: 'INVALID_ARGUMENT' });
    }
    const metadata = buildHighlightMetadataUpdate({ notes: input.notes, tags: input.tags });
    this.deps.repositoryFacade.update(input.id, { metadata });
    notifyLibraryDataChanged({ source: 'mcp_metadata_update' });
    return { ok: true };
  }

  async syncLibrary(): Promise<unknown> {
    if (!this.deps.authManager.isAuthenticated) {
      throw Object.assign(new Error('Sign in to sync library with cloud'), { code: 'NOT_AUTHENTICATED' });
    }
    const result = await this.deps.cloudHydrationService.hydrate();
    if (result.error) {
      throw Object.assign(new Error(result.error), { code: 'SYNC_FAILED' });
    }
    return result;
  }

  async getSyncStatus(): Promise<unknown> {
    const cursor = await this.deps.librarySyncCursor.get();
    return {
      signedIn: this.deps.authManager.isAuthenticated,
      lastHydratedAt: cursor?.toISOString() ?? null,
      storageScope: this.deps.scopedHighlightRepository.getActiveScope(),
    };
  }

  async getMode(): Promise<unknown> {
    const mode = await this.readMode();
    return { mode, branding: getModeBranding(mode) };
  }

  async setMode(payload: unknown): Promise<unknown> {
    const mode = normalizeMode((payload as { mode?: unknown })?.mode);
    if (!VALID_MODES.includes(mode)) {
      throw Object.assign(new Error('Invalid mode'), { code: 'INVALID_MODE' });
    }
    const signedIn = this.deps.authManager.isAuthenticated;
    if (!signedIn && AUTH_REQUIRED_MODES.includes(mode)) {
      throw Object.assign(new Error('Sign in required for Pro modes'), { code: 'NOT_AUTHENTICATED' });
    }
    if (signedIn && mode === 'basic') {
      throw Object.assign(new Error('Signed-in users cannot switch to Basic via MCP'), {
        code: 'MODE_NOT_ALLOWED',
      });
    }
    await browser.storage.local.set({ [MODE_STORAGE_KEY]: mode });
    await broadcastModeToTabs(mode);
    return { mode, branding: getModeBranding(mode) };
  }

  private filterBySection<T extends { url: string; path: string }>(
    highlights: T[],
    _domain: string,
    sectionKey: string,
  ): T[] {
    return highlights.filter((hl) => {
      const key = getSectionKey({ url: hl.url, path: hl.path });
      return key === sectionKey;
    });
  }

  private toPromptHighlights(
    highlights: Array<{ id: string; text: string; url: string; path: string }>,
  ): Array<{ id: string; text: string; url: string; title: string }> {
    return highlights.map((hl) => ({
      id: hl.id,
      text: hl.text,
      url: hl.url,
      title: hl.path || hl.url,
    }));
  }

  private buildSectionExcerpts(
    highlights: Array<{ id: string; text: string; url: string; path: string }>,
    domain: string,
    sectionKey: string,
  ): HighlightExcerpt[] {
    const filtered = this.filterBySection(highlights, domain, sectionKey);
    return buildFallbackExcerpts(this.toPromptHighlights(filtered)).excerpts;
  }

  private async assertAiFeature(): Promise<void> {
    const mode = await this.readMode();
    const signedIn = this.deps.authManager.isAuthenticated;
    const storageScope = this.deps.scopedHighlightRepository.getActiveScope();
    const vaultLocked = this.deps.keyManager ? !this.deps.keyManager.isUnlocked : false;
    const gate = canUseFeature('ai', {
      mode,
      capabilities: getCapabilitiesForMode(mode),
      isAuthenticated: signedIn,
      vaultLocked,
      storageScope,
    });
    if (!gate.allowed) {
      throw Object.assign(new Error(featureGateSubtitle(gate.reason)), {
        code: featureGateErrorCode(gate.reason),
      });
    }
  }

  async askScope(payload: unknown): Promise<unknown> {
    const input = payload as {
      domain?: string;
      sectionKey?: string;
      question?: string;
      useOrchestrator?: boolean;
    };
    await this.assertAiFeature();

    if (!input?.domain || !input?.sectionKey || !input?.question?.trim()) {
      throw Object.assign(new Error('domain, sectionKey, and question are required'), {
        code: 'INVALID_ARGUMENT',
      });
    }

    const highlights = await this.deps.getHighlightQueryService().getHighlightsByDomain(input.domain);
    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
    const excerpts = this.buildSectionExcerpts(enriched, input.domain, input.sectionKey);
    const scope = {
      scopeLabel: input.sectionKey,
      scopeKind: 'section' as const,
      highlightCount: excerpts.length,
    };
    const request = buildScopeQueryRequest({
      scope,
      excerpts,
      question: input.question.trim(),
    });

    if (input.useOrchestrator && this.deps.llmChat) {
      const result = await this.deps.llmChat({ request });
      return { mode: 'orchestrator', answer: result.text };
    }

    return {
      mode: 'context_only',
      systemPrompt: request.systemPrompt,
      userContent: request.messages[0]?.content ?? '',
      excerptCount: excerpts.length,
    };
  }

  async summarizeSection(payload: unknown): Promise<unknown> {
    const input = payload as { domain?: string; sectionKey?: string; useOrchestrator?: boolean };
    await this.assertAiFeature();

    if (!input?.domain || !input?.sectionKey) {
      throw Object.assign(new Error('domain and sectionKey are required'), { code: 'INVALID_ARGUMENT' });
    }

    const highlights = await this.deps.getHighlightQueryService().getHighlightsByDomain(input.domain);
    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
    const sectionItems = this.filterBySection(enriched, input.domain, input.sectionKey);
    const promptHighlights = this.toPromptHighlights(sectionItems);
    const systemPrompt = PROMPT_TEMPLATES.summarizeExcerpts({
      pageTitle: input.sectionKey,
      pageUrl: input.domain,
      pageContextWithMarks: '',
      pageContext: '',
      highlights: promptHighlights,
    });
    const userContent = promptHighlights.map((h, i) => `[${i + 1}] ${h.text}`).join('\n');

    if (input.useOrchestrator && this.deps.llmChat) {
      const result = await this.deps.llmChat({
        request: {
          systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          maxTokens: 1024,
          temperature: 0.3,
        },
      });
      return { mode: 'orchestrator', summary: result.text };
    }

    return { mode: 'context_only', systemPrompt, userContent, excerptCount: promptHighlights.length };
  }

  async synthesizeDomain(payload: unknown): Promise<unknown> {
    const input = payload as { domain?: string; useOrchestrator?: boolean };
    await this.assertAiFeature();

    if (!input?.domain) {
      throw Object.assign(new Error('domain is required'), { code: 'INVALID_ARGUMENT' });
    }

    const highlights = await this.deps.getHighlightQueryService().getHighlightsByDomain(input.domain);
    const enriched = await this.deps.backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
    const bySection = new Map<string, typeof enriched>();
    for (const hl of enriched) {
      const key = hl.path || '/';
      const list = bySection.get(key) ?? [];
      list.push(hl);
      bySection.set(key, list);
    }

    const sections = [...bySection.entries()].map(([sectionKey, items]) => ({
      sectionKey,
      excerptCount: items.length,
      preview: items.slice(0, 3).map((i) => i.text).join('\n'),
    }));

    const systemPrompt = PROMPT_TEMPLATES.reduceDomainSynthesis(
      input.domain,
      enriched.length,
      sections.length,
    );
    const userContent = sections
      .map((s) => `## ${s.sectionKey}\n${s.preview}`)
      .join('\n\n');

    if (input.useOrchestrator && this.deps.llmChat) {
      const result = await this.deps.llmChat({
        request: {
          systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          maxTokens: 2048,
          temperature: 0.3,
        },
      });
      return { mode: 'orchestrator', synthesis: result.text };
    }

    return { mode: 'context_only', systemPrompt, userContent, sectionCount: sections.length };
  }
}
