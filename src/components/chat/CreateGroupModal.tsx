"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { IoArrowBack, IoClose } from "react-icons/io5";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [step, setStep] = useState<"type" | "details" | "members">("type");
  const [type, setType] = useState<"group" | "channel">("group");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function searchUsers(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${query}%`)
      .limit(20);
    
    setSearchResults(data || []);
    setSearching(false);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  function toggleMember(userId: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function createGroup() {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setCreating(true);
    const toastId = toast.loading(`Creating ${type}...`);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      let avatarUrl = null;
      
      // Upload avatar if selected
      if (avatar) {
        const formData = new FormData();
        formData.append("file", avatar);
        formData.append("type", "avatar");
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        const { url } = await res.json();
        if (url) avatarUrl = url;
      }

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl,
          type,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      });

      // Add selected members
      if (selectedMembers.size > 0) {
        const memberInserts = Array.from(selectedMembers).map(userId => ({
          group_id: group.id,
          user_id: userId,
          role: "member" as const,
        }));

        await supabase.from("group_members").insert(memberInserts);
      }

      toast.success(`${type === "group" ? "Group" : "Channel"} created!`, { id: toastId });
      onCreated(group.id);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group", { id: toastId });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <button 
          onClick={step === "type" ? onClose : () => setStep(step === "members" ? "details" : "type")}
          className="p-2 rounded-full hover:bg-zinc-800 transition text-white"
        >
          <IoArrowBack size={20} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">
          {step === "type" && "Create New"}
          {step === "details" && `New ${type === "group" ? "Group" : "Channel"}`}
          {step === "members" && "Add Members"}
        </h1>
        {step === "details" && (
          <button
            onClick={() => setStep("members")}
            disabled={!name.trim()}
            className="text-purple-400 font-semibold text-sm px-2 disabled:opacity-40"
          >
            Next
          </button>
        )}
        {step === "members" && (
          <button
            onClick={createGroup}
            disabled={creating}
            className="text-purple-400 font-semibold text-sm px-2 disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        )}
      </div>

      {/* Step 1: Choose Type */}
      {step === "type" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-bold mb-2">What would you like to create?</h2>
            <p className="text-zinc-400 text-sm">Choose between a group or channel</p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={() => {
                setType("group");
                setStep("details");
              }}
              className="w-full p-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition text-left border border-zinc-800 hover:border-purple-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Group</h3>
                  <p className="text-zinc-400 text-sm">All members can send messages</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setType("channel");
                setStep("details");
              }}
              className="w-full p-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition text-left border border-zinc-800 hover:border-blue-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Channel</h3>
                  <p className="text-zinc-400 text-sm">Only admins and allowed members can send</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Group Details */}
      {step === "details" && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-sm mx-auto space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" width={96} height={96} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                      {name[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>
              <p className="text-zinc-400 text-sm text-center">
                Add a {type} photo
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-2">
                {type === "group" ? "Group" : "Channel"} Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${type} name`}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`What's this ${type} about?`}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Add Members */}
      {step === "members" && (
        <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search by username..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {selectedMembers.size > 0 && (
              <p className="text-zinc-400 text-sm mt-2">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-zinc-900">
                {searchResults.map((profile) => {
                  const isSelected = selectedMembers.has(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => toggleMember(profile.id)}
                      className="w-full flex items-center gap-3 px-6 py-4 hover:bg-zinc-900 transition text-left"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                        {profile.avatar_url ? (
                          <Image
                            src={ikUrl(profile.avatar_url, { w: 80, h: 80 })}
                            alt={profile.username}
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">
                            {profile.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-sm font-medium flex-1">
                        @{profile.username}
                      </span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected ? "bg-purple-600 border-purple-600" : "border-zinc-600"
                      }`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-sm">Search for users to add</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}