"use node";

// Voice questions definition for server-side use
// Mirrors lib/voice-questions.ts but accessible in Convex actions

export const VOICE_QUESTIONS = [
  {
    index: 0,
    category: "Values & Identity",
    text: "Who are you? What do you care about? What gives your life meaning?",
  },
  {
    index: 1,
    category: "Love & Relationships",
    text: "What does your ideal relationship look like? How do you love, and how do you want to be loved?",
  },
  {
    index: 2,
    category: "Your Story",
    text: "Tell me your story. What experiences shaped who you are today?",
  },
  {
    index: 3,
    category: "Daily Life",
    text: "Walk me through your life right now — your days, your work, how you spend your time.",
  },
  {
    index: 4,
    category: "Family & Future",
    text: "What's your relationship with family like, and what do you envision for your own future?",
  },
  {
    index: 5,
    category: "What You Want",
    text: "What are you looking for in a partner? What would make someone not right for you?",
  },
  {
    index: 6,
    category: "Communication",
    text: "How do you handle conflict? What do you need when things get hard?",
  },
  {
    index: 7,
    category: "Passions",
    text: "What are you passionate about? What could you talk about for hours?",
  },
  {
    index: 8,
    category: "Growth",
    text: "What are you working on in yourself? What's something you've struggled with?",
  },
  {
    index: 9,
    category: "The Real You",
    text: "If your best friends were setting you up on a date, what would they say about you — the good, the weird, and what you wish they'd leave out?",
  },
];
