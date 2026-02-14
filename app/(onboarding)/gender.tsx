import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Woman", "Man", "Non-binary"];

export default function GenderScreen() {
  return <BasicOptionScreen stepName="gender" field="gender" question="I am a..." options={OPTIONS} />;
}
