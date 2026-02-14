import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["Yes", "No", "Prefer not to say"];

export default function TattoosScreen() {
  return <BasicOptionScreen stepName="tattoos" field="tattoos" question="Do you have tattoos?" options={OPTIONS} />;
}
