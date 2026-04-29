const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// API Response Types matching backend schemas
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: "programmer" | "recruiter" | "admin";
  github_username: string | null;
  linkedin_username: string | null;
  twitter_username: string | null;
  stackoverflow_user_id: string | null;
  devto_username: string | null;
  hashnode_username: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface SkillResponse {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface SkillMappingResponse {
  id: string;
  skill: SkillResponse;
  proficiency_level: number;
  years_experience: number | null;
  created_at: string;
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

export interface PortfolioData {
  url: string;
  skills: string[];
  title: string | null;
  description: string | null;
  projects_mentioned: number;
  success: boolean;
}

export interface UserStatsResponse {
  merged_prs: number;
  total_commits: number;
  total_repos: number;
  followers: number;
  languages: { languages?: string[] } | null;
  repo_activity: { commit_frequency?: string } | null;
  contribution_graph: { 
    graph?: number[];
    monthly_commits?: number;
  } | null;
  popular_repo_contributions: PopularRepoContribution[] | null;
  portfolio: PortfolioData | null;
  complexity_score: number;
  monthly_commits: number;
  updated_at: string | null;
}

export interface ExtractedSkills {
  primary_skills: string[];
  secondary_skills: string[];
}

export interface GitHubStats {
  merged_prs: number;
  total_commits: number;
  repo_count: number;
  main_languages: string[];
  commit_frequency: string | null;
}

export interface ScoreBreakdown {
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
}

export interface CandidateResult {
  id: string;
  name: string;
  github_username: string | null;
  profile_link: string | null;
  skills: string[];
  matched_skills: string[];
  github_stats: GitHubStats | null;
  popular_repo_count: number;
  score: number;
  score_breakdown: ScoreBreakdown | null;
  contribution_graph: number[];
  rank: number;
}

export interface QueryResponse {
  query: string;
  extracted_skills: ExtractedSkills;
  candidates: CandidateResult[];
  total_matches: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" 
    ? JSON.parse(localStorage.getItem("star-auth") || "{}")?.state?.token 
    : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(
      error.detail || error.message || "Request failed",
      response.status,
      error.detail
    );
  }

  return response.json();
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string): Promise<TokenResponse> =>
    fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: "programmer" | "recruiter";
    github_username?: string;
    stackoverflow_user_id?: string;
    devto_username?: string;
    hashnode_username?: string;
    bio?: string;
  }): Promise<TokenResponse> =>
    fetchWithAuth("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refresh: (token: string): Promise<TokenResponse> =>
    fetchWithAuth(`/auth/refresh?token=${encodeURIComponent(token)}`),
};

// User endpoints
export const userApi = {
  getMe: (): Promise<UserResponse> => fetchWithAuth("/auth/me"),
  
  getUser: (id: string): Promise<UserResponse> => 
    fetchWithAuth(`/recruiter/user/${id}`),
};

// Programmer endpoints
export const programmerApi = {
  getMySkills: (): Promise<SkillMappingResponse[]> => 
    fetchWithAuth("/programmer/skills"),
  
  getMyStats: (): Promise<UserStatsResponse> => 
    fetchWithAuth("/programmer/stats"),
  
  updateProfile: (data: { 
    name?: string; 
    github_username?: string; 
    stackoverflow_user_id?: string;
    devto_username?: string;
    hashnode_username?: string;
    bio?: string;
  }): Promise<UserResponse> =>
    fetchWithAuth("/programmer/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addSkill: (data: {
    skill_id: string;
    proficiency_level?: number;
    years_experience?: number;
  }): Promise<SkillMappingResponse> =>
    fetchWithAuth("/programmer/skills", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeSkill: (skillId: string): Promise<void> =>
    fetchWithAuth(`/programmer/skills/${skillId}`, {
      method: "DELETE",
    }),
};

// Recruiter endpoints
export const recruiterApi = {
  searchTalent: (query: string, limit?: number): Promise<QueryResponse> =>
    fetchWithAuth("/recruiter/query", {
      method: "POST",
      body: JSON.stringify({ query, limit: limit || 10 }),
    }),

  getUserProfile: (userId: string): Promise<UserResponse> =>
    fetchWithAuth(`/recruiter/user/${userId}`),
};

// Chat types
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_own_message: boolean;
}

export interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_github: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_github: string | null;
  messages: ChatMessage[];
  created_at: string;
}

// Chat endpoints
export const chatApi = {
  getConversations: (): Promise<Conversation[]> =>
    fetchWithAuth("/chat/conversations"),

  getConversation: (conversationId: string): Promise<ConversationDetail> =>
    fetchWithAuth(`/chat/conversations/${conversationId}`),

  getOrCreateConversation: (programmerId: string): Promise<ConversationDetail> =>
    fetchWithAuth(`/chat/conversations/${programmerId}`, {
      method: "POST",
    }),

  sendMessage: (conversationId: string, content: string): Promise<ChatMessage> =>
    fetchWithAuth(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  markAsRead: (conversationId: string): Promise<void> =>
    fetchWithAuth(`/chat/conversations/${conversationId}/read`, {
      method: "POST",
    }),

  getUnreadCount: (): Promise<{ unread_count: number }> =>
    fetchWithAuth("/chat/unread-count"),
};

// Skills endpoints
export const skillsApi = {
  getAll: (): Promise<SkillResponse[]> => 
    fetchWithAuth("/skills"),
  
  getById: (id: string): Promise<SkillResponse> => 
    fetchWithAuth(`/skills/${id}`),
};

// Public endpoints (no auth required)
export interface PublicDeveloper {
  id: string;
  name: string;
  github_username: string | null;
  bio: string | null;
  skills: string[];
  merged_prs: number;
  total_commits: number;
  total_repos: number;
  followers: number;
  popular_repo_count: number;
  avatar_url: string | null;
}

export interface SkillDevelopersResponse {
  skill_name: string;
  developers: PublicDeveloper[];
  total_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  github_username: string | null;
  avatar_url: string | null;
  merged_prs: number;
  total_commits: number;
  total_repos: number;
  followers: number;
  popular_repo_count: number;
  score: number;
  top_skills: string[];
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  category: string;
  total_developers: number;
}

export interface SkillCategory {
  category: string;
  skill_count: number;
  developer_count: number;
}

const fetchPublic = async (url: string) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }
  return response.json();
};

export const publicApi = {
  getSkills: (category?: string): Promise<string[]> =>
    fetchPublic(`/public/skills${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  
  getSkillCategories: (): Promise<SkillCategory[]> =>
    fetchPublic("/public/skill-categories"),
  
  getDevelopersBySkill: (skillName: string, limit?: number, offset?: number): Promise<SkillDevelopersResponse> =>
    fetchPublic(`/public/skills/${encodeURIComponent(skillName)}/developers?limit=${limit || 20}&offset=${offset || 0}`),
  
  getLeaderboard: (category?: string, limit?: number): Promise<LeaderboardResponse> =>
    fetchPublic(`/public/leaderboard?category=${category || "overall"}&limit=${limit || 20}`),
};
