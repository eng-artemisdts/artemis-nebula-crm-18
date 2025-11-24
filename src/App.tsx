import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadForm from "./pages/LeadForm";
import Leads from "./pages/Leads";
import Categories from "./pages/Categories";
import CategoryManager from "./pages/CategoryManager";
import LeadSearch from "./pages/LeadSearch";
import AIInteraction from "./pages/AIInteraction";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lead/:id"
            element={
              <ProtectedRoute>
                <LeadForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-manager"
            element={
              <ProtectedRoute>
                <CategoryManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lead-search"
            element={
              <ProtectedRoute>
                <LeadSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-interaction"
            element={
              <ProtectedRoute>
                <AIInteraction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute>
                <WhatsAppConnect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
