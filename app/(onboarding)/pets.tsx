import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Dog", "Cat", "Both", "Other", "None", "Prefer not to say"];

export default function PetsScreen() {
  return (
    <BasicOptionScreen
      stepName="pets"
      field="pets"
      question="Do you have pets?"
      options={OPTIONS}
      optionVariant="chip"
    />
  );
}
