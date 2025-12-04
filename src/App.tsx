import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadForm from "./pages/LeadForm";
import Leads from "./pages/Leads";
import Categories from "./pages/Categories";
import CategoryManager from "./pages/CategoryManager";
import LeadSearch from "./pages/LeadSearch";
import AIConfiguration from "./pages/AIConfiguration";
import AIInteraction from "./pages/AIInteraction";
import Documents from "./pages/Documents";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import Settings from "./pages/Settings";
import MessageConfiguration from "./pages/MessageConfiguration";
import ScheduleMessages from "./pages/ScheduleMessages";
import ScheduleInteractions from "./pages/ScheduleInteractions";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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
              path="/ai-configuration"
              element={
                <ProtectedRoute>
                  <AIConfiguration />
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
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/message-configuration"
              element={
                <ProtectedRoute>
                  <MessageConfiguration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule-messages"
              element={
                <ProtectedRoute>
                  <ScheduleMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule-interactions"
              element={
                <ProtectedRoute>
                  <ScheduleInteractions />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
