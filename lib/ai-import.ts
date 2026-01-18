// AI Import utilities for ChatGPT/Claude question answering
import { QUESTIONS } from "@/convex/seedQuestions";

// Generate the prompt that users will copy to their AI
export function generateAIPrompt(): string {
  const questionsText = QUESTIONS.map((q) => {
    let questionLine = `${q.order}. ${q.text}`;

    if (q.type === "multiple_choice" && q.options) {
      questionLine += `\n   Options: ${q.options.join(" | ")}`;
    } else if (q.type === "scale") {
      questionLine += `\n   Scale: ${q.scaleMin}-${q.scaleMax} (${q.scaleMinLabel} to ${q.scaleMaxLabel})`;
    }

    return questionLine;
  }).join("\n\n");

  return `I'm filling out a dating profile with 100 questions. Based on what you know about me from our conversations, please answer ONLY the questions you're confident about. Skip any questions you're unsure of.

IMPORTANT RULES:
- Only answer questions where you have HIGH CERTAINTY based on things I've told you
- For multiple choice questions, use EXACTLY one of the provided options
- For scale questions (e.g., 1-10), respond with just the number
- For text/essay questions, BE DETAILED AND THOROUGH. Write 2-4 sentences minimum. Share specific examples, stories, and details. This is a dating profile - the more authentic detail, the better matches I'll get. Write in my voice as if I'm genuinely opening up to someone.
- Skip questions you're not confident about - it's better to skip than guess

Return your answers as JSON in this exact format:
{
  "answers": {
    "1": "your answer for question 1",
    "5": "3",
    "13": "A detailed, thoughtful essay answer with specific examples and personal details that really captures who I am..."
  }
}

Only include question numbers you're answering. Here are the questions:

${questionsText}`;
}

// Type for parsed AI response
export interface ParsedAIResponse {
  answers: Record<string, string>;
}

// Parse and validate the JSON response from the AI
export function parseAIResponse(jsonText: string): {
  success: boolean;
  data?: ParsedAIResponse;
  error?: string;
} {
  // Try to extract JSON from the response (AI might include markdown code blocks)
  let cleanedJson = jsonText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = cleanedJson.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleanedJson = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleanedJson);

    // Validate structure
    if (!parsed.answers || typeof parsed.answers !== "object") {
      return {
        success: false,
        error: "Invalid format: missing 'answers' object",
      };
    }

    // Validate that keys are valid question numbers (1-100)
    const validAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.answers)) {
      const questionNum = parseInt(key, 10);
      if (isNaN(questionNum) || questionNum < 1 || questionNum > 100) {
        continue; // Skip invalid question numbers
      }
      if (typeof value !== "string" && typeof value !== "number") {
        continue; // Skip non-string/number values
      }
      validAnswers[key] = String(value);
    }

    if (Object.keys(validAnswers).length === 0) {
      return {
        success: false,
        error: "No valid answers found in the response",
      };
    }

    return {
      success: true,
      data: { answers: validAnswers },
    };
  } catch (e) {
    return {
      success: false,
      error: "Could not parse JSON. Make sure you copied the entire response.",
    };
  }
}

// Get the count of answered questions
export function getAnswerCount(data: ParsedAIResponse): number {
  return Object.keys(data.answers).length;
}
