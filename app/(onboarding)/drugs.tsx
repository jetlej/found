import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Yes", "Sometimes", "No", "Prefer not to say"];

export default function DrugsScreen() {
  return (
    <BasicOptionScreen
      stepName="drugs"
      field="drugs"
      question="Do you use drugs?"
      options={OPTIONS}
      visibilityField="drugsVisible"
    />
  );
}
