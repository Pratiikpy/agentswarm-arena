// NVIDIA Kimi 2.5 Client for Agent AI

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
  private apiKey: string;
  private baseURL: string = 'https://integrate.api.nvidia.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: KimiMessage[], systemPrompt?: string): Promise<string> {
    const allMessages: KimiMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.5',
          messages: allMessages,
          temperature: 0.7,
          max_tokens: 500, // Keep responses concise
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi API error: ${response.status} - ${error}`);
      }

      const data: KimiResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response';
    } catch (error) {
      console.error('Kimi API call failed:', error);
      throw error;
    }
  }
}
