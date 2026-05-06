import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isValidAmityEmail, isValidName, isValidMobileNumber } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1: Email verification via OTP
  const [step, setStep] = useState<"email" | "profile">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Step 2: Profile information
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    rollNumber: "",
    course: "",
    year: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setErrors({});

    if (!normalizedEmail) {
      setErrors({ email: "College email is required" });
      return;
    }

    if (!isValidAmityEmail(normalizedEmail)) {
      setErrors({ email: "Please use a valid Amity college email (example@s.amity.edu)" });
      return;
    }

    setIsOtpLoading(true);

    try {
      // Send OTP for signup - user creation happens after verification
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
      });

      if (error) {
        setErrors({ email: error.message || "Failed to send OTP" });
        return;
      }

      setIsOtpSent(true);
      setOtp("");
      toast({ title: "OTP Sent", description: "Check your email for the verification code" });
    } catch (err: any) {
      setErrors({ email: err?.message || "Failed to send OTP" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.replace(/\D/g, "");

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrors({ otp: "OTP must be 6 digits" });
      return;
    }

    setIsOtpLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanOtp,
        type: "email",
      });

      if (error) {
        setErrors({ otp: error.message || "Invalid or expired OTP" });
        return;
      }

      // Email verified and user authenticated
      setStep("profile");
      setOtp("");
      toast({ title: "Email Verified!", description: "Now complete your profile" });
    } catch (err: any) {
      setErrors({ otp: err?.message || "Invalid or expired OTP" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const name = formData.name.trim();
    const mobile = formData.mobile.trim();
    const rollNumber = formData.rollNumber.trim();
    const course = isOtherCourse ? otherCourse.trim() : formData.course.trim();
    const year = String(formData.year).trim();

    if (!isValidName(name)) {
      newErrors.name = "Name must be at least 3 letters";
    }

    if (!isValidMobileNumber(mobile)) {
      newErrors.mobile = "Mobile must be exactly 10 digits";
    }

    if (!rollNumber) {
      newErrors.rollNumber = "Roll Number is required";
    }

    if (!course) {
      newErrors.course = "Course/Department is required";
    }

    if (!year) {
      newErrors.year = "Year is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsOtpLoading(true);

    try {
      // Get the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user || userError) {
        toast({ title: "Error", description: "User session lost. Please try again.", variant: "destructive" });
        return;
      }

      // Save user profile to the users table
      const { error: userInsertError } = await supabase.from("users").insert([
        {
          id: user.id,
          name,
          email: user.email,
          role: "user", // default role for new signups
        },
      ]);

      if (userInsertError) {
        // If user already exists, that's fine - continue
        if (!userInsertError.message.includes("duplicate") && !userInsertError.message.includes("Uniqueness")) {
          console.error("User insert error:", userInsertError);
          toast({ title: "Error", description: userInsertError.message, variant: "destructive" });
          return;
        }
      }

      // Save student profile to the students table
      const { error: studentInsertError } = await supabase.from("students").insert([
        {
          id: user.id,
          roll_number: rollNumber,
          mobile,
          course,
          year: Number(year),
        } as any,
      ]);

      if (studentInsertError) {
        // If student already exists, that's fine - continue
        if (!studentInsertError.message.includes("duplicate") && !studentInsertError.message.includes("Uniqueness")) {
          console.error("Student insert error:", studentInsertError);
          toast({ title: "Error", description: studentInsertError.message, variant: "destructive" });
          return;
        }
      }

      toast({ title: "Account Created!", description: `Welcome, ${name}!` });
      // Add a small delay to ensure all database writes are complete
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err: any) {
      console.error("Signup error:", err);
      toast({ title: "Error", description: err?.message || "Failed to create account", variant: "destructive" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero">
            <Calendar className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Eventro</span>
        </Link>

        {/* Signup Card */}
        <div className="bg-card rounded-2xl p-8 shadow-card">
          {step === "email" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                <p className="text-muted-foreground">
                  Verify your college email to get started
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">College Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({});
                      setIsOtpSent(false);
                    }}
                    placeholder="student@s.amity.edu"
                    className={errors.email ? "border-red-500" : ""}
                    disabled={isOtpSent}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {!isOtpSent ? (
                  <Button
                    onClick={handleSendOtp}
                    disabled={isOtpLoading || !email.trim()}
                    className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                  >
                    {isOtpLoading ? "Sending..." : "Send OTP"}
                  </Button>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setErrors({});
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className={errors.otp ? "border-red-500" : ""}
                      />
                      {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={isOtpLoading || otp.length !== 6}
                      className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                    >
                      {isOtpLoading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtp("");
                        setErrors({});
                      }}
                      className="w-full"
                      disabled={isOtpLoading}
                    >
                      Change Email
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Complete Profile</h1>
                <p className="text-muted-foreground">
                  {email}
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setErrors({});
                    }}
                    placeholder="John Doe"
                    className={errors.name ? "border-red-500" : ""}
                    required
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, mobile: v });
                      setErrors({});
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className={errors.mobile ? "border-red-500" : ""}
                    required
                  />
                  {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                </div>

                <div>
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    value={formData.rollNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, rollNumber: e.target.value });
                      setErrors({});
                    }}
                    placeholder="e.g., A001"
                    className={errors.rollNumber ? "border-red-500" : ""}
                    required
                  />
                  {errors.rollNumber && <p className="text-red-500 text-sm mt-1">{errors.rollNumber}</p>}
                </div>

                <div>
                  <Label htmlFor="course">Course / Department</Label>
                  <select
                    id="course"
                    value={isOtherCourse ? "other" : formData.course}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "other") {
                        setIsOtherCourse(true);
                        setFormData({ ...formData, course: "" });
                      } else {
                        setIsOtherCourse(false);
                        setOtherCourse("");
                        setFormData({ ...formData, course: v });
                      }
                      setErrors({});
                    }}
                    className={`w-full border rounded px-3 py-2 ${errors.course ? "border-red-500" : ""}`}
                    required
                  >
                    <option value="">Select a course</option>
                    {courseOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {isOtherCourse && (
                    <div className="mt-2">
                      <Input
                        value={otherCourse}
                        onChange={(e) => {
                          setOtherCourse(e.target.value);
                          setFormData({ ...formData, course: e.target.value });
                          setErrors({});
                        }}
                        placeholder="Type your course"
                        required
                      />
                    </div>
                  )}
                  {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>
                  <select
                    id="year"
                    value={formData.year}
                    onChange={(e) => {
                      setFormData({ ...formData, year: e.target.value });
                      setErrors({});
                    }}
                    className={`w-full border rounded px-3 py-2 ${errors.year ? "border-red-500" : ""}`}
                    required
                  >
                    <option value="">Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                  {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
