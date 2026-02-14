import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function KidsScreen() {
  return <BasicOptionScreen stepName="kids" field="hasChildren" question="Do you have children?" options={OPTIONS} optionVariant="row" />;
}
