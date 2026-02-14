import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  "Christian",
  "Catholic",
  "Jewish",
  "Muslim",
  "Hindu",
  "Buddhist",
  "Spiritual",
  "Agnostic",
  "Atheist",
  "Other",
  "Prefer not to say",
];

export default function ReligionScreen() {
  return (
    <BasicOptionScreen
      stepName="religion"
      field="religion"
      question="What are your religious beliefs?"
      options={OPTIONS}
      optionVariant="chip"
      scrollable
      importanceField="religionImportance"
    />
  );
}
