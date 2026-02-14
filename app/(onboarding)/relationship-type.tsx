import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  { value: "Monogamy", label: "Monogamy" },
  { value: "Non-monogamy", label: "Non-monogamy" },
  { value: "Open to either", label: "Open to either" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

export default function RelationshipTypeScreen() {
  return (
    <BasicOptionScreen
      stepName="relationship-type"
      field="relationshipType"
      question="What type of relationship?"
      options={OPTIONS}
    />
  );
}
