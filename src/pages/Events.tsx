import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


// Helper to determine event status
// Improved: uses both date and end_time
export function getEventStatus(eventDate: string, startTime?: string, endTime?: string): "ongoing" | "today" | "tomorrow" | "upcoming" | "completed" {
  const now = new Date();
  const eventDateObj = new Date(eventDate);
  // Get only the date part for both
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDateOnly = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());
  const diffDays = Math.floor((eventDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "completed";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === 0) {
    if (startTime && endTime) {
      // Parse start and end time (HH:mm)
      const [startHour, startMinute] = startTime.split(":");
      const [endHour, endMinute] = endTime.split(":");
      const eventStart = new Date(eventDateOnly);
      eventStart.setHours(Number(startHour), Number(startMinute), 0, 0);
      const eventEnd = new Date(eventDateOnly);
      eventEnd.setHours(Number(endHour), Number(endMinute), 0, 0);
      if (now >= eventStart && now <= eventEnd) {
        return "ongoing";
      }
      if (now > eventEnd) {
        return "completed";
      }
    }
    return "today";
  }
  if (diffDays > 1) return "upcoming";
  return "upcoming";
}

const Events = () => {

  const [filter, setFilter] = useState<string>("all");
  // Removed typeFilter state
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Record<string, { ticket_id?: string | null; ticket_qr?: string | null; attended?: boolean }>>({}); // map by event id
  const { toast } = useToast();
  // Fetch registrations for logged-in user
  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("registrations")
          .select("event_id, ticket_id, ticket_qr, attended")
          .eq("user_id", user.id);
        if (!error && data) {
          const map: Record<string, any> = {};
          (data as any[]).forEach((r) => {
            if (r && r.event_id) map[r.event_id] = { ticket_id: r.ticket_id, ticket_qr: r.ticket_qr, attended: !!r.attended };
          });
          setRegistrations(map);
        }
      } else {
        setRegistrations({});
      }
    };
    fetchRegistrations();
    // Listen for registration changes triggered elsewhere (registration, backfill, scanner)
    const handler = () => {
      // always refresh to keep local cache in sync
      fetchRegistrations();
    };
    window.addEventListener("registrations:changed", handler as EventListener);
    return () => window.removeEventListener("registrations:changed", handler as EventListener);
  }, []);
  // Registration handler
  const handleRegister = async (eventId: string, studentData?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please log in to register for events." });
      return;
    }
    // generate a ticket id and QR code (data URL)
    // Use browser `crypto.randomUUID()` when available to avoid adding an external dependency.
    const ticketId =
      typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    let qrDataUrl: string | null = null;
    try {
      const payload = JSON.stringify({ ticketId, eventId, userId: user.id });
      // Dynamically import `qrcode` to avoid Vite static import-analysis failures
      const qrcodeModule = await import("qrcode");
      const QRCodeLib = (qrcodeModule as any).default ?? qrcodeModule;
      if (typeof QRCodeLib.toDataURL === "function") {
        qrDataUrl = await QRCodeLib.toDataURL(payload);
      } else {
        qrDataUrl = null;
      }
    } catch (err) {
      console.error("Failed to generate QR code (dynamic import)", err);
      qrDataUrl = null;
    }

    // Insert and return the inserted registration so we can confirm ticket fields are stored
    // Prefer studentData passed from the registration dialog (saved immediately before calling onRegistered)
    let studentFields: Record<string, any> = {};
    if (studentData) {
      studentFields = {
        name: studentData.name,
        email: studentData.email,
        mobile: studentData.mobile,
        roll_number: studentData.roll_number,
        course: studentData.course,
      };
    } else {
      // Try to fetch student info (if available) to store with registration
      try {
        const meta: any = (user as any)?.user_metadata ?? {};
        const saved_roll = meta?.saved_roll;
        const saved_email = meta?.saved_email || user.email;
        if (saved_roll || saved_email) {
          const q = [] as string[];
          if (saved_roll) q.push(`roll_number.eq.${saved_roll}`);
          if (saved_email) q.push(`email.eq.${saved_email}`);
          const orClause = q.join(",");
          const { data: stud } = await supabase.from("students").select("*").or(orClause).maybeSingle();
          if (stud) {
            studentFields = {
              name: stud.name,
              email: stud.email,
              mobile: stud.mobile,
              roll_number: stud.roll_number,
              course: stud.course,
            };
          }
        }
      } catch (e) {
        // ignore student lookup errors
      }
    }

    // First attempt: insert registration including student fields (works if DB schema has these columns)
    let inserted: any = null;
    let insertError: any = null;
    try {
      const payload = {
        user_id: user.id,
        event_id: eventId,
        ticket_id: ticketId,
        ticket_qr: qrDataUrl,
        ticket_issued_at: new Date().toISOString(),
        ...studentFields,
      };
      const res = await supabase.from("registrations").insert([payload]).select().single();
      inserted = res.data;
      insertError = res.error;
    } catch (e: any) {
      insertError = e;
    }

    // If insert failed (likely because schema doesn't have student columns), retry without student fields
    if (insertError) {
      try {
        const res2 = await supabase
          .from("registrations")
          .insert([
            {
              user_id: user.id,
              event_id: eventId,
              ticket_id: ticketId,
              ticket_qr: qrDataUrl,
              ticket_issued_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        inserted = res2.data;
        insertError = res2.error;
      } catch (e: any) {
        insertError = e;
      }
    }

    if (insertError) {
      toast({ title: "Registration failed", description: insertError.message, variant: "destructive" });
    } else {
      console.log("Inserted registration:", inserted);
      toast({ title: "Registered!", description: "You have registered for the event." });
      setRegistrations((prev) => ({ ...prev, [eventId]: { ticket_id: inserted?.ticket_id || ticketId, ticket_qr: inserted?.ticket_qr || qrDataUrl, attended: !!inserted?.attended } }));
      try {
        // notify other parts of the app (Dashboard) to refresh registrations
        window.dispatchEvent(new CustomEvent("registrations:changed", { detail: inserted }));
      } catch (e) {
        // ignore in non-browser environments
      }

      // If QR wasn't generated, attempt background QR generation and update the registration
      if (inserted && !inserted.ticket_qr) {
        const regId = inserted.id;
        const ticketIdStored = inserted.ticket_id || ticketId;
        // run retries in background (no await)
        (async function retryGenerate(attempt = 1) {
          try {
            const payload = JSON.stringify({ ticketId: ticketIdStored, eventId, userId: user.id });
            const qrcodeModule = await import("qrcode");
            const QRCodeLib = (qrcodeModule as any).default ?? qrcodeModule;
            if (QRCodeLib && typeof QRCodeLib.toDataURL === "function") {
              const qr = await QRCodeLib.toDataURL(payload);
              const { error: updateErr } = await supabase
                .from("registrations")
                .update({ ticket_qr: qr })
                .eq("id", regId);
              if (!updateErr) {
                console.log("Backfilled QR for registration", regId);
                // notify dashboard to refresh
                try { window.dispatchEvent(new CustomEvent("registrations:changed", { detail: { id: regId, ticket_qr: qr } })); } catch { }
                setRegistrations((prev) => ({ ...prev, [eventId]: { ...(prev[eventId] || {}), ticket_qr: qr } }));
                return;
              }
            }
          } catch (err) {
            console.warn("QR retry attempt", attempt, "failed:", err);
          }
          if (attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            setTimeout(() => retryGenerate(attempt + 1), delay);
          } else {
            console.warn("QR generation retry exhausted for registration", regId);
          }
        })();
      }
    }
  };

  // Cancel registration handler
  const handleCancel = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    if (!error) {
      setRegistrations((prev) => {
        const copy = { ...prev };
        delete copy[eventId];
        return copy;
      });
      toast({ title: "Registration cancelled." });
    }
  };

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("events").select("*");
      if (error) {
        setError("Failed to fetch events.");
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  // Add status to each event (removed daysToGo)
  const eventsWithStatus = events.map((event) => {
    const status = getEventStatus(event.date, event.time, event.end_time);
    return { ...event, status };
  });


  // Removed eventTypes

  const filteredEvents = eventsWithStatus.filter((event) => {
    const statusMatch = filter === "all" ? true : event.status === filter;
    return statusMatch;
  });

  // Separate and order events: upcoming/today/tomorrow first, completed last
  const statusOrder = (status: string) => {
    if (status === "ongoing") return 0;
    if (status === "today") return 1;
    if (status === "tomorrow") return 2;
    if (status === "upcoming") return 3;
    if (status === "completed") return 4;
    return 5;
  };
  let orderedEvents = filteredEvents.slice();
  if (filter === "all") {
    orderedEvents = filteredEvents.slice().sort((a, b) => {
      if (statusOrder(a.status) !== statusOrder(b.status)) {
        return statusOrder(a.status) - statusOrder(b.status);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }


  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Discover Events
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse through exciting college events and register for your favorites
            </p>
          </div>


          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 items-center">
            {/* Status filter */}
            <Tabs value={filter} onValueChange={setFilter} className="w-full max-w-2xl">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Type filter removed */}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Loading events...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    name={event.title}
                    venue={event.location || ""}
                    formattedDate={formatDate(event.date)}
                    time={formatTimeRange(event.time, event.end_time)}
                    collegeName={event.university_name || ""}
                    image={event.image || ""}
                    status={event.status}
                    description={event.description}
                    onRegister={(student) => { void handleRegister(event.id, student); }}
                    onCancel={() => handleCancel(event.id)}
                    isRegistered={Boolean(registrations[event.id])}
                    isFirstTime={Object.keys(registrations).length === 0}
                    ticketQr={registrations[event.id]?.ticket_qr}
                    ticketId={registrations[event.id]?.ticket_id}
                    attended={!!registrations[event.id]?.attended}
                  />
                ))}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No events found for this filter.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
