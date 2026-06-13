import LegalPage from "../components/LegalPage";
import privacyMd from "../content/privacy-policy.md?raw";

export default function PrivacyPage() {
  return <LegalPage source={privacyMd} />;
}
