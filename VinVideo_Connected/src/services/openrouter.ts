import { NextResponse } from 'next/server';

/**
 * OpenRouter Service - Centralized LLM integration for all agents
 * Replaces RunPod infrastructure with OpenRouter's unified API
 */

// Types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: {
    type: 'json_schema';
    json_schema: Record<string, any>;
  };
}

export interface OpenRouterResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    code: number;
    message: string;
    metadata?: {
      headers?: Record<string, string>;
    };
  };
}

// Configuration
export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export class OpenRouterService {
  private config: Required<OpenRouterConfig>;
  
  constructor(config: OpenRouterConfig) {
    this.config = {
      apiKey: config.apiKey,
      defaultModel: config.defaultModel || 'google/gemini-2.5-pro',
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 60000,
      headers: config.headers || {}
    };
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async chat(request: Partial<OpenRouterRequest>): Promise<OpenRouterResponse> {
    const payload: OpenRouterRequest = {
      model: request.model || this.config.defaultModel,
      messages: request.messages || [],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      stream: request.stream ?? false,
      response_format: request.response_format
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(payload);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const resetTime = this.getRateLimitResetTime(error);
          const waitTime = resetTime ? resetTime - Date.now() : this.config.retryDelay * Math.pow(2, attempt);
          
          console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        } else if (this.isRetriableError(error)) {
          // Exponential backoff for other retriable errors
          const waitTime = this.config.retryDelay * Math.pow(2, attempt);
          console.log(`Retriable error. Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        } else {
          // Non-retriable error, throw immediately
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Make the actual HTTP request to OpenRouter
   */
  private async makeRequest(payload: OpenRouterRequest): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://vinvideo.ai',
          'X-Title': 'VinVideo Connected',
          ...this.config.headers
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterError;
        throw new OpenRouterAPIError(
          errorData.error?.message || `API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json() as OpenRouterResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Stream chat completion responses
   */
  async *streamChat(request: Partial<OpenRouterRequest>): AsyncGenerator<string, void, unknown> {
    const payload: OpenRouterRequest = {
      ...request,
      model: request.model || this.config.defaultModel,
      messages: request.messages || [],
      stream: true
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected',
        ...this.config.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json() as OpenRouterError;
      throw new OpenRouterAPIError(
        errorData.error?.message || `API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Check if an error is due to rate limiting
   */
  private isRateLimitError(error: unknown): boolean {
    return error instanceof OpenRouterAPIError && error.status === 429;
  }

  /**
   * Check if an error is retriable
   */
  private isRetriableError(error: unknown): boolean {
    if (error instanceof OpenRouterAPIError) {
      return [429, 502, 503, 504].includes(error.status);
    }
    return false;
  }

  /**
   * Get rate limit reset time from error headers
   */
  private getRateLimitResetTime(error: unknown): number | null {
    if (error instanceof OpenRouterAPIError && error.data?.error?.metadata?.headers) {
      const resetTime = error.data.error.metadata.headers['X-RateLimit-Reset'];
      return resetTime ? parseInt(resetTime, 10) : null;
    }
    return null;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for OpenRouter API errors
 */
export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: OpenRouterError
  ) {
    super(message);
    this.name = 'OpenRouterAPIError';
  }
}

/**
 * Helper function to clean JSON responses (removes markdown code blocks)
 */
export function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(7, -3).trim();
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim();
  }
  
  return cleaned;
}

/**
 * Create an OpenRouter service instance with environment configuration
 */
export function createOpenRouterService(
  modelOverride?: string,
  additionalHeaders?: Record<string, string>
): OpenRouterService {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  
  return new OpenRouterService({
    apiKey,
    defaultModel: modelOverride || process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.5-pro',
    headers: additionalHeaders
  });
}