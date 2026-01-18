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
export const DEFAULT_MODEL = "gpt-4o-mini";

// Higher accuracy model for complex extractions
export const ACCURATE_MODEL = "gpt-4o";

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
  const client = getOpenAIClient();
  const {
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 2000,
    responseFormat = "json",
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format:
          responseFormat === "json" ? { type: "json_object" } : { type: "text" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      if (responseFormat === "json") {
        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          throw new Error(`Failed to parse JSON response: ${content}`);
        }
      }

      return content as T;
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
