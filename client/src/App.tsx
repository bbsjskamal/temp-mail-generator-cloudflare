import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TempMailApp from "./pages/TempMailApp";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={TempMailApp} />
      <Route path={"/domain/:domain"} component={TempMailApp} />
      <Route path={"/404"} component={NotFound} />
      {/* Fallback route */}
      <Route component={TempMailApp} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
