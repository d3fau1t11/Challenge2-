"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, Plus, QrCode, Grid, Menu, X, Home as HomeIcon, LogIn, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await supabaseClient.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const handleSignIn = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
    if (error) {
      router.push("/founder");
    }
  };

  const navItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Browse Stories", href: "/stories", icon: Grid },
    { name: "Scan QR", href: "/scan", icon: QrCode },
    { name: "Dashboard", href: "/founder/dashboard", icon: ShieldCheck },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const userName = user?.user_metadata?.full_name || user?.email || "Account";
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              True<span className="text-indigo-400">Impact</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Account Status & Action Button */}
          <div className="flex items-center gap-3">
            {/* Create Story Button */}
            <Link
              href="/founder"
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Story</span>
            </Link>

            {/* User Auth Section */}
            {!loading && (
              user ? (
                /* Signed In: User Avatar & Dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 p-1.5 pr-2.5 rounded-xl text-xs font-semibold text-white transition-all"
                  >
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userAvatar}
                        alt=""
                        className="w-6 h-6 rounded-lg object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-[11px]">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="max-w-[100px] truncate text-[11px] hidden sm:inline">{userName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-[fadeIn_0.15s_ease-out]">
                      <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                        <p className="text-xs font-bold text-white truncate">{userName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/founder/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        Founder Dashboard
                      </Link>

                      <Link
                        href="/founder"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-indigo-400" />
                        Create New Story
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Signed Out: Sign In Button */
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sign In</span>
                </button>
              )
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/80 py-4 space-y-2 animate-[fadeIn_0.2s_ease-out]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300"
                      : "text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}

            {/* Mobile Account Section */}
            <div className="pt-2 border-t border-slate-800/60">
              {user ? (
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userAvatar} alt="" className="w-8 h-8 rounded-lg border border-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{userName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    type="button"
                    className="w-full bg-rose-950/40 border border-rose-500/20 text-rose-300 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  type="button"
                  className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <LogIn className="w-4 h-4" /> Sign In with Google
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
