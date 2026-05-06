import Home from "./pages/Home";
import Events from "./pages/Events";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScanner from "./pages/AdminScanner";
import Attendees from "./pages/Attendees";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user) {
        const { data: profile, error } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          console.error("Failed to fetch user role:", error);
        }
        setRole(profile?.role ?? null);
      } else {
        setRole(null);
      }
      setRoleLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        supabase
          .from("users")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to fetch user role on auth state change:", error);
            }
            setRole(data?.role ?? null);
            setRoleLoaded(true);
          });
      } else {
        setRole(null);
        setRoleLoaded(true);
      }
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {!roleLoaded ? (
            <div className="min-h-screen flex items-center justify-center">Loading…</div>
          ) : (
            <Routes>
              {role === "admin" ? (
                <>
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/admin-scanner" element={<AdminScanner />} />
                  <Route path="/attendees" element={<Attendees />} />
                  <Route path="*" element={<AdminDashboard />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </>
              )}
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
