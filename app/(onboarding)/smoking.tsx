import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Yes", "Sometimes", "No", "Prefer not to say"];

export default function SmokingScreen() {
  return <BasicOptionScreen stepName="smoking" field="smoking" question="Do you smoke?" options={OPTIONS} visibilityField="smokingVisible" />;
}
