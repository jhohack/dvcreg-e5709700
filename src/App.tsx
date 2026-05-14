import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Register from "./pages/Register";
import AdminRecords from "./pages/AdminRecords";
import NotFound from "./pages/NotFound";
import AppFooter from "./components/AppFooter";

const queryClient = new QueryClient();
//test

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-background">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Register />} />
              <Route path="/admin" element={<AdminRecords />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <AppFooter />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
