'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  Users,
  KeyRound,
  UserCircle,
  CalendarDays,
  BarChart3,
  LogOut,
  ScanLine,
  UtensilsCrossed,
  Gift,
  BarChart2,
  Radio,
  Activity,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Activity },
  { href: '/admin/checkin', label: 'Check-in', icon: ScanLine },
  { href: '/admin/scan/food', label: 'Food', icon: UtensilsCrossed },
  { href: '/admin/scan/gift', label: 'Gift', icon: Gift },
  { href: '/admin/polls', label: 'Polls', icon: BarChart2 },
  { href: '/admin/live', label: 'Live Feed', icon: Radio },
  { href: '/admin/delegates', label: 'Delegates', icon: Users },
  { href: '/admin/invite-codes', label: 'Invite Codes', icon: KeyRound },
  { href: '/admin/faculty', label: 'Faculty', icon: UserCircle },
  { href: '/admin/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'rlc_admin=; path=/; max-age=0';
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-rlc-bg-card border-r border-rlc-border hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-rlc-border">
          <Bot className="w-6 h-6 text-rlc-accent" />
          <span className="font-bold text-sm">
            RLC <span className="text-rlc-accent">Admin</span>
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-rlc-accent/10 text-rlc-accent font-medium'
                    : 'text-rlc-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-rlc-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rlc-muted hover:text-rlc-red transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-rlc-bg-card border-b border-rlc-border">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-rlc-accent" />
            <span className="font-bold text-sm">RLC Admin</span>
          </div>
          <button onClick={handleLogout} className="text-rlc-muted">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-rlc-accent/10 text-rlc-accent'
                    : 'text-rlc-muted hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-24 md:pt-0">
        <div className="p-6 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
