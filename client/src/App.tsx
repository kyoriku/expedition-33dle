import { BrowserRouter, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import MenuPage from "./pages/MenuPage";
import ClassicPage from "./pages/ClassicPage";
import PictosPage from "./pages/PictosPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="bg-ink text-parchment flex min-h-screen flex-col">
        <div className="grain" aria-hidden="true" />
        <div className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/classic" element={<ClassicPage />} />
            <Route path="/pictos" element={<PictosPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
