import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Liberal", "Moderate", "Conservative", "Not political", "Prefer not to say"];

export default function PoliticsScreen() {
  return <BasicOptionScreen stepName="politics" field="politicalLeaning" question="Where do you lean politically?" options={OPTIONS} optionVariant="chip" scrollable importanceField="politicalImportance" />;
}
