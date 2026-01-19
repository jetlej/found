import OpenAI from "openai";

// OpenAI client - initialized lazily with API key from environment
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Default model for profile parsing (cost-efficient)
export const DEFAULT_MODEL = "gpt-5-mini-2025-08-07";

// Higher accuracy model for complex extractions
export const ACCURATE_MODEL = "gpt-5-mini-2025-08-07";

// Pricing per 1M tokens (GPT-5 mini estimated pricing)
// Update these values based on actual OpenAI pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5-mini-2025-08-07": { input: 0.15, output: 0.60 }, // $ per 1M tokens
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
};

// Type for tracking API usage
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ApiCallResult<T> {
  data: T;
  usage: TokenUsage;
  cost: number; // in dollars
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Type for chat completion messages
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Calculate cost from token usage
export function calculateCost(usage: TokenUsage, model: string = DEFAULT_MODEL): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-5-mini-2025-08-07"];
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// Generic function to call OpenAI with retry logic
export async function callOpenAI<T>(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json" | "text";
  } = {}
): Promise<T> {
  const result = await callOpenAIWithUsage<T>(messages, options);
  return result.data;
}

// Call OpenAI and return usage statistics
export async function callOpenAIWithUsage<T>(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json" | "text";
  } = {}
): Promise<ApiCallResult<T>> {
  const client = getOpenAIClient();
  const {
    model = DEFAULT_MODEL,
    temperature,
    maxTokens = 2000,
    responseFormat = "json",
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Note: gpt-5-mini doesn't support temperature param, so we omit it
      const response = await client.chat.completions.create({
        model,
        messages,
        ...(temperature !== undefined && { temperature }),
        max_completion_tokens: maxTokens,
        response_format:
          responseFormat === "json" ? { type: "json_object" } : { type: "text" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      // Extract usage data
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      const cost = calculateCost(usage, model);

      let data: T;
      if (responseFormat === "json") {
        try {
          data = JSON.parse(content) as T;
        } catch (parseError) {
          throw new Error(`Failed to parse JSON response: ${content}`);
        }
      } else {
        data = content as T;
      }

      return { data, usage, cost };
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error?.status === 401 || // Invalid API key
        error?.status === 403 || // Permission denied
        error?.status === 400 // Bad request (likely prompt issue)
      ) {
        throw error;
      }

      // Retry on rate limits and server errors
      if (attempt < MAX_RETRIES) {
        const delayTime =
          error?.status === 429
            ? RETRY_DELAY_MS * attempt * 2 // Longer delay for rate limits
            : RETRY_DELAY_MS * attempt;
        console.log(
          `OpenAI call failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delayTime}ms...`
        );
        await delay(delayTime);
      }
    }
  }

  throw lastError || new Error("OpenAI call failed after retries");
}

// Structured extraction helper with validation
export async function extractStructuredData<T>(
  systemPrompt: string,
  userContent: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  return callOpenAI<T>(messages, {
    ...options,
    maxTokens: options.maxTokens,
    responseFormat: "json",
  });
}

// Structured extraction with usage tracking
export async function extractStructuredDataWithUsage<T>(
  systemPrompt: string,
  userContent: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ApiCallResult<T>> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  return callOpenAIWithUsage<T>(messages, {
    ...options,
    maxTokens: options.maxTokens,
    responseFormat: "json",
  });
}

// Helper to aggregate multiple usage results
export function aggregateUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (acc, usage) => ({
      promptTokens: acc.promptTokens + usage.promptTokens,
      completionTokens: acc.completionTokens + usage.completionTokens,
      totalTokens: acc.totalTokens + usage.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
}

// Helper to format cost for display
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

// Generate an image using OpenAI's image generation API
export async function generateImage(
  prompt: string,
  options: {
    size?: "1024x1024" | "1024x1792" | "1792x1024";
  } = {}
): Promise<ArrayBuffer> {
  const client = getOpenAIClient();
  const { size = "1024x1024" } = options;

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    response_format: "b64_json",
  });

  const b64 = response.data[0].b64_json;
  if (!b64) {
    throw new Error("No image data returned from OpenAI");
  }

  // Convert base64 to ArrayBuffer for Convex
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
