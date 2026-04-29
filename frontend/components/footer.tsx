import Link from "next/link";
import { Star } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <Star className="h-5 w-5 text-white" fill="white" />
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Star
              </span>
            </Link>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Connecting exceptional developers with innovative companies.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              For Developers
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/signup?role=programmer" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Success Stories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              For Recruiters
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/signup?role=recruiter" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Start Hiring
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Enterprise
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            © {new Date().getFullYear()} Star. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
