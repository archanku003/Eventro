import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidAmityEmail } from "@/lib/validation";

const Login = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSendOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        setErrors({});
        setIsOtpSent(false);

        if (!normalizedEmail) {
            setErrors({ email: "College email is required" });
            return;
        }

        if (!isValidAmityEmail(normalizedEmail)) {
            setErrors({ email: "Please use a valid Amity college email" });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { shouldCreateUser: false },
            });

            if (error) {
                if (error.message?.toLowerCase().includes("signups not allowed")) {
                    setErrors({ email: "Email not found. Please sign up first." });
                    return;
                }

                setErrors({ email: error.message || "Failed to send OTP" });
                return;
            }

            setIsOtpSent(true);
            toast({ title: "OTP Sent", description: "Check your email" });

        } catch (err: any) {
            if (!err?.message?.toLowerCase().includes("signups not allowed")) {
                console.error("OTP send error:", err);
            }

            setErrors({ email: err?.message || "Failed to send OTP" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        const cleanOtp = otp.replace(/\D/g, "");

        if (!cleanOtp || cleanOtp.length !== 6) {
            setErrors({ otp: "OTP must be 6 digits" });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const { error, data } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token: cleanOtp,
                type: "email",
            });

            if (error) {
                setErrors({ otp: error.message || "Invalid or expired OTP" });
                return;
            }

            // Successfully verified OTP - user is authenticated in auth.users
            const user = data?.user;
            if (!user) {
                setErrors({ otp: "Login failed. Please try again." });
                setIsOtpSent(false);
                return;
            }

            // Brief delay to allow session sync with the server
            await new Promise((resolve) => setTimeout(resolve, 300));

            // CRITICAL: ensure this identity exists in public.users (app users)
            const { data: profileData, error: profileError } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError && profileError.code !== "PGRST116") {
                // Database error (not "no rows" error)
                console.error("Profile lookup error:", profileError);
                setErrors({ otp: "Database error. Please try again." });
                await supabase.auth.signOut();
                setIsOtpSent(false);
                return;
            }

            if (!profileData) {
                // Block login: user exists in auth.users but not in public.users
                await supabase.auth.signOut();
                setErrors({ otp: "Account not found. Please sign up first." });
                setIsOtpSent(false);
                return;
            }

            // User exists in public.users — successful login
            toast({ title: "Login Successful!", description: `Welcome back, ${profileData.name}` });
            navigate("/dashboard");
        } catch (err: any) {
            console.error("OTP verification error:", err);
            setErrors({ otp: err?.message || "Invalid or expired OTP" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero">
                        <Calendar className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <span className="text-2xl font-bold">Eventro</span>
                </Link>

                {/* Login Card */}
                <div className="bg-card rounded-2xl p-8 shadow-card">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                        <p className="text-muted-foreground">
                            Sign in to access your account
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
                                disabled={isLoading || !email.trim()}
                                className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                            >
                                {isLoading ? "Sending..." : "Send OTP"}
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
                                    disabled={isLoading || otp.length !== 6}
                                    className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                                >
                                    {isLoading ? "Verifying..." : "Sign In"}
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
                                    disabled={isLoading}
                                >
                                    Change Email
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">
                            Don't have an account?{" "}
                        </span>
                        <Link to="/signup" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
