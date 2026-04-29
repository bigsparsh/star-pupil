import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { 
  Star, 
  Code2, 
  Search, 
  Zap, 
  GitPullRequest, 
  BarChart3, 
  Users,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 to-white dark:from-zinc-900 dark:to-zinc-950">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                <Star className="h-4 w-4" fill="currentColor" />
                The Future of Developer Hiring
              </div>
              
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl md:text-6xl">
                Where Great Developers
                <span className="block bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Meet Great Opportunities
                </span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
                Star uses AI to analyze GitHub contributions, skills, and coding patterns 
                to match developers with the perfect roles—no resumes required.
              </p>
              
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup?role=programmer">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Code2 className="mr-2 h-5 w-5" />
                    I'm a Developer
                  </Button>
                </Link>
                <Link href="/signup?role=recruiter">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    <Search className="mr-2 h-5 w-5" />
                    I'm Hiring
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features for Developers */}
        <section className="py-24 bg-white dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <Code2 className="h-4 w-4" />
                  For Developers
                </div>
                
                <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                  Get Discovered Based on Your Code
                </h2>
                
                <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                  Stop updating resumes. Let your GitHub activity speak for itself. 
                  We analyze your contributions to showcase your true skills.
                </p>
                
                <ul className="mt-8 space-y-4">
                  {[
                    "Automatic skill extraction from your repositories",
                    "PR and commit analytics that showcase your impact",
                    "Get matched with roles that fit your expertise",
                    "No more repetitive applications—companies find you",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-500" />
                      <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/signup?role=programmer" className="mt-8 inline-flex">
                  <Button>
                    Create Your Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="relative">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                      A
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Alex Chen</h3>
                      <p className="text-sm text-zinc-500">Full-Stack Developer</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white p-3 dark:bg-zinc-800">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">247</p>
                      <p className="text-xs text-zinc-500">PRs Merged</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 dark:bg-zinc-800">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">32</p>
                      <p className="text-xs text-zinc-500">Repositories</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 dark:bg-zinc-800">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">8</p>
                      <p className="text-xs text-zinc-500">Languages</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"].map((skill) => (
                      <span key={skill} className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features for Recruiters */}
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <Search className="h-5 w-5 text-zinc-400" />
                    <span className="text-zinc-500">Need a Golang dev for API work...</span>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    {[
                      { name: "Sarah Kim", skills: ["Go", "gRPC", "Kubernetes"], match: 98 },
                      { name: "James Liu", skills: ["Go", "REST APIs", "Docker"], match: 94 },
                      { name: "Maria Garcia", skills: ["Go", "PostgreSQL", "AWS"], match: 91 },
                    ].map((candidate, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                          {candidate.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.name}</p>
                          <div className="flex gap-1 mt-1">
                            {candidate.skills.map((skill) => (
                              <span key={skill} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {candidate.match}% match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Users className="h-4 w-4" />
                  For Recruiters
                </div>
                
                <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                  Find Talent Faster with AI
                </h2>
                
                <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                  Describe what you're looking for in natural language. Our AI matches 
                  you with developers whose skills and experience fit your needs.
                </p>
                
                <ul className="mt-8 space-y-4">
                  {[
                    "Natural language search—no complex filters needed",
                    "See real code contributions, not just keywords",
                    "Ranked results based on actual skill assessment",
                    "Direct access to candidate GitHub profiles",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-blue-500" />
                      <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/signup?role=recruiter" className="mt-8 inline-flex">
                  <Button>
                    Start Hiring
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-white dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                Trusted by Developers and Companies
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Join thousands of developers and recruiters already using Star
              </p>
            </div>
            
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, value: "10,000+", label: "Developers" },
                { icon: GitPullRequest, value: "500K+", label: "PRs Analyzed" },
                { icon: Zap, value: "5,000+", label: "Matches Made" },
                { icon: BarChart3, value: "95%", label: "Match Accuracy" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                      <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-violet-600 to-indigo-700">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-violet-100">
              Join Star today and transform how you find or get found for developer roles.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup?role=programmer">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Code2 className="mr-2 h-5 w-5" />
                  Create Developer Profile
                </Button>
              </Link>
              <Link href="/signup?role=recruiter">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10">
                  <Search className="mr-2 h-5 w-5" />
                  Start Hiring
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
