import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, Calendar, Info, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";



const Header = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Always fetch session on mount and after login
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    fetchSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Always refresh session after login
      fetchSession();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Fetch user profile from users table
    const fetchProfile = async () => {
      setLoading(true);
      if (user) {
        console.log("👤 Fetching profile for user:", user.id);
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, created_at, role")
          .eq("id", user.id)
          .single();

        console.log("📋 Profile fetch result:", { data, error });

        if (!error && data) {
          console.log("✅ Profile found:", data);
          setProfile(data);
        } else {
          console.log("❌ Profile not found or error:", error?.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const isAuthenticated = !!user && !!profile;
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Eventro</span>
          </Link>

          {/* Navigation */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              <Link
                to="/events"
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>Events</span>
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              >
                <Info className="h-4 w-4" />
                <span>About Us</span>
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>Contact</span>
              </Link>
            </nav>
          )}

          {/* Auth Buttons / Profile */}
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to={isAdmin ? "/admin-dashboard" : "/dashboard"} className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero cursor-pointer hover:shadow-glow transition-shadow">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-medium text-foreground/90">{profile.name}</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setProfile(null);
                    setUser(null);
                    navigate("/login");
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-hero hover:opacity-90 transition-opacity">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
