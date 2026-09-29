"use client";

import {
  ChartColumnBigIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  SquirrelIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

/**
 * The chat is the front door, so it comes first. `/` is the only chat URL —
 * there is no `/chat` alias.
 */
const navItems = [
  { icon: MessageCircleIcon, title: "Chat", url: "/" },
  { icon: ReceiptTextIcon, title: "Receipts", url: "/receipts" },
  { icon: ChartColumnBigIcon, title: "Overview", url: "/overview" },
];

export const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="bg-sidebar-accent text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <SquirrelIcon />
              </div>
              <span className="truncate font-semibold">Possum Receipts</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    // Exact match, not `startsWith`: the chat's URL is `/`, and
                    // a prefix test would mark it active on every route.
                    isActive={pathname === item.url}
                  >
                    <item.icon />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
