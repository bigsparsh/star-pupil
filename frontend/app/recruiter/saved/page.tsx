"use client";

import { useState } from "react";
import { SavedCandidate, useRecruiterStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TalentCard } from "@/components/talent-card";
import { Modal } from "@/components/ui/modal";
import { ProfileCard } from "@/components/profile-card";
import { SkillTag } from "@/components/skill-tag";
import { ContributionGraph } from "@/components/contribution-graph";
import { ChatPanel } from "@/components/chat-panel";
import { formatDistanceToNow } from "date-fns";
import { 
  Bookmark, 
  Trash2, 
  GitPullRequest, 
  FolderGit2, 
  ExternalLink,
  MessageCircle
} from "lucide-react";

export default function SavedTalent() {
  const { savedCandidates, unsaveCandidate } = useRecruiterStore();
  const [selectedCandidate, setSelectedCandidate] = useState<SavedCandidate | null>(null);
  const [chatCandidate, setChatCandidate] = useState<SavedCandidate | null>(null);

  const handleRemove = (id: string) => {
    unsaveCandidate(id);
  };

  const handleOpenChat = (candidate: SavedCandidate) => {
    setSelectedCandidate(null);
    setChatCandidate(candidate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Saved Talent
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Candidates you've bookmarked for later
        </p>
      </div>

      {/* Candidate List */}
      {savedCandidates.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{savedCandidates.length}</span> saved candidates
          </p>
          
          {savedCandidates.map((candidate) => (
            <div key={candidate.id} className="group relative">
              <TalentCard
                user={{
                  id: candidate.id,
                  name: candidate.name,
                  email: candidate.email || "",
                  role: "programmer",
                  skills: candidate.skills,
                  githubLink: candidate.profile_link || undefined,
                  github_username: candidate.github_username,
                }}
                matchedSkills={candidate.matched_skills}
                stats={candidate.github_stats ? {
                  prsMerged: candidate.github_stats.merged_prs,
                  repoCount: candidate.github_stats.repo_count,
                } : undefined}
                onClick={() => setSelectedCandidate(candidate)}
              />
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Saved {formatDistanceToNow(new Date(candidate.savedAt), { addSuffix: true })}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChat(candidate);
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-violet-50 hover:text-violet-500 group-hover:opacity-100 dark:hover:bg-violet-900/20"
                  title="Send message"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(candidate.id);
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center dark:bg-zinc-800">
            <Bookmark className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No saved candidates
          </h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Save candidates from search results to review them later
          </p>
        </div>
      )}

      {/* Candidate Detail Modal */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Profile"
        className="max-w-2xl"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <ProfileCard 
              user={{
                id: selectedCandidate.id,
                name: selectedCandidate.name,
                email: selectedCandidate.email || "",
                role: "programmer",
                skills: selectedCandidate.skills,
                githubLink: selectedCandidate.profile_link || undefined,
                github_username: selectedCandidate.github_username,
              }} 
              size="md" 
              showEmail={!!selectedCandidate.email}
            />
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <GitPullRequest className="h-4 w-4" />
                  <span className="text-sm">PRs Merged</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedCandidate.github_stats?.merged_prs || 0}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <FolderGit2 className="h-4 w-4" />
                  <span className="text-sm">Repositories</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedCandidate.github_stats?.repo_count || 0}
                </p>
              </div>
            </div>

            {/* Match Score */}
            {selectedCandidate.score > 0 && (
              <div className="rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:from-violet-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Match Score
                  </span>
                  <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {Math.round(selectedCandidate.score)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Skills */}
            <div>
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Skills</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCandidate.skills?.map((skill) => (
                  <SkillTag 
                    key={skill} 
                    name={skill} 
                    highlighted={selectedCandidate.matched_skills?.includes(skill)}
                  />
                ))}
              </div>
            </div>

            {/* Languages from GitHub */}
            {selectedCandidate.github_stats?.main_languages && selectedCandidate.github_stats.main_languages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Top Languages</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCandidate.github_stats.main_languages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Contribution Graph */}
            <ContributionGraph 
              data={[]} 
            />
            
            {/* Actions */}
            <div className="flex gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  handleRemove(selectedCandidate.id);
                  setSelectedCandidate(null);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChat(selectedCandidate)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
              {selectedCandidate.profile_link && (
                <a
                  href={selectedCandidate.profile_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View GitHub
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Chat Panel */}
      {chatCandidate && (
        <ChatPanel
          programmerId={chatCandidate.id}
          programmerName={chatCandidate.name}
          programmerGithub={chatCandidate.github_username}
          onClose={() => setChatCandidate(null)}
        />
      )}
    </div>
  );
}
