import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "student", // default role
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Authenticate user with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });
        if (error) {
            toast({ title: "Login Failed", description: error.message, variant: "destructive" });
            return;
        }

        const user = data?.user ?? null;
        if (!user) {
            // Unexpected - ensure no session remains
            await supabase.auth.signOut();
            toast({ title: "Login Failed", description: "Unable to determine authenticated user.", variant: "destructive" });
            return;
        }

        const userId = user.id;

        // Fetch user profile from custom users table using id
        const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("id, name, email, role")
            .eq("id", userId)
            .maybeSingle();

        if (profileError || !profileData) {
            // No profile or error — revoke session and fail
            await supabase.auth.signOut();
            toast({ title: "Login Failed", description: "User profile not found.", variant: "destructive" });
            return;
        }

        const actualRole = String(profileData.role ?? "student").trim().toLowerCase();
        const requestedRole = String(formData.role ?? "student").trim().toLowerCase();

        if (actualRole !== requestedRole) {
            // Prevent access when role doesn't match selected role
            await supabase.auth.signOut();
            toast({
                title: "Access Denied",
                description: `Role mismatch: your account role is '${actualRole}' but you tried to log in as '${requestedRole}'.`,
                variant: "destructive",
            });
            return;
        }

        // Role matches — proceed
        const userProfile = profileData as { id: string; name: string; email: string; created_at?: string | null; role?: string | null };
        toast({ title: "Login Successful!", description: `Welcome back, ${userProfile.name}` });
        navigate(requestedRole === "admin" ? "/admin-dashboard" : "/dashboard");
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <Label htmlFor="role">Login as</Label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full border rounded px-2 py-1"
                                required
                            >
                                <option value="student">Student</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <Link
                                to="/forgot-password"
                                className="text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                        >
                            Sign In
                        </Button>
                    </form>

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
