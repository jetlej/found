import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Men", "Women", "Everyone"];

export default function SexualityScreen() {
  return <BasicOptionScreen stepName="sexuality" field="sexuality" question="I'm interested in..." options={OPTIONS} />;
}
