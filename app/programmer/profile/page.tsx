"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { programmerApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ProfileCard } from "@/components/profile-card";
import { SkillTag } from "@/components/skill-tag";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import Link from "next/link";

export default function ProgrammerProfile() {
  const { user, setUser } = useAuthStore();
  const { addToast } = useToast();
  
  const [name, setName] = useState(user?.name || "");
  const [githubUsername, setGithubUsername] = useState(
    user?.github_username || 
    (user?.githubLink?.match(/github\.com\/([^\/\?]+)/)?.[1]) || 
    ""
  );
  const [bio, setBio] = useState(user?.bio || "");
  const [stackoverflowId, setStackoverflowId] = useState(user?.stackoverflow_user_id || "");
  const [devtoUsername, setDevtoUsername] = useState(user?.devto_username || "");
  const [hashnodeUsername, setHashnodeUsername] = useState(user?.hashnode_username || "");
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await programmerApi.updateProfile({
        name: name || undefined,
        github_username: githubUsername || undefined,
        stackoverflow_user_id: stackoverflowId || undefined,
        devto_username: devtoUsername || undefined,
        hashnode_username: hashnodeUsername || undefined,
        bio: bio || undefined,
      });
      
      // Update local state with response from backend
      if (user) {
        setUser({
          ...user,
          name: response.name,
          github_username: response.github_username,
          stackoverflow_user_id: response.stackoverflow_user_id,
          devto_username: response.devto_username,
          hashnode_username: response.hashnode_username,
          bio: response.bio,
          githubLink: response.github_username 
            ? `https://github.com/${response.github_username}` 
            : undefined,
          skills,
        });
      }
      
      addToast("Profile updated successfully!", "success");
    } catch (error) {
      const message = error instanceof ApiError 
        ? error.message 
        : "Failed to update profile";
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/programmer/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Edit Profile
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Update your profile information and skills
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Preview
            </h3>
            <ProfileCard
              user={{
                ...user,
                name: name || user.name,
                github_username: githubUsername || user.github_username,
                githubLink: githubUsername 
                  ? `https://github.com/${githubUsername}` 
                  : user.githubLink,
                skills: skills.length > 0 ? skills : user.skills,
              }}
              size="md"
            />
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Basic Information
              </h3>
              
              <div className="mt-6 space-y-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
                
                <Input
                  label="Email"
                  value={user.email}
                  disabled
                  className="bg-zinc-50 dark:bg-zinc-800"
                />
                
                <Input
                  label="GitHub Username"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="username"
                />

                <Input
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Platform Connections
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Connect your developer accounts to enrich your profile with verified skills
              </p>
              
              <div className="mt-6 space-y-4">
                <Input
                  label="Stack Overflow User ID"
                  value={stackoverflowId}
                  onChange={(e) => setStackoverflowId(e.target.value)}
                  placeholder="e.g., 12345678 (from your profile URL)"
                />
                
                <Input
                  label="Dev.to Username"
                  value={devtoUsername}
                  onChange={(e) => setDevtoUsername(e.target.value)}
                  placeholder="e.g., johndoe"
                />
                
                <Input
                  label="Hashnode Username"
                  value={hashnodeUsername}
                  onChange={(e) => setHashnodeUsername(e.target.value)}
                  placeholder="e.g., johndoe"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Skills
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add skills to highlight your expertise. These are in addition to auto-extracted skills.
              </p>
              
              <div className="mt-6">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-1 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/programmer/dashboard">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
