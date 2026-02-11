import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import MasterData from "./pages/MasterData";
import Bilties from "./pages/Bilties";
import CreateBilty from "./pages/CreateBilty";
import Parties from "./pages/Parties";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import Proposals from "./pages/Proposals";
import CreateProposal from "./pages/CreateProposal";
import PaymentRecords from "./pages/PaymentRecords";
import Leads from "./pages/Leads";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import SettingsPage from "./pages/SettingsPage";
import Backup from "./pages/Backup";
import UsersPage from "./pages/UsersPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Index />} />
        <Route path="/master-data" element={<MasterData />} />
        <Route path="/bilties" element={<Bilties />} />
        <Route path="/bilties/create" element={<CreateBilty />} />
        <Route path="/parties" element={<Parties />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/create" element={<CreateInvoice />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/proposals/create" element={<CreateProposal />} />
        <Route path="/payments" element={<PaymentRecords />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
