// 9 broad voice questions designed to capture the same information as 91 text questions
// Users record voice answers which are transcribed and parsed by AI

export type VoiceQuestionIcon =
  | "diamond"
  | "heart"
  | "book"
  | "leaf"
  | "users"
  | "target"
  | "star"
  | "seedling"
  | "sparkles";

export interface VoiceQuestion {
  index: number;
  category: string; // Short category name displayed on the card
  icon: VoiceQuestionIcon;
  text: string; // Full question shown in the recording modal
  description: string; // What this question captures (for internal reference)
}

export const VOICE_QUESTIONS: VoiceQuestion[] = [
  {
    index: 0,
    category: "Values & Identity",
    icon: "diamond",
    text: "Who are you? What do you care about? What gives your life meaning?",
    description: "Values, identity, priorities",
  },
  {
    index: 1,
    category: "Love & Relationships",
    icon: "heart",
    text: "What does your ideal relationship look like? How do you love, and how do you want to be loved?",
    description: "Love language, relationship style, attachment",
  },
  {
    index: 2,
    category: "Your Story",
    icon: "book",
    text: "Tell me your story. What experiences shaped who you are today?",
    description: "Background, formative moments, life story",
  },
  {
    index: 3,
    category: "Daily Life",
    icon: "leaf",
    text: "Walk me through your life right now — your days, your work, how you spend your time.",
    description: "Lifestyle, career, daily routine, social life",
  },
  {
    index: 4,
    category: "Family & Future",
    icon: "users",
    text: "What's your relationship with family like, and what do you envision for your own future?",
    description: "Family closeness, kids, location, future plans",
  },
  {
    index: 5,
    category: "What You Want",
    icon: "target",
    text: "What are you looking for in a partner? What would make someone not right for you?",
    description: "Partner preferences, dealbreakers",
  },
  {
    index: 6,
    category: "Passions",
    icon: "star",
    text: "What are you passionate about? What could you talk about for hours?",
    description: "Interests, hobbies, passions",
  },
  {
    index: 7,
    category: "Growth",
    icon: "seedling",
    text: "How have you grown in the last few years? What are some things you used to believe that you've changed your mind about?",
    description: "Growth mindset, self-awareness, evolution",
  },
];

export const TOTAL_VOICE_QUESTIONS = VOICE_QUESTIONS.length;

export function getVoiceQuestion(index: number): VoiceQuestion | undefined {
  return VOICE_QUESTIONS.find((q) => q.index === index);
}
