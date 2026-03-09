import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Student = {
  id?: string;
  roll_number: string;
  name: string;
  email: string;
  mobile: string;
  course: string;
  year: number | string;
};

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  eventName?: string;
  onRegistered?: (student?: any) => void; // called after student upsert succeeds (passes saved student data)
  firstTimeUser?: boolean;
};

export default function StudentRegistration({ open, setOpen, eventName, onRegistered, firstTimeUser }: Props) {
  const { toast } = useToast();

  // always show full form; automatically check for saved student for logged-in users
  const [lookupRoll, setLookupRoll] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");

  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  // single checkbox to control using & remembering saved contact
  const [useSaved, setUseSaved] = useState(false);
  const [originalYear, setOriginalYear] = useState<number | string>("");
  const [yearConfirmed, setYearConfirmed] = useState(false);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);
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
  const [isOtherCourse, setIsOtherCourse] = useState(false);
  const [otherCourse, setOtherCourse] = useState("");

  const [form, setForm] = useState<Student>({
    roll_number: "",
    name: "",
    email: "",
    mobile: "",
    course: "",
    year: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setLookupRoll("");
      setLookupEmail("");
      setFoundStudent(null);
      setUseSaved(false);
      setForm({ roll_number: "", name: "", email: "", mobile: "", course: "", year: "" });
      setOriginalYear("");
      setYearConfirmed(false);
      setIsOtherCourse(false);
      setOtherCourse("");
      setLoading(false);
    }
  }, [open]);

  // load stored contact (roll/email) when dialog opens and try to autofill from server
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        // prefer server-stored values in authenticated user's metadata
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const meta: any = (user as any)?.user_metadata ?? {};
        let saved_roll = meta?.saved_roll;
        let saved_email = meta?.saved_email;

        // Fallback: if no server metadata, try reading localStorage (guest flow)
        if (!saved_roll && !saved_email) {
          try {
            const raw = localStorage.getItem("eventro_saved_contact");
            if (raw) {
              const parsed = JSON.parse(raw);
              saved_roll = saved_roll || parsed?.roll || "";
              saved_email = saved_email || parsed?.email || "";
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        if (saved_roll) setLookupRoll(saved_roll);
        if (saved_email) setLookupEmail(saved_email);
        if (saved_roll || saved_email) setUseSaved(true);

        // try to fetch a student record using saved identifiers
        const identifierRoll = saved_roll || lookupRoll;
        const identifierEmail = saved_email || lookupEmail;
        let res: any = null;
        if (identifierRoll) {
          res = await supabase.from("students").select("*").eq("roll_number", identifierRoll).maybeSingle();
        } else if (identifierEmail) {
          res = await supabase.from("students").select("*").eq("email", identifierEmail).maybeSingle();
        }
        if (res && res.data) {
          const s: any = res.data;
          const student: Student = {
            id: s.id,
            roll_number: s.roll_number,
            name: s.name,
            email: s.email,
            mobile: s.mobile,
            course: s.course,
            year: s.year,
          };
          setFoundStudent(student);
          setUseSaved(true);
          // determine if course is one of the options
          if (student.course && courseOptions.includes(student.course)) {
            setIsOtherCourse(false);
            setOtherCourse("");
            setForm(student);
          } else {
            setIsOtherCourse(true);
            setOtherCourse(student.course || "");
            setForm({ ...student, course: student.course || "" });
          }
          setOriginalYear(student.year ?? "");
          setYearConfirmed(false);
        }
      } catch (err: any) {
        // ignore lookup errors
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // basic validation: all fields required
    if (!form.roll_number || !form.name || !form.email || !form.mobile || !form.course || !form.year) {
      toast && toast({ title: "All fields are required" });
      return;
    }
    // require year confirmation if user used saved data or changed year
    const yearChanged = originalYear !== "" && String(form.year) !== String(originalYear);
    if ((useSaved || yearChanged) && !yearConfirmed) {
      toast && toast({ title: "Please confirm your Year of Study before registering." });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        roll_number: form.roll_number,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        course: form.course,
        year: Number(form.year),
      } as any;

      const { data, error } = await supabase
        .from("students")
        .upsert(payload, { onConflict: "roll_number" });

      if (error) {
        toast && toast({ title: "Save failed", description: error.message, variant: "destructive" });
      } else {
        toast && toast({ title: "Saved", description: "Your student details were saved." });
        // persist roll/email in user metadata when logged in, else fallback to localStorage
        try {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;
          if (user && useSaved) {
            await supabase.auth.updateUser({ data: { saved_roll: form.roll_number, saved_email: form.email } });
          } else if (user && !useSaved) {
            // clear metadata fields if present
            await supabase.auth.updateUser({ data: { saved_roll: null, saved_email: null } as any });
          } else {
            if (useSaved) {
              localStorage.setItem("eventro_saved_contact", JSON.stringify({ roll: form.roll_number, email: form.email }));
            } else {
              localStorage.removeItem("eventro_saved_contact");
            }
          }
        } catch (e) {
          // ignore persistence errors
        }
        // call parent callback to continue registration to event if needed
        const savedStudent = {
          roll_number: form.roll_number,
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          course: form.course,
          year: form.year,
        };
        onRegistered && onRegistered(savedStudent);
        setOpen(false);
      }
    } catch (err: any) {
      toast && toast({ title: "Save error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Register for Event{eventName ? `: ${eventName}` : ""}</DialogTitle>
          <DialogDescription>
            {firstTimeUser && showFirstTimeMessage
              ? "You're registering for the first time — please provide your student details."
              : foundStudent
                ? "We found a saved student record. You can use it or edit the details below before saving."
                : "Please fill in your details to register."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {foundStudent && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="useSaved"
                  type="checkbox"
                  checked={useSaved}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseSaved(checked);
                    if (checked && foundStudent) {
                      // fill the form from saved student
                      const fy = foundStudent.year ?? "";
                      // handle course options
                      if (foundStudent.course && courseOptions.includes(foundStudent.course)) {
                        setIsOtherCourse(false);
                        setOtherCourse("");
                        setForm({
                          roll_number: foundStudent.roll_number || "",
                          name: foundStudent.name || "",
                          email: foundStudent.email || "",
                          mobile: foundStudent.mobile || "",
                          course: foundStudent.course || "",
                          year: fy,
                        });
                      } else {
                        setIsOtherCourse(true);
                        setOtherCourse(foundStudent.course || "");
                        setForm({
                          roll_number: foundStudent.roll_number || "",
                          name: foundStudent.name || "",
                          email: foundStudent.email || "",
                          mobile: foundStudent.mobile || "",
                          course: foundStudent.course || "",
                          year: fy,
                        });
                      }
                      setOriginalYear(fy);
                      setYearConfirmed(false);
                    } else if (!checked) {
                      // clear fields when user unticks the "Use saved information" checkbox
                      setForm({ roll_number: "", name: "", email: "", mobile: "", course: "", year: "" });
                      setOriginalYear("");
                      setYearConfirmed(false);
                    }
                  }}
                />
                <label htmlFor="useSaved" className="text-sm">Use saved information</label>
              </div>
            </div>
          )}

          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Student Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Mobile Number</Label>
            <Input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Roll Number</Label>
            <Input
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Course / Department</Label>
            <Select
              onValueChange={(val) => {
                if (val === "other") {
                  setIsOtherCourse(true);
                  setOtherCourse("");
                  setForm({ ...form, course: "" });
                } else {
                  setIsOtherCourse(false);
                  setOtherCourse("");
                  setForm({ ...form, course: val });
                }
              }}
              defaultValue={courseOptions.includes(form.course) ? (form.course as string) : (isOtherCourse ? "other" : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.course ? String(form.course) : "Select course"} />
              </SelectTrigger>
              <SelectContent>
                {courseOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {isOtherCourse && (
              <div className="mt-2">
                <Input value={otherCourse} onChange={(e) => { setOtherCourse(e.target.value); setForm({ ...form, course: e.target.value }); }} placeholder="Type your course" required />
              </div>
            )}
          </div>

          <div>
            <Label>Year of Study</Label>
            <Input
              type="number"
              min={1}
              value={String(form.year)}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) || "" })}
              required
            />
            {(useSaved || (originalYear !== "" && String(form.year) !== String(originalYear))) && (
              <>
                <p className="text-sm text-yellow-700 mt-2">Note: You changed (or loaded) your Year of Study — please make sure this is correct before registering.</p>
                <div className="flex items-center gap-2 mt-2">
                  <input id="yearConfirm" type="checkbox" checked={yearConfirmed} onChange={(e) => setYearConfirmed(e.target.checked)} />
                  <label htmlFor="yearConfirm" className="text-sm">I confirm my Year of Study is correct</label>
                </div>
              </>
            )}
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : (foundStudent ? "Update & Register" : "Save & Register")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
