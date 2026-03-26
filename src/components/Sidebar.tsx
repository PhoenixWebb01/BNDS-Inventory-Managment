"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/inventory", label: "Inventory", icon: "package" },
  { href: "/scan", label: "Scan", icon: "scan" },
];

function Icon({ name, active }: { name: string; active?: boolean }) {
  const color = active ? "currentColor" : "currentColor";
  switch (name) {
    case "grid":
      return (
        <svg className="h-[18px] w-[18px]" fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "package":
      return (
        <svg className="h-[18px] w-[18px]" fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "scan":
      return (
        <svg className="h-[18px] w-[18px]" fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-surface-low">
      {/* Logo — uses tonal shift, no border */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold tracking-wide text-on-primary">
            BDX
          </div>
          <div>
            <div className="font-[family-name:var(--font-hero)] text-sm font-semibold leading-tight text-on-surface">
              Boudreaux&apos;s
            </div>
            <div className="text-[11px] text-on-surface-muted">
              Inventory System
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        <div className="mb-3 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-subtle">
            Menu
          </span>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-surface-card text-primary"
                  : "text-on-surface-variant hover:bg-surface-card/60 hover:text-on-surface"
              }`}
              style={isActive ? { boxShadow: "var(--shadow-ambient)" } : {}}
            >
              <Icon name={item.icon} active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out — tonal, no border */}
      <div className="p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-on-surface-muted transition hover:bg-surface-container hover:text-on-surface"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
