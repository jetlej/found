import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Yes", "Sometimes", "No", "Prefer not to say"];

export default function MarijuanaScreen() {
  return <BasicOptionScreen stepName="marijuana" field="marijuana" question="Do you use marijuana?" options={OPTIONS} visibilityField="marijuanaVisible" />;
}
