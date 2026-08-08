import LegalPage from "../components/LegalPage";
import privacyMd from "../content/privacy-policy.md?raw";
import { usePageHead } from "../lib/usePageHead";

export default function PrivacyPage() {
  usePageHead({
    title: "Privacy Policy | Expedition 33dle",
    description: "Privacy policy for Expedition 33dle, a daily guessing game for Clair Obscur: Expedition 33.",
    path: "/privacy",
  });
  return <LegalPage source={privacyMd} />;
}
