"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";

const navItems = [
  {
    label: "Account Centre",
    href: "/settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: "Saved",
    href: "/saved",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    label: "Blocked Users",
    href: "/menu/blocked",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
];

export default function MenuPage() {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [restrictMessages, setRestrictMessages] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [togglingActivity, setTogglingActivity] = useState(false);
  const [togglingRestrict, setTogglingRestrict] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSpecialUser, setIsSpecialUser] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from("profiles").select("is_private, show_activity, restrict_messages, username").eq("id", user.id).maybeSingle()
        .then(({ data }) => {
          setIsPrivate(data?.is_private ?? false);
          setShowActivity(data?.show_activity ?? true);
          setRestrictMessages(data?.restrict_messages ?? false);
          setIsSpecialUser(data?.username === "verified");
        });
    });
  }, []);

  async function togglePrivate() {
    if (!userId) return;
    setToggling(true);
    const newVal = !isPrivate;
    const { error } = await supabase.from("profiles").update({ is_private: newVal }).eq("id", userId);
    if (error) toast.error("Failed to update privacy");
    else { setIsPrivate(newVal); toast.success(newVal ? "Account set to Private" : "Account set to Public"); }
    setToggling(false);
  }

  async function toggleActivity() {
    if (!userId) return;
    setTogglingActivity(true);
    const newVal = !showActivity;
    const { error } = await supabase.from("profiles").update({ show_activity: newVal }).eq("id", userId);
    if (error) toast.error("Failed to update activity status");
    else { setShowActivity(newVal); toast.success(newVal ? "Activity status visible" : "Activity status hidden"); }
    setTogglingActivity(false);
  }

  async function toggleRestrict() {
    if (!userId) return;
    setTogglingRestrict(true);
    const newVal = !restrictMessages;
    const { error } = await supabase.from("profiles").update({ restrict_messages: newVal }).eq("id", userId);
    if (error) toast.error("Failed to update");
    else { setRestrictMessages(newVal); toast.success(newVal ? "Message requests enabled" : "Message requests disabled"); }
    setTogglingRestrict(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Menu</span>
      </div>

      <div className="flex flex-col px-2 py-3 gap-1">
        {/* Nav items */}
        {navItems.map((item, i) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
            style={{ animation: `slideIn 0.2s ${i * 0.04}s ease-out forwards` }}
          >
            <span className="text-zinc-300">{item.icon}</span>
            <span className="font-semibold text-[15px]">{item.label}</span>
            <svg className="ml-auto text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}

        {/* Divider */}
        <div className="h-px bg-zinc-800 mx-2 my-2" />

        {/* Get Verified */}
        <button
          onClick={() => router.push("/settings/verified")}
          className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
        >
          <span className="text-blue-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 4.8 5.6.8-4 3.9.9 5.5L12 14.5l-4.9 2.5.9-5.5-4-3.9 5.6-.8z" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Get Verified</p>
            <p className="text-zinc-500 text-xs mt-0.5">Apply for a verified badge on your profile</p>
          </div>
          <svg className="ml-auto text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Sponsor */}
        <button
          onClick={() => router.push("/settings/sponsor")}
          className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
        >
          <span className="text-yellow-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Sponsor</p>
            <p className="text-zinc-500 text-xs mt-0.5">Promote your posts and reels with a sponsored badge</p>
          </div>
          <svg className="ml-auto text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Admin Panel — only for special user */}
        {isSpecialUser && (
          <>
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
            >
              <span className="text-blue-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="font-semibold text-[15px]">Verification Admin</p>
                <p className="text-zinc-500 text-xs mt-0.5">Review and manage verification requests</p>
              </div>
              <svg className="ml-auto text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/admin/sponsor")}
              className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
            >
              <span className="text-yellow-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="font-semibold text-[15px]">Sponsor Admin</p>
                <p className="text-zinc-500 text-xs mt-0.5">Review and manage sponsor requests</p>
              </div>
              <svg className="ml-auto text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Private Account Toggle */}
        <div className="flex items-center gap-4 px-4 py-4 rounded-2xl">
          <span className="text-zinc-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Private Account</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {isPrivate ? "Only approved followers can see your posts" : "Anyone can see your posts and reels"}
            </p>
          </div>
          <button
            onClick={togglePrivate}
            disabled={toggling}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${isPrivate ? "bg-purple-600" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isPrivate ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Activity Status Toggle */}
        <div className="flex items-center gap-4 px-4 py-4 rounded-2xl">
          <span className="text-zinc-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Activity Status</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {showActivity
                ? "Others can see when you were last active"
                : "Your activity status is hidden from others"}
            </p>
          </div>
          <button
            onClick={toggleActivity}
            disabled={togglingActivity}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${showActivity ? "bg-purple-600" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${showActivity ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Message Requests Toggle */}
        <div className="flex items-center gap-4 px-4 py-4 rounded-2xl">
          <span className="text-zinc-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="9" y2="10" strokeWidth="3"/>
              <line x1="12" y1="10" x2="15" y2="10" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Message Requests</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {restrictMessages
                ? "Others can only send you 1 message until you accept"
                : "Anyone can message you directly"}
            </p>
          </div>
          <button
            onClick={toggleRestrict}
            disabled={togglingRestrict}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${restrictMessages ? "bg-purple-600" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${restrictMessages ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800 mx-4 my-2" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-4 px-6 py-4 w-full text-red-400 hover:bg-zinc-900 transition"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="font-semibold text-[15px]">Log out</span>
      </button>
    </div>
  );
}
