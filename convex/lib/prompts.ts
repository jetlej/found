// Prompt templates for AI profile extraction

export const SYSTEM_PROMPT_BASE = `You are an AI assistant helping to analyze dating profile answers to extract structured data for compatibility matching. 
Be accurate, concise, and extract only what is clearly stated or strongly implied. 
Always respond with valid JSON matching the requested schema.`;

// Extract values, interests, and dealbreakers from open-ended answers
export const VALUES_INTERESTS_PROMPT = `${SYSTEM_PROMPT_BASE}

Analyze the following answers and extract:
1. Core values (max 10): Fundamental principles and beliefs they live by (e.g., "honesty", "family", "growth", "adventure", "loyalty", "independence")
2. Interests/hobbies (max 15): Activities, topics, and things they enjoy (e.g., "hiking", "cooking", "reading", "travel", "music", "fitness", "art")
3. Dealbreakers (max 5): Things they explicitly mention as non-negotiables or absolute requirements/rejections in a partner

Only include items that are clearly stated or strongly implied. Use lowercase single words or short phrases.

Respond with JSON in this exact format:
{
  "values": ["value1", "value2", ...],
  "interests": ["interest1", "interest2", ...],
  "dealbreakers": ["dealbreaker1", "dealbreaker2", ...]
}`;

// Extract personality traits as numerical scores
export const PERSONALITY_TRAITS_PROMPT = `${SYSTEM_PROMPT_BASE}

Based on the following answers, rate this person on these personality traits using a 1-10 scale:

1. introversion: 1 = very extroverted (loves crowds, parties, constant socializing), 10 = very introverted (prefers solitude, small groups, quiet time)
2. adventurousness: 1 = loves routine and stability, 10 = thrill-seeking and spontaneous
3. ambition: 1 = content with current situation, 10 = highly driven and goal-oriented
4. emotionalOpenness: 1 = very private and reserved about feelings, 10 = openly expresses and discusses emotions
5. traditionalValues: 1 = very progressive/non-traditional, 10 = very traditional/conservative
6. independenceNeed: 1 = prefers doing everything together, 10 = needs significant personal space and autonomy

Base your ratings on what they explicitly say and imply. If there's not enough information for a trait, use 5 as a neutral default.

Respond with JSON in this exact format:
{
  "introversion": <number>,
  "adventurousness": <number>,
  "ambition": <number>,
  "emotionalOpenness": <number>,
  "traditionalValues": <number>,
  "independenceNeed": <number>
}`;

// Extract family plans and parenting style
export const FAMILY_PLANS_PROMPT = `${SYSTEM_PROMPT_BASE}

Analyze the following answers about family and children to extract:

1. wantsKids: One of "yes", "no", "maybe", "already_has", or "open" based on their stated desires
2. kidsTimeline: If they mention timing, extract it (e.g., "within 2 years", "after 30", "not soon") or null if not mentioned
3. parentingStyle: A brief description of their parenting approach if mentioned (e.g., "supportive and encouraging", "structured with clear boundaries") or null if not mentioned

Respond with JSON in this exact format:
{
  "wantsKids": "<string>",
  "kidsTimeline": "<string or null>",
  "parentingStyle": "<string or null>"
}`;

// Extract lifestyle preferences from essays
export const LIFESTYLE_PROMPT = `${SYSTEM_PROMPT_BASE}

Analyze the following answers to extract lifestyle preferences:

1. dietType: Their diet style if mentioned (e.g., "vegetarian", "vegan", "keto", "no restrictions", "healthy eating") or null
2. petPreference: Their feelings about pets (e.g., "loves dogs", "cat person", "no pets", "loves all animals", "allergic") or "neutral" if unclear
3. locationPreference: Where they want to live - one of "city", "suburb", "rural", "small_town", or "flexible"

Respond with JSON in this exact format:
{
  "dietType": "<string or null>",
  "petPreference": "<string>",
  "locationPreference": "<string>"
}`;

// Extract keywords for search and display
export const KEYWORDS_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract 15-25 keywords that best describe this person based on their answers. Include:
- Personality descriptors (e.g., "ambitious", "creative", "laid-back")
- Interests and hobbies (e.g., "hiking", "cooking", "travel")
- Values (e.g., "family-oriented", "career-driven", "spiritual")
- Lifestyle indicators (e.g., "active", "homebody", "social")

Use lowercase. Prioritize distinctive and meaningful keywords over generic ones.

Respond with JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", ...]
}`;

// Calculate overall confidence score
export const CONFIDENCE_PROMPT = `${SYSTEM_PROMPT_BASE}

Based on the quality and completeness of the answers provided, rate your confidence in the extracted profile data on a scale of 0 to 1:
- 0.9-1.0: Very detailed, thoughtful answers with clear personality and preferences
- 0.7-0.9: Good answers with enough detail for accurate extraction
- 0.5-0.7: Moderate answers, some assumptions needed
- 0.3-0.5: Brief or vague answers, significant uncertainty
- 0.0-0.3: Very minimal information, mostly defaults used

Respond with JSON in this exact format:
{
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}`;

// Helper to format Q&A pairs for prompts
export function formatQAPairs(
  answers: Array<{ questionText: string; answer: string; questionOrder: number }>
): string {
  return answers
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((qa) => `Q${qa.questionOrder}: ${qa.questionText}\nA: ${qa.answer}`)
    .join("\n\n");
}

// Question categories and which questions belong to each extraction type
export const EXTRACTION_QUESTION_GROUPS = {
  // For values/interests extraction - questions about personality, hobbies, values
  valuesInterests: [4, 12, 13, 15, 16, 17, 18, 19, 25, 28, 40, 42, 48, 49, 52, 91, 92, 93, 94, 97, 98],
  
  // For personality traits - questions revealing personality
  personalityTraits: [12, 13, 17, 18, 19, 40, 41, 43, 44, 45, 46, 48, 49, 50, 52, 54, 55, 58, 59, 60, 62, 68, 69, 70, 83, 84, 86, 87, 90, 94],
  
  // For family plans - questions about kids and family
  familyPlans: [72, 75, 76, 77, 78],
  
  // For lifestyle extraction - questions about daily life
  lifestyle: [23, 25, 28, 35, 39],
  
  // For dealbreakers - questions explicitly about requirements
  dealbreakers: [19, 50, 65, 96],
  
  // All open-ended questions for keyword extraction
  allOpenEnded: [2, 3, 4, 11, 12, 13, 15, 16, 17, 18, 19, 23, 25, 28, 35, 39, 40, 41, 42, 43, 44, 45, 48, 49, 50, 52, 54, 55, 58, 59, 60, 62, 65, 66, 68, 69, 70, 72, 75, 76, 77, 78, 81, 83, 84, 86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100],
};
