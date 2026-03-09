import React, { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const Attendees: React.FC = () => {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  // Data fetching temporarily removed — page will remain blank until backend is restored.

  const filtered = useMemo(() => {
    if (!query) return attendees;
    const q = query.toLowerCase();
    return attendees.filter((a) => {
      const _a = a as any;
      const name = (_a.name || _a.user_name || "").toString().toLowerCase();
      const email = (_a.email || "").toString().toLowerCase();
      const ev = ((_a.event && _a.event.title) || _a.event_name || "").toString().toLowerCase();
      return name.includes(q) || email.includes(q) || ev.includes(q);
    });
  }, [attendees, query]);

  const [showDialog, setShowDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const resolveYear = (r: any, u: any) => {
    const candidates = [
      r?.year,
      r?.year_of_study,
      r?.study_year,
      r?.academic_year,
      r?.student_year,
      u?.year,
      u?.year_of_study,
      u?.study_year,
      u?.academic_year,
      u?.student_year,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== "") return String(c);
    }
    return null;
  };

  useEffect(() => {
    const handler = async (e: Event) => {
      try {
        const detail: any = (e as CustomEvent).detail ?? {};
        // Only react to scanner-originated events
        if (!detail || !detail.scanned) return;
        const user_id = detail.user_id;
        const event_id = detail.event_id;
        if (!user_id || !event_id) return;

        setDialogLoading(true);
        // Fetch registration snapshot (may contain name/email/mobile)
        const { data: reg, error: regErr } = await supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user_id)
          .eq("event_id", event_id)
          .maybeSingle();

        if (regErr) {
          console.warn("Failed to fetch registration for dialog", regErr);
        }

        const { data: user, error: userErr } = await supabase.from("users").select("*").eq("id", user_id).maybeSingle();
        if (userErr) console.warn("Failed to fetch user for dialog", userErr);

        // Prefer fields from registration (snapshot) falling back to users table
        const _reg: any = reg as any;
        const _user: any = user as any;
        const details = {
          name: _reg?.name || _user?.name || _reg?.user_name || _user?.user_name || "—",
          email: _reg?.email || _user?.email || "—",
          mobile: _reg?.mobile || _user?.mobile || _user?.phone || "—",
          roll_number: _reg?.roll_number || _user?.roll_number || "—",
          course: _reg?.course || _user?.course || "—",
          year: resolveYear(_reg, _user) || "—",
          user_id,
          event_id,
          registration: reg || null,
          user: user || null,
        };

        setSelectedUser(details);
        setShowDialog(true);
      } finally {
        setDialogLoading(false);
      }
    };

    window.addEventListener("registrations:changed", handler as EventListener);
    return () => window.removeEventListener("registrations:changed", handler as EventListener);
  }, []);

  // Fetch attendees list (admin view)
  useEffect(() => {
    let mounted = true;
    const fetchAttendees = async () => {
      setLoading(true);
      try {
        // Fetch registrations that have been marked attended (scanned), with event and user details
        const { data, error } = await supabase
          .from("registrations")
          .select("*, event:events(*), user:users(*)")
          .not("user_id", "is", null)
          .not("event_id", "is", null)
          .eq("attended", true)
          .order("id", { ascending: false });

        console.log("Attendees: fetched registrations", data);
        if (error) {
          setError(error.message || "Failed to load attendees.");
          setAttendees([]);
        } else {
          // normalize shape: each row may contain snapshot fields
          const resolveYear = (r: any, u: any) => {
            const candidates = [
              r?.year,
              r?.year_of_study,
              r?.study_year,
              r?.academic_year,
              r?.student_year,
              u?.year,
              u?.year_of_study,
              u?.study_year,
              u?.academic_year,
              u?.student_year,
            ];
            for (const c of candidates) {
              if (c !== undefined && c !== null && String(c).trim() !== "") return String(c);
            }
            return null;
          };

          let mapped = (data || []).map((r: any) => ({
            id: r.id,
            name: r.name || r.user_name || (r.user && r.user.name) || null,
            email: r.email || r.user_email || (r.user && r.user.email) || null,
            mobile: r.mobile || r.phone || null,
            roll_number: r.roll_number || null,
            course: r.course || null,
            year: resolveYear(r, r.user),
            event: r.event || null,
            raw: r,
          }));

          // If year is missing for some rows, try to fetch from `students` table using roll_number or email
          const needYear = mapped.filter((m: any) => !m.year && (m.roll_number || m.email));
          if (needYear.length > 0) {
            const rollNumbers = Array.from(new Set(needYear.map((x: any) => x.roll_number).filter(Boolean)));
            const emails = Array.from(new Set(needYear.map((x: any) => x.email).filter(Boolean)));
            const studentMapByRoll: Record<string, any> = {};
            const studentMapByEmail: Record<string, any> = {};
            try {
              if (rollNumbers.length > 0) {
                const { data: studs } = await supabase.from("students").select("*").in("roll_number", rollNumbers);
                (studs || []).forEach((s: any) => { if (s.roll_number) studentMapByRoll[s.roll_number] = s; });
              }
              if (emails.length > 0) {
                const { data: studs2 } = await supabase.from("students").select("*").in("email", emails);
                (studs2 || []).forEach((s: any) => { if (s.email) studentMapByEmail[s.email] = s; });
              }
            } catch (e) {
              console.warn("Failed to fetch students for year resolution", e);
            }

            mapped = mapped.map((m: any) => {
              if (!m.year) {
                const s = (m.roll_number && studentMapByRoll[m.roll_number]) || (m.email && studentMapByEmail[m.email]);
                if (s) {
                  const y = resolveYear(s, s);
                  if (y) m.year = y;
                }
              }
              return m;
            });
          }
          // Only include rows that have an associated event object with a title
          const withEvent = mapped.filter((m: any) => m.event && (m.event.title || m.event.name));
          if (mounted) {
            setAttendees(withEvent as any[]);
            setError(null);
          }
        }
      } catch (err: any) {
        if (mounted) setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAttendees();
    // refresh when registrations change elsewhere
    const refreshHandler = () => fetchAttendees();
    window.addEventListener("registrations:changed", refreshHandler as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener("registrations:changed", refreshHandler as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Event Attendees</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Total: {attendees.length}</div>
            <button
              className="text-sm text-muted-foreground underline"
              onClick={() => setShowDebug((s) => !s)}
            >
              {showDebug ? "Hide raw" : "Show raw"}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            placeholder="Search by name, email or event"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-1/3 border border-border rounded px-3 py-2"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center">Loading attendees...</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No attendees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Student Email</th>
                  <th className="px-3 py-2">Mobile Number</th>
                  <th className="px-3 py-2">Roll Number</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Event Name</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const _a = a as any;
                  return (
                    <tr key={_a.id} className="border-t">
                      <td className="px-3 py-3 align-top">{_a.name || _a.user_name || "—"}</td>
                      <td className="px-3 py-3 align-top">{_a.email || "—"}</td>
                      <td className="px-3 py-3 align-top">{_a.mobile || _a.phone || "—"}</td>
                      <td className="px-3 py-3 align-top">{_a.roll_number || "—"}</td>
                      <td className="px-3 py-3 align-top">{_a.course || "—"}</td>
                      <td className="px-3 py-3 align-top">{_a.year || "—"}</td>
                      <td className="px-3 py-3 align-top">{(_a.event && _a.event.title) || _a.event_name || "—"}</td>
                    </tr>
                  );
                })}
                {showDebug && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="p-4">
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(filtered.map((x: any) => x.raw), null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanned Attendee Details</DialogTitle>
            <DialogDescription>
              {dialogLoading ? "Loading details…" : "Details shown are from registration snapshot or user profile."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {selectedUser ? (
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {selectedUser.name}</div>
                <div><strong>Email:</strong> {selectedUser.email}</div>
                <div><strong>Mobile:</strong> {selectedUser.mobile}</div>
                <div><strong>Roll Number:</strong> {selectedUser.roll_number}</div>
                <div><strong>Course:</strong> {selectedUser.course}</div>
                <div><strong>Year:</strong> {selectedUser.year}</div>
                <div><strong>User ID:</strong> {selectedUser.user_id}</div>
                <div><strong>Event ID:</strong> {selectedUser.event_id}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No details available.</div>
            )}
          </div>
          <DialogFooter>
            <div className="w-full text-right">
              <DialogClose className="btn btn-primary px-4 py-2">Close</DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default Attendees;
