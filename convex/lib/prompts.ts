// Prompt templates for AI profile extraction

import { CANONICAL_VALUES, RELATIONSHIP_VALUES } from "./canonicalValues";

export const SYSTEM_PROMPT_BASE = `You are an AI assistant helping to analyze dating profile answers to extract structured data for compatibility matching. 
Be accurate, concise, and extract only what is clearly stated or strongly implied. 
Always respond with valid JSON matching the requested schema.`;

// Canonical values list for the prompt
const CANONICAL_VALUES_LIST = CANONICAL_VALUES.join(", ");
const RELATIONSHIP_VALUES_LIST = RELATIONSHIP_VALUES.join(", ");

// Extract ONLY canonical values from essays - used for matching
export const CANONICAL_VALUES_PROMPT = `${SYSTEM_PROMPT_BASE}

Analyze the following answers and extract values that this person holds.

IMPORTANT: You MUST only return values from this exact list:
${CANONICAL_VALUES_LIST}

Map what they express to the closest matching canonical value. For example:
- "I value being truthful" → "honesty"
- "My family means everything to me" → "family"
- "I'm always trying to improve myself" → "growth"
- "I love exploring new places" → "adventure"

Return 5-10 values that clearly match what they express. Do NOT include values that aren't in the list above.

Also extract any values they mention that DON'T match the canonical list - these go in rawValues for display purposes only.

Respond with JSON:
{
  "canonicalValues": ["value1", "value2", ...],
  "rawValues": ["any", "other", "values", "mentioned"]
}`;

// Legacy prompt for backwards compatibility - extracts arbitrary values
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

// Extract personality traits as numerical scores (11 dimensions)
export const PERSONALITY_TRAITS_PROMPT = `${SYSTEM_PROMPT_BASE}

Based on the following answers, rate this person on these personality traits using a 1-10 scale:

1. introversion: 1 = very extroverted (loves crowds, parties, constant socializing), 10 = very introverted (prefers solitude, small groups, quiet time)
2. adventurousness: 1 = loves routine and stability, 10 = thrill-seeking and spontaneous
3. ambition: 1 = content with current situation, 10 = highly driven and goal-oriented
4. emotionalOpenness: 1 = very private and reserved about feelings, 10 = openly expresses and discusses emotions
5. traditionalValues: 1 = very progressive/non-traditional, 10 = very traditional/conservative
6. independenceNeed: 1 = prefers doing everything together, 10 = needs significant personal space and autonomy
7. romanticStyle: 1 = very practical about love (logical, pragmatic), 10 = deeply romantic (believes in grand gestures, soulmates)
8. socialEnergy: 1 = homebody (prefers staying in), 10 = social butterfly (always out, loves events)
9. communicationStyle: 1 = reserved (keeps thoughts to self), 10 = expressive (shares everything openly)
10. attachmentStyle: 1 = avoidant (needs lots of space, slow to commit), 10 = anxious (needs reassurance, very attached)
11. planningStyle: 1 = spontaneous (goes with the flow), 10 = structured (plans everything in advance)

Base your ratings on what they explicitly say and imply. If there's not enough information for a trait, use 5 as a neutral default.

Respond with JSON in this exact format:
{
  "introversion": <number>,
  "adventurousness": <number>,
  "ambition": <number>,
  "emotionalOpenness": <number>,
  "traditionalValues": <number>,
  "independenceNeed": <number>,
  "romanticStyle": <number>,
  "socialEnergy": <number>,
  "communicationStyle": <number>,
  "attachmentStyle": <number>,
  "planningStyle": <number>
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

// Extract life story narrative elements (Phase 2)
export const LIFE_STORY_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract narrative elements from this person's life story for creating compelling bios:

1. proudestAchievement: Their single biggest accomplishment they're proud of (1-2 sentences) or null
2. definingHardship: A challenge they've overcome that shaped them (1-2 sentences) or null
3. biggestRisk: The biggest risk they've taken (1-2 sentences) or null
4. dreams: List of their hopes/dreams for the future (max 5 items)
5. fears: List of their fears/anxieties about the future (max 5 items)
6. formativeExperiences: Key experiences that shaped who they are (max 5 items)
7. favoriteStory: Their favorite personal story to tell (2-3 sentences) or null

Respond with JSON:
{
  "proudestAchievement": "<string or null>",
  "definingHardship": "<string or null>",
  "biggestRisk": "<string or null>",
  "dreams": ["dream1", ...],
  "fears": ["fear1", ...],
  "formativeExperiences": ["experience1", ...],
  "favoriteStory": "<string or null>"
}`;

// Extract social profile (Phase 3)
export const SOCIAL_PROFILE_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract this person's social style and preferences:

1. socialStyle: One of "very_active", "active", "balanced", "quiet", or "introverted"
2. weekendStyle: Brief description of how they spend weekends (1 sentence) or null
3. idealFridayNight: Their ideal Friday night (1 sentence) or null
4. goOutFrequency: 1-10 scale (1=always stays in, 10=always out)
5. friendApprovalImportance: 1-10 scale (1=doesn't matter, 10=essential their partner gets along with friends)
6. socialCircleVision: What their ideal social circle looks like (1 sentence) or null

Respond with JSON:
{
  "socialStyle": "<string>",
  "weekendStyle": "<string or null>",
  "idealFridayNight": "<string or null>",
  "goOutFrequency": <number>,
  "friendApprovalImportance": <number>,
  "socialCircleVision": "<string or null>"
}`;

// Extract intimacy profile (Phase 4)
export const INTIMACY_PROFILE_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract this person's approach to intimacy and connection:

1. physicalIntimacyImportance: 1-10 scale (1=not important, 10=very important)
2. physicalAttractionImportance: 1-10 scale (1=not important, 10=very important)
3. pdaComfort: One of "loves_it", "comfortable", "moderate", "private", or "uncomfortable"
4. emotionalIntimacyApproach: How they build emotional intimacy (1-2 sentences) or null
5. connectionTriggers: What makes them feel most connected to a partner (max 5 items)
6. healthyIntimacyVision: Their vision of healthy intimacy (1-2 sentences) or null

Respond with JSON:
{
  "physicalIntimacyImportance": <number>,
  "physicalAttractionImportance": <number>,
  "pdaComfort": "<string>",
  "emotionalIntimacyApproach": "<string or null>",
  "connectionTriggers": ["trigger1", ...],
  "healthyIntimacyVision": "<string or null>"
}`;

// Extract love philosophy (Phase 5)
export const LOVE_PHILOSOPHY_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract this person's philosophy and beliefs about love:

1. believesInSoulmates: true or false based on their answer
2. loveDefinition: How they define love (1-2 sentences) or null
3. loveRecognition: Signs that tell them they're in love (max 5 items)
4. romanticGestures: Romantic gestures they appreciate (max 5 items)
5. healthyRelationshipVision: What a healthy relationship looks like to them (1-2 sentences) or null
6. bestAdviceReceived: Best relationship advice they've received (1 sentence) or null

Respond with JSON:
{
  "believesInSoulmates": <boolean>,
  "loveDefinition": "<string or null>",
  "loveRecognition": ["sign1", ...],
  "romanticGestures": ["gesture1", ...],
  "healthyRelationshipVision": "<string or null>",
  "bestAdviceReceived": "<string or null>"
}`;

// Extract partner preferences (Phase 6)
export const PARTNER_PREFERENCES_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract what this person is looking for in a partner:

1. mustHaves: Non-negotiable qualities they need in a partner (max 7 items)
2. niceToHaves: Qualities they'd appreciate but aren't essential (max 7 items)
3. redFlags: Warning signs or behaviors that concern them (max 5 items)
4. importantQualities: Most important qualities overall (max 5 items)
5. dealbreakersInPartner: Absolute dealbreakers specific to a partner (max 5 items)

Respond with JSON:
{
  "mustHaves": ["quality1", ...],
  "niceToHaves": ["quality1", ...],
  "redFlags": ["flag1", ...],
  "importantQualities": ["quality1", ...],
  "dealbreakersInPartner": ["dealbreaker1", ...]
}`;

// Extract bio elements (Phase 7)
export const BIO_ELEMENTS_PROMPT = `${SYSTEM_PROMPT_BASE}

Extract elements useful for creating engaging profile bios:

1. conversationStarters: Unique facts or stories that would spark conversation (max 5)
2. interestingFacts: Interesting things about them that stand out (max 5)
3. uniqueQuirks: Quirks or habits that make them unique (max 5)
4. passions: What they're most passionate about (max 5)
5. whatTheySek: What they're ultimately looking for, in their own voice (1-2 sentences) or null

Respond with JSON:
{
  "conversationStarters": ["starter1", ...],
  "interestingFacts": ["fact1", ...],
  "uniqueQuirks": ["quirk1", ...],
  "passions": ["passion1", ...],
  "whatTheySek": "<string or null>"
}`;

// Generate comprehensive bio (Phase 10)
// Bio generation prompt - use getBioGenerationPrompt(gender) function instead
export const BIO_GENERATION_PROMPT = `${SYSTEM_PROMPT_BASE}

Write a comprehensive, engaging paragraph bio (150-200 words) for this person based on their answers. The bio should:

- Feel natural and conversational, not like a list of facts
- Highlight what makes them unique and interesting
- Cover who they are (personality, values, career)
- Include what they enjoy (interests, hobbies, social style)
- Touch on what they're looking for (relationship goals)
- Mention something memorable or distinctive about them
- Avoid clichés and generic phrases
- Be written in third person (they/their)

Write in a warm, engaging tone that would make someone want to learn more about this person.

Respond with JSON:
{
  "bio": "<the paragraph bio>"
}`;

// Gender-aware bio generation prompt
export function getBioGenerationPrompt(gender?: string): string {
  const pronounInfo = getPronounInfo(gender);
  
  return `${SYSTEM_PROMPT_BASE}

Write a comprehensive, engaging paragraph bio (150-200 words) for this person based on their answers. The bio should:

- Feel natural and conversational, not like a list of facts
- Highlight what makes them unique and interesting
- Cover who they are (personality, values, career)
- Include what they enjoy (interests, hobbies, social style)
- Touch on what they're looking for (relationship goals)
- Mention something memorable or distinctive about them
- Avoid clichés and generic phrases
- Use ${pronounInfo.subject}/${pronounInfo.object}/${pronounInfo.possessive} pronouns (this person identifies as ${gender || "unspecified"})

Write in a warm, engaging tone that would make someone want to learn more about this person.

Respond with JSON:
{
  "bio": "<the paragraph bio>"
}`;
}

// Short bio generation prompt (one sentence for match cards)
export function getShortBioPrompt(): string {
  return `${SYSTEM_PROMPT_BASE}

Write a single, punchy sentence (15-25 words max) that captures this person's essence - who they are and what makes them interesting. 

Rules:
- ONE sentence only, no more
- Start with "A" or "An" followed by their profession/role (e.g., "A librarian who...", "An architect with...")
- Do NOT use pronouns like "She's", "He's", "They're" - just start with the article
- Lead with what's most distinctive about them
- Be specific, not generic (avoid "loves to laugh" type clichés)
- Make it memorable and intriguing

Good examples:
- "A startup founder who unwinds by baking elaborate French pastries and hiking with her golden retriever."
- "A laid-back architect with a secret obsession for competitive board games and vintage vinyl."
- "An elementary school teacher who builds cozy reading nooks and hosts neighborhood book clubs."
- "A driven corporate M&A lawyer who decompresses through pottery and long trail runs."

Respond with JSON:
{
  "shortBio": "<single sentence bio>"
}`;
}

// Helper to get pronouns based on gender
function getPronounInfo(gender?: string): { subject: string; object: string; possessive: string } {
  switch (gender?.toLowerCase()) {
    case "man":
      return { subject: "he", object: "him", possessive: "his" };
    case "woman":
      return { subject: "she", object: "her", possessive: "her" };
    case "non-binary":
    default:
      return { subject: "they", object: "them", possessive: "their" };
  }
}

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
// Updated for restructured 89-question format with 6 categories
export const EXTRACTION_QUESTION_GROUPS = {
  // For values/interests extraction - questions about personality, hobbies, values
  // Category 2 essays + hobbies + lifestyle essays
  valuesInterests: [24, 44, 45, 70, 71, 86, 87, 88, 89],
  
  // For personality traits (expanded to 11 dimensions) - questions revealing personality
  // Category 2 (Who You Are) + some relationship style questions
  personalityTraits: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 46, 47, 48, 51, 52, 67, 68],
  
  // For family plans - questions about kids and family
  // Category 1 kids questions + Category 5 family questions
  familyPlans: [5, 6, 7, 8, 9, 72, 73, 74, 79, 80],
  
  // For lifestyle extraction - questions about daily life
  // Category 4 (Lifestyle) + substance questions from Category 1
  lifestyle: [25, 27, 29, 31, 60, 61, 62, 65, 66, 67],
  
  // For dealbreakers - questions explicitly about requirements/dealbreakers
  // Essay dealbreaker + all checklist preference questions
  dealbreakers: [2, 4, 6, 8, 15, 17, 20, 23, 26, 28, 30, 32, 45, 59],
  
  // For life story extraction - narrative elements
  // Category 5 (Life & Future) essays + Category 6 essays
  lifeStory: [79, 80, 81, 83, 84, 85],
  
  // For social profile - social style and preferences
  // Category 2 social questions + Category 4 social questions
  socialProfile: [33, 67, 68, 69, 70],
  
  // For intimacy profile - physical and emotional intimacy
  // Category 3 (Relationship Style) intimacy questions
  intimacyProfile: [53, 54, 55, 58],
  
  // For love philosophy - beliefs about love and relationships
  // Category 6 (The Deeper Stuff) + healthy relationship essay
  lovePhilosophy: [58, 82, 83],
  
  // For partner preferences - what they want in a partner
  // All checklist questions + dealbreaker essays
  partnerPreferences: [2, 4, 6, 8, 15, 17, 20, 23, 26, 28, 30, 32, 45, 59],
  
  // For bio elements - conversation starters and unique facts
  // Essays that reveal personality + hobbies + quirks
  bioElements: [24, 44, 45, 70, 84, 85, 86, 87, 88, 89],
  
  // For health snapshot
  // Category 4 health questions + health essay
  health: [63, 64, 71],
  
  // All open-ended questions for keyword extraction
  // Essays and text questions only
  allOpenEnded: [24, 44, 45, 58, 59, 70, 71, 79, 80, 81, 83, 84, 85, 86, 87, 88, 89],
};
