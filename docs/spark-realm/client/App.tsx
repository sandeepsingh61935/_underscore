import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";

// Pages
import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import ModeSelection from "./pages/ModeSelection";
import Collections from "./pages/Collections";
import DomainDetails from "./pages/DomainDetails";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/mode" element={<ModeSelection />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/domain/:domain" element={<DomainDetails />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
