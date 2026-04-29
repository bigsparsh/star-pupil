"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { authApi, ApiError } from "@/lib/api";
import { Star, ArrowLeft } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { login } = useAuthStore();
  const { addToast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await authApi.login(email, password);
      
      // Transform backend response to frontend user format
      const user = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as "programmer" | "recruiter",
        github_username: response.user.github_username,
        bio: response.user.bio,
        // Map to legacy field for components that use it
        githubLink: response.user.github_username 
          ? `https://github.com/${response.user.github_username}` 
          : undefined,
      };
      
      login(user, response.access_token, response.refresh_token);
      addToast("Login successful!", "success");
      
      // Redirect based on role
      if (redirect) {
        router.push(redirect);
      } else if (user.role === "recruiter") {
        router.push("/recruiter/dashboard");
      } else {
        router.push("/programmer/dashboard");
      }
    } catch (error) {
      const message = error instanceof ApiError 
        ? error.message 
        : "Invalid email or password";
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-8">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <Star className="h-6 w-6 text-white" fill="white" />
              </div>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Star</span>
            </Link>
            
            <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                Sign up for free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Remember me</span>
              </label>
              
              <Link href="#" className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  Demo credentials
                </span>
              </div>
            </div>
            
            <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>Developer: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">dev@example.com</code></p>
              <p className="mt-1">Recruiter: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">recruiter@company.com</code></p>
              <p className="mt-1">Password: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">any</code></p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Decorative */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
          <div className="flex h-full items-center justify-center p-12">
            <div className="max-w-lg text-white">
              <blockquote className="text-2xl font-medium leading-relaxed">
                "Star completely changed how I find opportunities. My GitHub profile now works for me 24/7."
              </blockquote>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                  M
                </div>
                <div>
                  <p className="font-semibold">Marcus Johnson</p>
                  <p className="text-violet-200">Senior Developer at TechCorp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
