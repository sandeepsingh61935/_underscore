import type { ILLMService, LLMRequest } from '@/shared/interfaces/i-llm-service';
import type { HighlightData } from '@/shared/schemas/highlight-schema';
import type { IAIMode, MindmapData, Contradiction, EntityExtraction } from '@/content/modes/mode-interfaces';

interface AIModeDeps {
  provider: ILLMService;
}

export class AIMode implements IAIMode {
  constructor(private readonly deps: AIModeDeps) {}

  async generateSummary(highlights: HighlightData[], length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> {
    const request = this.buildSummaryRequest(highlights, length);
    const result = await this.deps.provider.chat(request);
    return result.text;
  }

  async generateQuestions(highlights: HighlightData[]): Promise<string[]> {
    const request: LLMRequest = {
      systemPrompt: 'Generate 5 comprehension questions for the given highlights. Return JSON array of strings.',
      messages: [{ role: 'user', content: highlights.map(h => h.text).join('\n---\n') }],
      maxTokens: 512,
    };
    const result = await this.deps.provider.chat(request);
    try { return JSON.parse(result.text) as string[]; } catch { return []; }
  }

  async generateMindmap(highlights: HighlightData[]): Promise<MindmapData> {
    const request: LLMRequest = {
      systemPrompt: 'Generate a mindmap from the highlights. Return JSON: { nodes: [{id,label}], edges: [{from,to}] }.',
      messages: [{ role: 'user', content: highlights.map(h => h.text).join('\n---\n') }],
      maxTokens: 2048,
    };
    const result = await this.deps.provider.chat(request);
    try {
      return JSON.parse(result.text) as MindmapData;
    } catch {
      return { nodes: [], edges: [], metadata: { generatedAt: new Date(), highlightCount: highlights.length, confidence: 0 } };
    }
  }

  async detectContradictions(highlights: HighlightData[]): Promise<Contradiction[]> {
    const request: LLMRequest = {
      systemPrompt: 'Detect contradictions across the highlights. Return JSON array of {highlight1,highlight2,reason,confidence}.',
      messages: [{ role: 'user', content: highlights.map(h => h.text).join('\n---\n') }],
      maxTokens: 1024,
    };
    const result = await this.deps.provider.chat(request);
    try { return JSON.parse(result.text) as Contradiction[]; } catch { return []; }
  }

  async extractEntities(highlights: HighlightData[]): Promise<EntityExtraction> {
    const request: LLMRequest = {
      systemPrompt: 'Extract named entities from the highlights. Return JSON: { people, concepts, dates, places }.',
      messages: [{ role: 'user', content: highlights.map(h => h.text).join('\n---\n') }],
      maxTokens: 1024,
    };
    const result = await this.deps.provider.chat(request);
    try {
      return JSON.parse(result.text) as EntityExtraction;
    } catch {
      return { people: [], concepts: [], dates: [], places: [] };
    }
  }

  private buildSummaryRequest(highlights: HighlightData[], length: 'short' | 'medium' | 'long'): LLMRequest {
    return {
      systemPrompt: `Summarize the following ${highlights.length} highlighted spans in ${length} form.`,
      messages: [{ role: 'user', content: highlights.map(h => h.text).join('\n---\n') }],
      maxTokens: length === 'short' ? 256 : length === 'medium' ? 512 : 1024,
    };
  }
}