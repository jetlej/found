import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "open", label: "Open to it" },
  { value: "not_sure", label: "Not sure" },
];

export default function WantsKidsScreen() {
  return (
    <BasicOptionScreen
      stepName="wants-kids"
      field="wantsChildren"
      question="Do you want children?"
      options={OPTIONS}
    />
  );
}
