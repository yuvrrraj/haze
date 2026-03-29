import { create } from "zustand";
import { User } from "@/types";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  badge: string | null;
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  hiddenNav: boolean;
  setHiddenNav: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (patch) => set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : null })),
  hiddenNav: false,
  setHiddenNav: (v) => set({ hiddenNav: v }),
}));
