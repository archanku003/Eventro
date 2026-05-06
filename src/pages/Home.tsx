// Helper to determine event status (copied from Events page)
function getEventStatus(eventDate: string): "today" | "tomorrow" | "upcoming" | "completed" {
  const now = new Date();
  const event = new Date(eventDate);
  const diff = Math.floor((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "completed";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "upcoming";
}
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import { useToast } from "@/hooks/use-toast";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end?: string) {
  const to12Hour = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };
  if (!end) return to12Hour(start);
  return `${to12Hour(start)} - ${to12Hour(end)}`;
}

const Home = () => {
  // Cancel registration handler (must be inside component to access state)
  const handleCancel = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    if (!error) {
      setRegistrations((prev) => prev.filter((id) => id !== eventId));
      toast && toast({ title: "Registration cancelled." });
    }
  };
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [registrations, setRegistrations] = useState<string[]>([]); // event ids
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { toast } = useToast();

  // Fetch user
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ?? null);
      } finally {
        setAuthLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch registrations for logged-in user
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (user) {
        const { data, error } = await supabase.from("registrations").select("event_id").eq("user_id", user.id);
        if (!error && data) {
          setRegistrations((data as { event_id: string }[]).map((r) => r.event_id));
        }
      } else {
        setRegistrations([]);
      }
    };
    fetchRegistrations();
  }, [user]);


  useEffect(() => {
    setLoadingEvents(true);
    supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true })
      .then(({ data, error }) => {
        setEvents(error ? [] : data || []);
        setLoadingEvents(false);
      });
  }, []);

  // Registration handler with profile check to avoid FK violations
  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast({ title: "Please log in to register for events." });
      return;
    }

    let profileExists = false;
    try {
      const { data: existingProfile, error: profileErr } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileErr) {
        console.warn("Failed to check users profile before registration:", profileErr.message || profileErr);
      } else if (existingProfile) {
        profileExists = true;
      } else {
        const profileInsert = { id: user.id, email: user.email || "", name: (user.user_metadata as any)?.name || user.email || "" };
        const { error: createErr } = await supabase.from("users").insert([profileInsert]);
        if (createErr) {
          console.warn("Failed to create users profile before registration:", createErr.message || createErr);
        } else {
          profileExists = true;
        }
      }
    } catch (e) {
      console.warn("Unexpected error while ensuring user profile for registration", e);
    }

    const payload = { user_id: profileExists ? user.id : null, event_id: eventId } as any;
    const { error } = await supabase.from("registrations").insert([payload]);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registered!", description: "You have registered for the event." });
      setRegistrations((prev) => [...prev, eventId]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200')",
          }}
        ></div>
        <div className="container relative mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Ready to Transform Your College Experience?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Join thousands of students who are already using Eventro to
              discover, register, and participate in amazing college events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!authLoading && !user && (
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-gradient-hero hover:opacity-90 transition-opacity text-lg px-8 shadow-glow"
                  >
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/events">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Browse Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Upcoming Events (visible to all users) */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Here are the upcoming events you can join!
            </p>
          </div>
          {loadingEvents ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No upcoming events found.
              </p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events
                  .filter((event) => {
                    const status = getEventStatus(event.date);
                    return status === "upcoming" || status === "tomorrow";
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 3)
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      name={event.title}
                      venue={event.location || ""}
                      formattedDate={formatDate(event.date)}
                      time={formatTimeRange(event.time, event.end_time)}
                      collegeName={event.university_name || ""}
                      image={event.image || ""}
                      status={getEventStatus(event.date)}
                      description={event.description}
                      onRegister={(student) => { void handleRegister(event.id, student); }}
                      isRegistered={registrations.includes(event.id)}
                      isFirstTime={registrations.length === 0}
                      onCancel={() => handleCancel(event.id)}
                    />
                  ))}
              </div>
              <div className="flex justify-center mt-8">
                <Link to="/events">
                  <Button size="lg" className="bg-gradient-hero hover:opacity-90 transition-opacity text-lg px-8 shadow-glow">
                    Explore All Events
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Conditional Section */}
      {!user && (
        <>
          {/* Features Section */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why Choose Eventro?
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need to stay connected with campus events
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Discover Events
                  </h3>
                  <p className="text-muted-foreground">
                    Browse through a wide variety of college events, from academic
                    seminars to cultural festivals.
                  </p>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Easy Registration</h3>
                  <p className="text-muted-foreground">
                    Register for events with just a few clicks and manage all your
                    registrations in one place.
                  </p>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Stay Updated</h3>
                  <p className="text-muted-foreground">
                    Get real-time notifications about upcoming events and important
                    updates.
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* CTA Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center bg-gradient-hero rounded-2xl p-12 text-primary-foreground">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Start Your Journey Today
                </h2>
                <p className="text-lg mb-6 opacity-90">
                  Don't miss out on the best college events. Join Eventro now!
                </p>
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-background text-foreground hover:bg-background/90 text-lg px-8"
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
      <Footer />
    </div>
  );
};

export default Home;