"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, XSquare } from "lucide-react";

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/practice?type=mixed&mode=ordered", label: "刷题", icon: BookOpen },
  { href: "/mistakes", label: "错题", icon: XSquare },
  { href: "/stats", label: "统计", icon: BarChart3 }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
        return (
          <Link className={`bottom-nav__item ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
            <Icon aria-hidden="true" size={22} strokeWidth={2.4} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
