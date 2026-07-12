import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import Index from "./pages/Index";
import AppHeader from "./components/layout/AppHeader";
import AppFooter from "./components/layout/AppFooter";
import { TrackerProvider } from "./state/tracker";
import { AuthProvider } from "./state/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";

// Landing page is the most common entry point, so it stays eager. Everything
// else loads on demand to keep the initial bundle small.
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Problems = lazy(() => import("./pages/Problems"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Discuss = lazy(() => import("./pages/Discuss"));
const Friends = lazy(() => import("./pages/Friends"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const onError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Something went wrong";
  toast.error(message);
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <TrackerProvider>
                <AppHeader />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/problems" element={<Problems />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/discuss" element={<Discuss />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/settings" element={<Settings />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <AppFooter />
              </TrackerProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
