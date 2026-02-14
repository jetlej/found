import { BasicOptionScreen } from "@/components/BasicOptionScreen";

const OPTIONS = ["he/him", "she/her", "they/them", "Other", "Prefer not to say"];

export default function PronounsScreen() {
  return <BasicOptionScreen stepName="pronouns" field="pronouns" question="What are your pronouns?" options={OPTIONS} />;
}
