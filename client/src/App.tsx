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
import { FinanceProvider } from "./context/FinanceContext";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/layout/MobileNav";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background-dark to-background-light text-text">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-4 md:pt-0 pb-4 px-4 mt-14 md:mt-0">
        <MobileNav />
        <div className="max-w-6xl mx-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/transactions" component={Transactions} />
            <Route path="/goals" component={Goals} />
            <Route path="/insights" component={Insights} />
            <Route path="/privacy" component={Privacy} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FinanceProvider>
        <Router />
        <Toaster />
      </FinanceProvider>
    </QueryClientProvider>
  );
}

export default App;
