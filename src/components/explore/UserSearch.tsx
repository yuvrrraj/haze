"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineSearch, AiOutlineClose } from "react-icons/ai";

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .ilike("username", `%${query.trim()}%`)
        .neq("is_hidden", true)
        .limit(10);
      setResults(data ?? []);
      setOpen(true);
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function clear() { setQuery(""); setResults([]); setOpen(false); }

  return (
    <div ref={containerRef} className="relative px-3 pt-3 pb-2">
      <div className="relative flex items-center">
        <AiOutlineSearch className="absolute left-3 text-zinc-500" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search users..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />
        {query && (
          <button onClick={clear} className="absolute right-3 text-zinc-500 hover:text-white">
            <AiOutlineClose size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">No users found</p>
          )}
          {!loading && results.map((user) => (
            <a
              key={user.id}
              href={`/profile/${user.id}`}
              onClick={clear}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={ikUrl(user.avatar_url, { w: 80, h: 80 })}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">@{user.username}</p>
                {user.bio && <p className="text-zinc-500 text-xs truncate">{user.bio}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
