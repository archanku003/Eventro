import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import type { Database } from "@/integrations/supabase/types";
import EventCard from "@/components/EventCard";
import { getEventStatus } from "./Events";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end: string) {
  const to12Hour = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };
  return `${to12Hour(start)} - ${to12Hour(end)}`;
}

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


// ✅ Supabase types (extended locally for missing fields)
type EventRowBase = Database["public"]["Tables"]["events"]["Row"];
type EventInsertBase = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdateBase = Database["public"]["Tables"]["events"]["Update"];
type EventRow = EventRowBase & { end_time?: string; image?: string | null };
type EventInsert = EventInsertBase & { end_time?: string; image?: string | null };
type EventUpdate = EventUpdateBase & { end_time?: string; image?: string | null };

const AdminDashboard = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<EventInsert>({
    title: "",
    description: "",
    date: "",
    time: "",
    end_time: "",
    location: "",
    university_name: "",
    image: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from("events").select("*");
      if (error) setError(error.message);
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleDelete = async (eventId: string) => {
    setLoading(true);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setEvents(events.filter((e) => e.id !== eventId));
    setDeleteId(null);
    setLoading(false);
  };

  const handleAddEvent = async () => {
    setLoading(true);
    const { error } = await supabase.from("events").insert([newEvent as any]);
    if (error) setError(error.message);
    else {
      setAddOpen(false);
      setNewEvent({
        title: "",
        description: "",
        date: "",
        time: "",
        end_time: "",
        location: "",
        university_name: "",
        image: null,
      });
      const { data } = await supabase.from("events").select("*");
      setEvents(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Admin Event Management</h1>
        <div className="mb-6 flex gap-3">
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-hero">
            Add Event
          </Button>
          <Button onClick={() => navigate("/admin-scanner")} className="bg-sky-600 text-white">
            Scan QR
          </Button>
          <Button onClick={() => navigate("/attendees")} className="bg-emerald-600 text-white">
            Attendees
          </Button>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>Fill in the event details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Title</Label>
              <Input
                value={newEvent.title || ""}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
              <Label>Description</Label>
              <Input
                value={newEvent.description || ""}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
              <Label>Date</Label>
              <Input
                type="date"
                value={newEvent.date || ""}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newEvent.time || ""}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                required
              />
              <Label>End Time</Label>
              <Input
                type="time"
                value={newEvent.end_time || ""}
                onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
              />
              <Label>Location</Label>
              <Input
                value={newEvent.location || ""}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              <Label>University Name</Label>
              <Input
                value={newEvent.university_name || ""}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, university_name: e.target.value })
                }
              />
              <Label>Image URL</Label>
              <Input
                value={newEvent.image || ""}
                onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddEvent} className="bg-gradient-hero">
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* Status filter tabs */}
            <div className="mb-8 flex flex-col gap-4 items-center">
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
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const statusOrder = (status: string) => {
                  if (status === "ongoing") return 0;
                  if (status === "today") return 1;
                  if (status === "tomorrow") return 2;
                  if (status === "upcoming") return 3;
                  if (status === "completed") return 4;
                  return 5;
                };
                const filteredEvents = events
                  .map((event) => ({ ...event, status: getEventStatus(event.date, event.time, event.end_time) }))
                  .filter((event) => filter === "all" ? true : event.status === filter)
                  .sort((a, b) => {
                    if (statusOrder(a.status) !== statusOrder(b.status)) {
                      return statusOrder(a.status) - statusOrder(b.status);
                    }
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                  });
                if (filteredEvents.length === 0) {
                  return (
                    <div className="w-full flex items-center justify-center py-12 col-span-full">
                      <p className="text-muted-foreground text-lg text-center">No events found for this filter.</p>
                    </div>
                  );
                }
                return filteredEvents.map((event) => (
                  <div key={event.id} className="mb-4">
                    <EventCard
                      id={event.id}
                      name={event.title}
                      collegeName={event.university_name}
                      venue={event.location}
                      formattedDate={formatDate(event.date)}
                      time={formatTimeRange(event.time, event.end_time || "")}
                      image={event.image || ""}
                      status={event.status}
                      description={event.description}
                      end_time={event.end_time || ""}
                      isAdmin={true}
                      onDelete={() => handleDelete(event.id)}
                      onUpdate={async (editEvent, closeDialog) => {
                        setLoading(true);
                        setError(null);
                        // Map fields correctly
                        const updatePayload = {
                          title: editEvent.title,
                          description: editEvent.description,
                          date: editEvent.date,
                          time: editEvent.time,
                          end_time: editEvent.end_time,
                          location: editEvent.venue,
                          university_name: editEvent.collegeName,
                          image: editEvent.image,
                        };
                        const { error } = await supabase
                          .from("events")
                          .update(updatePayload)
                          .eq("id", editEvent.id);
                        if (error) {
                          setError(error.message);
                          // Optionally show a toast here if you use one
                        } else {
                          // Refresh events list
                          const { data } = await supabase.from("events").select("*");
                          setEvents(data || []);
                          closeDialog();
                        }
                        setLoading(false);
                      }}
                    />
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
