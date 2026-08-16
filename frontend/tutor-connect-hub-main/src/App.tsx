import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n-context";
import Index from "./pages/Index";
import TutorSearch from "./pages/TutorSearch";
import TutorDetail from "./pages/TutorDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BecomeTutor from "./pages/BecomeTutor";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import FeedbackPage from "./pages/Feedback";
import FamilyDashboard from "./pages/FamilyDashboard";
import TutorDashboard from "./pages/TutorDashboard";
import JobBoard from "./pages/JobBoard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tutors" element={<TutorSearch />} />
            <Route path="/tutors/:id" element={<TutorDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/become-tutor" element={<BecomeTutor />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/family/dashboard" element={<FamilyDashboard />} />
            <Route path="/tutor/dashboard" element={<TutorDashboard />} />
            <Route path="/jobs" element={<JobBoard />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
