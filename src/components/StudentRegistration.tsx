import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidName, isValidMobileNumber } from "@/lib/validation";

type Student = {
  id?: string;
  roll_number: string;
  mobile: string;
  course: string;
  year: number | string;
};

type StudentWithUser = Student & {
  users?: {
    name: string;
    email: string;
  };
};

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  eventId?: string;
  eventName?: string;
  onRegistered?: (student?: any) => void;
};

export default function StudentRegistration({
  open,
  setOpen,
  eventId,
  eventName,
  onRegistered,
}: Props) {
  const { toast } = useToast();

  const courseOptions = [
    "B.Tech",
    "BBA",
    "MBA",
    "B.Sc",
    "M.Sc",
    "BA",
    "LLB",
    "MBBS",
    "BCA",
    "MCA",
  ];

  const [form, setForm] = useState<StudentWithUser>({
    roll_number: "",
    mobile: "",
    course: "",
    year: "",
  });
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isOtherCourse, setIsOtherCourse] = useState(false);
  const [otherCourse, setOtherCourse] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load authenticated user and any saved student/profile
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          toast({ title: "Not Logged In", description: "Please log in to register.", variant: "destructive" });
          setOpen(false);
          return;
        }
        const user = userData.user;
        // autofill email and name from auth
        setUserEmail(user.email ?? "");
        setUserName(user.user_metadata?.name ?? "");

        // try fetch saved student profile by user.id (include relational users data)
        if (user.id) {
          const { data: student, error: studentError } = await supabase
            .from("students")
            .select(`
              id,
              roll_number,
              mobile,
              course,
              year,
              users ( id, name, email )
            `)
            .eq("id", user.id)
            .maybeSingle();

          if (studentError && studentError.code !== "PGRST116") {
            console.error("Student fetch error:", studentError);
          }

          if (student) {
            setForm({
              id: student.id,
              roll_number: student.roll_number || "",
              mobile: student.mobile || "",
              course: student.course || "",
              year: student.year || "",
            });
            if (student.course && !courseOptions.includes(student.course)) {
              setIsOtherCourse(true);
              setOtherCourse(student.course);
            }
            // Pull identity from related users object when available
            if ((student as any).users && (student as any).users.name) setUserName((student as any).users.name);
            if ((student as any).users && (student as any).users.email) setUserEmail((student as any).users.email);
          }

          // check existing registration for this event
          if (eventId && user.id) {
            const { data: existing } = await supabase
              .from("registrations")
              .select("*")
              .eq("user_id", user.id)
              .eq("event_id", eventId)
              .maybeSingle();
            if (existing) {
              toast({ title: "Already Registered", description: "You are already registered for this event.", variant: "default" });
              setOpen(false);
              return;
            }
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, eventId, setOpen, toast]);

  useEffect(() => {
    if (!open) {
      setForm({ roll_number: "", mobile: "", course: "", year: "" });
      setUserEmail("");
      setUserName("");
      setIsOtherCourse(false);
      setOtherCourse("");
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.roll_number.trim()) newErrors.roll_number = "Roll Number is required";
    if (!isValidMobileNumber(form.mobile)) newErrors.mobile = "Mobile must be exactly 10 digits";
    if (!form.course.trim() && !isOtherCourse) newErrors.course = "Course/Department is required";
    if (isOtherCourse && !otherCourse.trim()) newErrors.course = "Course/Department is required";
    if (!form.year) newErrors.year = "Year is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fix the errors above.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Error", description: "User session lost. Please log in again.", variant: "destructive" });
        return;
      }
      const user = userData.user;

      const finalCourse = isOtherCourse ? otherCourse : form.course;

      // Prepare payloads: students table holds only academic fields, identity in users
      const upsertStudentPayload = {
        id: user.id,
        roll_number: form.roll_number,
        mobile: form.mobile,
        course: finalCourse,
        year: Number(form.year),
      };

      const usersPayload = {
        name: userName,
        email: userEmail,
      };

      // Upsert student academic data (id is PK / FK to users.id)
      const { error: upsertError } = await supabase.from("students").upsert([upsertStudentPayload as any]);
      if (upsertError) {
        toast({ title: "Error", description: upsertError.message, variant: "destructive" });
        return;
      }

      // Ensure users table identity is up-to-date
      const { error: usersError } = await supabase.from("users").upsert([
        {
          id: user.id,
          ...usersPayload,
        },
      ]);
      if (usersError) {
        toast({ title: "Error", description: usersError.message, variant: "destructive" });
        return;
      }

      // Register for event using authenticated user id with snapshot fields
      if (eventId) {
        const { data: existing } = await supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_id", eventId)
          .maybeSingle();
        if (existing) {
          toast({ title: "Already Registered", description: "You are already registered for this event." });
        } else {
          // Create registration (only use valid registration columns)
          const registrationPayload = {
            user_id: user.id,
            event_id: eventId,
          };
          const { data: insertedReg, error: regError } = await supabase
            .from("registrations")
            .insert([registrationPayload])
            .select("id, user_id, event_id, registered_at, attended")
            .maybeSingle();
          if (regError) {
            // Let DB unique constraint handle duplicates; show error otherwise
            if (!regError.message.includes("duplicate")) {
              toast({ title: "Error", description: regError.message, variant: "destructive" });
              return;
            }
          }
        }
      }

      toast({ title: "Success!", description: `${userName}, you've been registered successfully.` });
      onRegistered && onRegistered({ ...upsertStudentPayload, users: { name: userName, email: userEmail } });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Registration failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register for Event{eventName ? `: ${eventName}` : ""}</DialogTitle>
          <DialogDescription>Complete your registration details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-muted-foreground">LOGGED IN AS</p>
            <p className="text-sm font-semibold">{userEmail}</p>
          </div>

          <div>
            <Label>College Email (read-only)</Label>
            <Input value={userEmail} disabled className="bg-muted" />
          </div>

          <div>
            <Label>Full Name (read-only)</Label>
            <Input value={userName} disabled className="bg-muted" />
          </div>

          <div>
            <Label>Roll Number</Label>
            <Input value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} placeholder="e.g., A001" required className={errors.roll_number ? "border-red-500" : ""} />
            {errors.roll_number && <p className="text-red-500 text-sm mt-1">{errors.roll_number}</p>}
          </div>

          <div>
            <Label>Mobile Number</Label>
            <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^0-9]/g, "") })} placeholder="9876543210" required maxLength={10} className={errors.mobile ? "border-red-500" : ""} />
            {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
          </div>

          <div>
            <Label>Course / Department</Label>
            <select value={isOtherCourse ? "other" : form.course} onChange={(e) => { const v = e.target.value; if (v === "other") { setIsOtherCourse(true); setForm({ ...form, course: "" }); } else { setIsOtherCourse(false); setOtherCourse(""); setForm({ ...form, course: v }); } }} className={`w-full border rounded px-3 py-2 ${errors.course ? "border-red-500" : ""}`}>
              <option value="">Select a course</option>
              {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="other">Other</option>
            </select>
            {isOtherCourse && <div className="mt-2"><Input value={otherCourse} onChange={(e) => { setOtherCourse(e.target.value); setForm({ ...form, course: e.target.value }); }} placeholder="Type your course" required /></div>}
            {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
          </div>

          <div>
            <Label>Year</Label>
            <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={`w-full border rounded px-3 py-2 ${errors.year ? "border-red-500" : ""}`} required>
              <option value="">Select year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
              <option value="5">5th Year</option>
            </select>
            {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-gradient-hero hover:opacity-90 transition-opacity" disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
