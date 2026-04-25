"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { authApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Star, ArrowLeft, Code2, Building2, Check } from "lucide-react";

type Role = "programmer" | "recruiter";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") as Role | null;
  const { login } = useAuthStore();
  const { addToast } = useToast();
  
  const [step, setStep] = useState<"role" | "details">(initialRole ? "details" : "role");
  const [role, setRole] = useState<Role | null>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [skills, setSkills] = useState("");
  const [stackoverflowId, setStackoverflowId] = useState("");
  const [devtoUsername, setDevtoUsername] = useState("");
  const [hashnodeUsername, setHashnodeUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
      setStep("details");
    }
  }, [initialRole]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    if (role === "recruiter" && !organization.trim()) {
      newErrors.organization = "Organization is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Extract GitHub username from URL if provided
      let github_username: string | undefined;
      if (githubLink) {
        const match = githubLink.match(/github\.com\/([^\/\?]+)/);
        github_username = match ? match[1] : githubLink;
      }

      const response = await authApi.signup({
        name,
        email,
        password,
        role: role!,
        github_username: role === "programmer" ? github_username : undefined,
        stackoverflow_user_id: role === "programmer" && stackoverflowId ? stackoverflowId : undefined,
        devto_username: role === "programmer" && devtoUsername ? devtoUsername : undefined,
        hashnode_username: role === "programmer" && hashnodeUsername ? hashnodeUsername : undefined,
        website: role === "programmer" && portfolioUrl ? portfolioUrl : undefined,
        bio: undefined,
      });
      
      // Transform backend response to frontend user format
      const user = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as "programmer" | "recruiter",
        github_username: response.user.github_username,
        stackoverflow_user_id: response.user.stackoverflow_user_id,
        devto_username: response.user.devto_username,
        hashnode_username: response.user.hashnode_username,
        bio: response.user.bio,
        githubLink: response.user.github_username 
          ? `https://github.com/${response.user.github_username}` 
          : undefined,
        organization: role === "recruiter" ? organization : undefined,
        skills: role === "programmer" 
          ? skills.split(",").map((s) => s.trim()).filter(Boolean) 
          : undefined,
      };
      
      login(user, response.access_token, response.refresh_token);
      addToast("Account created successfully!", "success");
      
      if (role === "recruiter") {
        router.push("/recruiter/dashboard");
      } else {
        router.push("/programmer/dashboard");
      }
    } catch (error) {
      const message = error instanceof ApiError 
        ? error.message 
        : "Failed to create account";
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
              {step === "role" ? "Join Star" : `Create your ${role} account`}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                Sign in
              </Link>
            </p>
          </div>

          {step === "role" ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                How would you like to use Star?
              </p>
              
              <button
                onClick={() => handleRoleSelect("programmer")}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  "hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20",
                  "border-zinc-200 dark:border-zinc-800"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Code2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">I'm a Developer</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Get discovered by recruiters based on your GitHub activity and skills
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelect("recruiter")}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  "hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20",
                  "border-zinc-200 dark:border-zinc-800"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">I'm a Recruiter</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Find talented developers using AI-powered search
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {role && step === "details" && (
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="mb-4 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change role
                </button>
              )}
              
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="John Doe"
              />
              
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
              />
              
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
              />
              
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />
              
              {role === "recruiter" && (
                <Input
                  label="Organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  error={errors.organization}
                  placeholder="Your company name"
                />
              )}
              
              {role === "programmer" && (
                <>
                  <Input
                    label="GitHub profile URL"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    placeholder="https://github.com/username"
                  />
                  
                  <Input
                    label="Stack Overflow User ID (optional)"
                    value={stackoverflowId}
                    onChange={(e) => setStackoverflowId(e.target.value)}
                    placeholder="e.g., 12345678"
                  />
                  
                  <Input
                    label="Dev.to Username (optional)"
                    value={devtoUsername}
                    onChange={(e) => setDevtoUsername(e.target.value)}
                    placeholder="e.g., johndoe"
                  />
                  
                  <Input
                    label="Hashnode Username (optional)"
                    value={hashnodeUsername}
                    onChange={(e) => setHashnodeUsername(e.target.value)}
                    placeholder="e.g., johndoe"
                  />
                  
                  <Input
                    label="Portfolio Website (optional)"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                  
                  <Input
                    label="Skills (optional, comma-separated)"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="TypeScript, React, Node.js"
                  />
                </>
              )}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create account
              </Button>
              
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                By signing up, you agree to our{" "}
                <Link href="#" className="text-violet-600 hover:underline dark:text-violet-400">Terms of Service</Link>
                {" "}and{" "}
                <Link href="#" className="text-violet-600 hover:underline dark:text-violet-400">Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </div>
      
      {/* Right side - Decorative */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
          <div className="flex h-full flex-col items-center justify-center p-12">
            <div className="max-w-lg text-white">
              <h3 className="text-3xl font-bold">
                {role === "programmer" 
                  ? "Let your code speak for itself"
                  : role === "recruiter"
                  ? "Find the perfect developers"
                  : "Join thousands of developers and recruiters"}
              </h3>
              
              <ul className="mt-8 space-y-4">
                {(role === "programmer" ? [
                  "Automatic skill extraction from your repos",
                  "Showcase your PR and commit history",
                  "Get matched with relevant opportunities",
                  "No more repetitive job applications",
                ] : role === "recruiter" ? [
                  "AI-powered natural language search",
                  "See real code contributions",
                  "Verified skills from GitHub activity",
                  "Save time finding the right candidates",
                ] : [
                  "10,000+ developers on the platform",
                  "AI-powered skill matching",
                  "Real GitHub contribution analysis",
                  "Free to get started",
                ]).map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      <Check className="h-4 w-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
