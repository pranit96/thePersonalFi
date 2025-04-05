import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Goals from "@/pages/Goals";
import Insights from "@/pages/Insights";
import Privacy from "@/pages/Privacy";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/auth-page";
import { FinanceProvider } from "./context/FinanceContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/layout/MobileNav";

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background-dark to-background-light text-text">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-4 md:pt-0 pb-4 px-4 mt-14 md:mt-0">
        <MobileNav />
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function DashboardPage() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}

function TransactionsPage() {
  return (
    <MainLayout>
      <Transactions />
    </MainLayout>
  );
}

function GoalsPage() {
  return (
    <MainLayout>
      <Goals />
    </MainLayout>
  );
}

function InsightsPage() {
  return (
    <MainLayout>
      <Insights />
    </MainLayout>
  );
}

function PrivacyPage() {
  return (
    <MainLayout>
      <Privacy />
    </MainLayout>
  );
}

function SettingsPage() {
  return (
    <MainLayout>
      <Settings />
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/goals" component={GoalsPage} />
      <ProtectedRoute path="/insights" component={InsightsPage} />
      <ProtectedRoute path="/privacy" component={PrivacyPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <FinanceProvider>
            <Router />
            <Toaster />
          </FinanceProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
