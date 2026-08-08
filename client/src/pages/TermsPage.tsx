import LegalPage from "../components/LegalPage";
import termsMd from "../content/terms-of-service.md?raw";
import { usePageHead } from "../lib/usePageHead";

export default function TermsPage() {
  usePageHead({
    title: "Terms of Service | Expedition 33dle",
    description: "Terms of service for Expedition 33dle, a daily guessing game for Clair Obscur: Expedition 33.",
    path: "/terms",
  });
  return <LegalPage source={termsMd} />;
}
