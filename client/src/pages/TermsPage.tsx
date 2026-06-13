import LegalPage from "../components/LegalPage";
import termsMd from "../content/terms-of-service.md?raw";

export default function TermsPage() {
  return <LegalPage source={termsMd} />;
}
