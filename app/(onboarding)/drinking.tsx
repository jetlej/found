import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Yes", "Sometimes", "No", "Prefer not to say"];

export default function DrinkingScreen() {
  return (
    <BasicOptionScreen
      stepName="drinking"
      field="drinking"
      question="Do you drink?"
      options={OPTIONS}
      visibilityField="drinkingVisible"
    />
  );
}
