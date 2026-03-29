"use client";
import { useState } from "react";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { AiOutlinePlus } from "react-icons/ai";
import toast from "react-hot-toast";

interface QuickCreateGroupProps {
  onGroupCreated: (groupId: string) => void;
}

export default function QuickCreateGroup({ onGroupCreated }: QuickCreateGroupProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [creating, setCreating] = useState(false);

  async function createQuickGroup(type: "group" | "channel") {
    setCreating(true);
    const toastId = toast.loading(`Creating ${type}...`);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const defaultName = type === "group" ? "New Group" : "New Channel";

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: defaultName,
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

      toast.success(`${type === "group" ? "Group" : "Channel"} created!`, { id: toastId });
      setShowOptions(false);
      onGroupCreated(group.id);
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
      toast.error(`Failed to create ${type}`, { id: toastId });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={creating}
        className="p-2 rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white disabled:opacity-50"
      >
        <AiOutlinePlus size={22} />
      </button>

      {showOptions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
          <div className="absolute right-0 top-10 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
            <button
              onClick={() => createQuickGroup("group")}
              disabled={creating}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition disabled:opacity-50"
            >
              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span>New Group</span>
            </button>
            <button
              onClick={() => createQuickGroup("channel")}
              disabled={creating}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition disabled:opacity-50"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </svg>
              </div>
              <span>New Channel</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}