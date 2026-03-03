
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    fetchSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchSession();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, created_at, role")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          setProfile(data);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const isAdmin = profile?.role === "admin";

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        {isAdmin ? (
          <div className="text-center">
            <span className="text-xl font-bold">Eventro</span>
            <p className="text-muted-foreground mt-2 mb-0">
              Admin Panel
            </p>
            <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © 2025 Eventro College Event Management System. All rights reserved.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Column 1: About */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">Eventro</span>
                </div>
                <p className="text-muted-foreground mb-4">
                  Your comprehensive platform for managing and discovering college events. Join thousands of students in creating memorable experiences.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" className="text-muted-foreground hover:text-primary transition-colors">
                      Events
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Contact Info */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Contact Info</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span>123 University Ave, College Campus</span>
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-5 w-5 flex-shrink-0" />
                    <span>+1 (555) 123-4567</span>
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-5 w-5 flex-shrink-0" />
                    <span>info@eventro.edu</span>
                  </li>
                </ul>
              </div>
            </div>
            {/* Bottom Footer */}
            <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © 2025 Eventro College Event Management System. All rights reserved.
              </p>
            </div>
          </>
        )}
      </div>
    </footer>
  );
};

export default Footer;
