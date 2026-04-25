import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";

export type UserRole = "programmer" | "recruiter" | "admin" | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  github_username?: string | null;
  linkedin_username?: string | null;
  twitter_username?: string | null;
  stackoverflow_user_id?: string | null;
  devto_username?: string | null;
  hashnode_username?: string | null;
  website?: string | null;
  location?: string | null;
  bio?: string | null;
  // Legacy fields for compatibility
  organization?: string;
  githubLink?: string;
  skills?: string[];
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  category: string | null;
  years_experience?: number | null;
}

export interface PortfolioData {
  url: string;
  skills: string[];
  title: string | null;
  description: string | null;
  projects_mentioned: number;
  success: boolean;
}

export interface PopularRepoContribution {
  repo_name: string;
  name: string;
  owner: string;
  stars: number;
  language: string | null;
  description: string | null;
  url: string;
  contribution_count: number;
  is_owner?: boolean;  // True if user owns this repo
}

export interface Stats {
  prsMerged: number;
  repoCount: number;
  totalCommits: number;
  followers: number;
  languagesUsed: string[];
  contributions: number[];
  commitGraph: number[];
  monthlyCommits: number;
  complexityScore: number;
  popularRepoContributions: PopularRepoContribution[];
  portfolio: PortfolioData | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  skills: Skill[];
  stats: Stats | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setSkills: (skills: Skill[]) => void;
  setStats: (stats: Stats | null) => void;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      skills: [],
      stats: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setSkills: (skills) => set({ skills }),
      setStats: (stats) => set({ stats }),
      login: (user, token, refreshToken) => set({ 
        user, 
        token, 
        refreshToken: refreshToken || null,
        isAuthenticated: true 
      }),
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          skills: [],
          stats: null,
        }),
    }),
    {
      name: "star-auth",
    }
  )
);

// Hook to check if auth store has been hydrated from localStorage
export const useAuthHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    // Check if already hydrated
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    
    // If store is already hydrated (e.g., on client-side navigation)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    
    return () => {
      unsubFinishHydration();
    };
  }, []);
  
  return hydrated;
};

// Candidate type for search results
export interface Candidate {
  id: string;
  name: string;
  email?: string;
  role?: string;
  github_username: string | null;
  profile_link: string | null;
  skills: string[];
  matched_skills: string[];
  github_stats: {
    merged_prs: number;
    total_commits: number;
    repo_count: number;
    main_languages: string[];
  } | null;
  score: number;
  score_breakdown?: {
    github_score: number;
    skill_match_score: number;
    complexity_score: number;
    recency_score: number;
    oss_contribution_score: number;
    github_weight: number;
    skill_match_weight: number;
    complexity_weight: number;
    recency_weight: number;
    oss_contribution_weight: number;
  } | null;
  contribution_graph?: number[];
  rank: number;
}

export interface ExtractedSkills {
  primary_skills: string[];
  secondary_skills: string[];
}

interface SearchState {
  query: string;
  results: Candidate[];
  extractedSkills: ExtractedSkills | null;
  totalMatches: number;
  isLoading: boolean;
  savedSearches: string[];
  setQuery: (query: string) => void;
  setResults: (results: Candidate[]) => void;
  setExtractedSkills: (skills: ExtractedSkills | null) => void;
  setTotalMatches: (total: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  addSavedSearch: (search: string) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: "",
  results: [],
  extractedSkills: null,
  totalMatches: 0,
  isLoading: false,
  savedSearches: [],
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setExtractedSkills: (extractedSkills) => set({ extractedSkills }),
  setTotalMatches: (totalMatches) => set({ totalMatches }),
  setIsLoading: (isLoading) => set({ isLoading }),
  addSavedSearch: (search) =>
    set((state) => ({
      savedSearches: [...state.savedSearches, search],
    })),
  clearResults: () => set({ results: [], extractedSkills: null, totalMatches: 0 }),
}));

// Saved candidate with additional metadata
export interface SavedCandidate extends Candidate {
  savedAt: string;
  notes?: string;
}

// Search history entry
export interface SearchHistoryEntry {
  id: string;
  query: string;
  matchCount: number;
  searchedAt: string;
}

interface RecruiterState {
  savedCandidates: SavedCandidate[];
  searchHistory: SearchHistoryEntry[];
  // Stats computed from data
  totalSearches: number;
  totalCandidatesViewed: number;
  // Actions
  saveCandidate: (candidate: Candidate) => void;
  unsaveCandidate: (candidateId: string) => void;
  isCandidateSaved: (candidateId: string) => boolean;
  addSearchToHistory: (query: string, matchCount: number) => void;
  clearSearchHistory: () => void;
  incrementCandidatesViewed: () => void;
}

export const useRecruiterStore = create<RecruiterState>()(
  persist(
    (set, get) => ({
      savedCandidates: [],
      searchHistory: [],
      totalSearches: 0,
      totalCandidatesViewed: 0,
      
      saveCandidate: (candidate) =>
        set((state) => {
          // Don't add duplicates
          if (state.savedCandidates.some((c) => c.id === candidate.id)) {
            return state;
          }
          return {
            savedCandidates: [
              ...state.savedCandidates,
              { ...candidate, savedAt: new Date().toISOString() },
            ],
          };
        }),
      
      unsaveCandidate: (candidateId) =>
        set((state) => ({
          savedCandidates: state.savedCandidates.filter((c) => c.id !== candidateId),
        })),
      
      isCandidateSaved: (candidateId) => {
        return get().savedCandidates.some((c) => c.id === candidateId);
      },
      
      addSearchToHistory: (query, matchCount) =>
        set((state) => ({
          searchHistory: [
            {
              id: crypto.randomUUID(),
              query,
              matchCount,
              searchedAt: new Date().toISOString(),
            },
            ...state.searchHistory.slice(0, 19), // Keep last 20 searches
          ],
          totalSearches: state.totalSearches + 1,
        })),
      
      clearSearchHistory: () => set({ searchHistory: [] }),
      
      incrementCandidatesViewed: () =>
        set((state) => ({
          totalCandidatesViewed: state.totalCandidatesViewed + 1,
        })),
    }),
    {
      name: "star-recruiter",
    }
  )
);
