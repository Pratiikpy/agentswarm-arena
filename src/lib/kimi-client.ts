// NVIDIA Kimi 2.5 Client for Agent AI — with automatic key rotation on failure

interface KimiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface KimiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class KimiClient {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private baseURL: string = 'https://integrate.api.nvidia.com/v1';

  constructor(primaryKey: string, fallbackKey?: string) {
    this.apiKeys = [primaryKey];
    if (fallbackKey && fallbackKey.startsWith('nvapi-') && fallbackKey !== primaryKey) {
      this.apiKeys.push(fallbackKey);
      console.log(`[Kimi] Loaded ${this.apiKeys.length} API keys (primary + fallback)`);
    } else {
      console.log('[Kimi] Loaded 1 API key');
    }
  }

  private get currentKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  private rotateKey(): boolean {
    if (this.apiKeys.length <= 1) return false;
    const nextIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    if (nextIndex === this.currentKeyIndex) return false;
    this.currentKeyIndex = nextIndex;
    console.log(`[Kimi] Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    return true;
  }

  async chat(messages: KimiMessage[], systemPrompt?: string): Promise<string> {
    const allMessages: KimiMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Try current key, then rotate to fallback if it fails
    let lastError: Error | null = null;
    const keysToTry = this.apiKeys.length;

    for (let attempt = 0; attempt < keysToTry; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentKey}`,
          },
          body: JSON.stringify({
            model: 'moonshotai/kimi-k2.5',
            messages: allMessages,
            temperature: 0.7,
            max_tokens: 500,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          const status = response.status;

          // Rate limit or auth error → try fallback key
          if ((status === 429 || status === 401 || status === 403) && this.rotateKey()) {
            console.warn(`[Kimi] Key ${attempt + 1} got HTTP ${status}, trying fallback key...`);
            lastError = new Error(`Kimi API error: ${status} - ${errorText.slice(0, 100)}`);
            continue;
          }

          throw new Error(`Kimi API error: ${status} - ${errorText.slice(0, 100)}`);
        }

        const data: KimiResponse = await response.json();
        return data.choices[0]?.message?.content || 'No response';
      } catch (error: any) {
        lastError = error;

        // Network/timeout errors → try fallback key
        if (attempt < keysToTry - 1 && this.rotateKey()) {
          console.warn(`[Kimi] Key ${attempt + 1} failed (${error.message?.slice(0, 50)}), trying fallback...`);
          continue;
        }
      }
    }

    console.error('[Kimi] All API keys failed:', lastError?.message);
    throw lastError || new Error('All Kimi API keys exhausted');
  }
}
