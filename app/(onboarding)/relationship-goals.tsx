import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  { value: "marriage", label: "Marriage" },
  { value: "long_term", label: "Long-term partner" },
  { value: "life_partner", label: "Life partner (no marriage)" },
  { value: "figuring_out", label: "Figuring it out" },
];

export default function RelationshipGoalsScreen() {
  return <BasicOptionScreen stepName="relationship-goals" field="relationshipGoal" question="What are you looking for?" options={OPTIONS} />;
}
