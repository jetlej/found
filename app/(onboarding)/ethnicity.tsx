import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = [
  "White/Caucasian",
  "Black/African American",
  "Hispanic/Latino",
  "Asian",
  "Middle Eastern",
  "Native American",
  "Pacific Islander",
  "Mixed",
  "Other",
  "Prefer not to say",
];

export default function EthnicityScreen() {
  return (
    <BasicOptionScreen
      stepName="ethnicity"
      field="ethnicity"
      question="What's your ethnicity?"
      options={OPTIONS}
      optionVariant="chip"
      scrollable
    />
  );
}
