"use client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AiOutlineLogout } from "react-icons/ai";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ last_active: new Date(0).toISOString() }).eq("id", user.id);
    }
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.replace("/");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white text-sm font-medium transition"
    >
      <AiOutlineLogout size={16} />
      Logout
    </button>
  );
}
