import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import MenuPage from "./pages/MenuPage";
import ClassicPage from "./pages/ClassicPage";
import PictosPage from "./pages/PictosPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ScrollToTop from "./components/ScrollToTop";
import { pruneOldDailyState } from "./lib/storage";
import { todayUtcISO } from "./lib/time";

export default function App() {
  // Once on boot: drop daily-state keys from previous days so localStorage
  // doesn't accumulate indefinitely (stats/tutorial keys are preserved).
  useEffect(() => {
    pruneOldDailyState(todayUtcISO());
  }, []);

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
