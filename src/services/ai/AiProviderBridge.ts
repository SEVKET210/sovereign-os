/* ============================================================
   SOVEREIGN-OS — Direct-to-Provider Streaming Bridge
   Executes native client-side fetch() directly to external models
   with zero intermediary platform proxy or VDS involvement.
   ============================================================ */

import type { AiProvider, AiProviderConfig, AiCompletionRequest } from '../../types';

export class AiProviderBridge {
  /**
   * Unified streaming execution contract.
   * Dispatches directly from the browser runtime and yields token chunks via onChunk.
   */
  public static async streamCompletion(
    provider: AiProvider,
    apiKey: string,
    config: AiProviderConfig,
    request: AiCompletionRequest,
    onChunk: (textChunk: string) => void
  ): Promise<string> {
    const model = request.model || config.model;
    const temperature = request.temperature ?? config.temperature ?? 0.7;
    const maxTokens = request.maxTokens ?? config.maxTokens ?? 2048;

    switch (provider) {
      case 'GEMINI':
        return this.streamGemini(apiKey, model, temperature, maxTokens, request, onChunk);
      case 'CLAUDE':
        return this.streamClaude(apiKey, model, temperature, maxTokens, request, onChunk);
      case 'OPENAI':
        return this.streamOpenAi(apiKey, model, temperature, maxTokens, config.customEndpoint, request, onChunk);
      case 'OLLAMA':
        return this.streamOllama(config.customEndpoint || 'http://localhost:11434', model, temperature, request, onChunk);
      default:
        throw new Error(`UNSUPPORTED_AI_PROVIDER: Provider ${provider} is not supported.`);
    }
  }

  /**
   * Google Gemini Direct Streaming via Server-Sent Events (alt=sse)
   */
  private static async streamGemini(
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number,
    request: AiCompletionRequest,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING: Direct client dispatch requires a valid Gemini API key.');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

    const body: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Error');
      throw new Error(`GEMINI_ERROR [${response.status}]: ${this.extractErrorMessage(errText)}`);
    }

    if (!response.body) throw new Error('GEMINI_STREAM_EMPTY: Response body stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              const partText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (partText) {
                fullText += partText;
                onChunk(partText);
              }
            } catch {
              // Partial SSE chunk
            }
          }
        }
      }
    }

    return fullText;
  }

  /**
   * Anthropic Claude Direct Streaming with Browser Direct Access Flag
   */
  private static async streamClaude(
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number,
    request: AiCompletionRequest,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!apiKey) throw new Error('CLAUDE_API_KEY_MISSING: Direct client dispatch requires a valid Anthropic API key.');

    const endpoint = 'https://api.anthropic.com/v1/messages';

    const body: Record<string, any> = {
      model,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Error');
      throw new Error(`CLAUDE_ERROR [${response.status}]: ${this.extractErrorMessage(errText)}`);
    }

    if (!response.body) throw new Error('CLAUDE_STREAM_EMPTY: Response body stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const partText = parsed.delta.text;
                if (partText) {
                  fullText += partText;
                  onChunk(partText);
                }
              }
            } catch {
              // Partial SSE chunk
            }
          }
        }
      }
    }

    return fullText;
  }

  /**
   * OpenAI Direct Streaming with Bearer Auth & SSE
   */
  private static async streamOpenAi(
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number,
    customEndpoint: string | undefined,
    request: AiCompletionRequest,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING: Direct client dispatch requires a valid OpenAI API key.');

    const baseUrl = customEndpoint ? customEndpoint.replace(/\/+$/, '') : 'https://api.openai.com/v1';
    const endpoint = `${baseUrl}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Error');
      throw new Error(`OPENAI_ERROR [${response.status}]: ${this.extractErrorMessage(errText)}`);
    }

    if (!response.body) throw new Error('OPENAI_STREAM_EMPTY: Response body stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'data: [DONE]') {
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                fullText += deltaContent;
                onChunk(deltaContent);
              }
            } catch {
              // Partial SSE chunk
            }
          }
        }
      }
    }

    return fullText;
  }

  /**
   * Local Ollama Direct Streaming via LAN/Localhost
   */
  private static async streamOllama(
    endpointUrl: string,
    model: string,
    temperature: number,
    request: AiCompletionRequest,
    onChunk: (text: string) => void
  ): Promise<string> {
    const cleanBase = endpointUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBase}/api/chat`;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const body = {
      model,
      messages,
      options: {
        temperature,
      },
      stream: true,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new Error(`OLLAMA_CONNECTION_REFUSED: Could not reach ${endpoint}. Verify Ollama is running with OLLAMA_ORIGINS="*" enabled.`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Error');
      throw new Error(`OLLAMA_ERROR [${response.status}]: ${this.extractErrorMessage(errText)}`);
    }

    if (!response.body) throw new Error('OLLAMA_STREAM_EMPTY: Response body stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const chunk = parsed.message?.content || parsed.response;
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch {
          // Partial line
        }
      }
    }

    return fullText;
  }

  /**
   * Diagnostic Test Connection & Latency Measurement
   * Issues a minimal single-token verification probe to ensure key and CORS validity.
   */
  public static async testConnection(
    provider: AiProvider,
    apiKey: string,
    config: AiProviderConfig
  ): Promise<number> {
    const start = performance.now();
    const probeRequest: AiCompletionRequest = {
      prompt: 'ping',
      maxTokens: 1,
      temperature: 0.0,
      model: config.model,
    };

    await this.streamCompletion(provider, apiKey, config, probeRequest, () => {});
    const latency = Math.round(performance.now() - start);
    return latency;
  }

  private static extractErrorMessage(rawText: string): string {
    try {
      const parsed = JSON.parse(rawText);
      return parsed.error?.message || parsed.message || rawText.slice(0, 160);
    } catch {
      return rawText.slice(0, 160);
    }
  }
}
