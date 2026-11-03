'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Coins,
  FilePlus2,
  Gauge,
  KeyRound,
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Settings,
  ShieldCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
  ScrollText,
} from "lucide-react";
import { getRoutePermission, hasRolePermission } from '../lib/rbac';
import './sidebar.css';

const NAV = [
  { type: "link", label: "Dashboard", icon: Gauge, href: "/dashboard" },
  {
    type: "group",
    label: "Retail",
    icon: WalletCards,
    children: [
      { label: "Lead management", icon: UsersRound, href: "/lead_management" },
      {
        label: "Customer onboarding",
        icon: UserPlus,
        href: "/customer_management",
      },
      { label: "Loan application", icon: FilePlus2, href: "/loan_application" },
      { label: "Gold Loan Application", icon: Coins, href: "/gold_loan_application" },
    ],
  },
  {
    type: "group",
    label: "Corporate",
    icon: Building2,
    children: [
      {
        label: "Lead management",
        icon: UsersRound,
        href: "/lead_management/corporate",
      },
      {
        label: "Customer onboarding",
        icon: UserPlus,
        disabled: true,
        permissionHref: "/customer_management",
      },
      { label: "Loan application", icon: FilePlus2, href: "/loan_application" },
    ],
  },
  {
    type: "group",
    label: "Eligibility & sanctioning",
    icon: ClipboardCheck,
    children: [
      {
        label: "Loan eligibility",
        icon: ShieldCheck,
        href: "/loan_eligibility",
      },
    ],
  },
  {
    type: "group",
    label: "User management",
    icon: UsersRound,
    children: [
      { label: "User creation", icon: UserPlus, href: "/user_management" },
    ],
  },
  {
    type: "group",
    label: "Masters",
    icon: Landmark,
    children: [
      {
        label: "Product management",
        icon: WalletCards,
        href: "/product_management",
      },
      { label: "Lookup", icon: BookOpen, href: "/lookup_management" },
      { label: "Rule engine", icon: Activity, href: "/rule_engine" },
      {
        label: "Interest rate master",
        icon: Percent,
        href: "/interest_rate_master",
      },
      { label: "Gold rate master", icon: Coins, href: "/gold_rate_master" },
      {
        label: "Bank branch master",
        icon: Building2,
        href: "/master_creation",
      },
    ],
  },
  {
    type: "link",
    label: "Document management",
    icon: ScrollText,
    href: "/document_management",
  },
  { type: "link", label: "Reports", icon: BarChart3, href: "/reports" },
  {
    type: "link",
    label: "Activity Log",
    icon: BarChart3,
    href: "/activity-log",
  },
  {
    type: "group",
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Roles & access", icon: ShieldCheck, href: "/role_access" },
      { label: "Profile", icon: UsersRound, href: "/profile" },
      { label: "Change password", icon: KeyRound, href: "/settings" },
      { label: "Logout", icon: LogOut, action: "logout" },
    ],
  },
];

function getVisibleRoute(role, item) {
  const permission = getRoutePermission(item.href || item.permissionHref);
  return !permission || hasRolePermission(role, ...permission);
}

function getItemPath(item) {
  return item.href?.split('?')[0];
}

function findActiveItem(pathname, items) {
  const links = items.flatMap((item) => item.type === 'group' ? item.children : [item]);
  return links
    .filter((item) => item.href && (pathname === getItemPath(item) || pathname?.startsWith(`${getItemPath(item)}/`)))
    .sort((first, second) => getItemPath(second).length - getItemPath(first).length)[0];
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U';
}

export default function Sidebar({
  open = false,
  collapsed = false,
  onToggle,
  onClose,
  role,
  user,
  onLogout,
}) {
  const pathname = usePathname() || '';
  const visibleNav = useMemo(() => NAV.flatMap((item) => {
    if (item.type === 'link') return getVisibleRoute(role, item) ? [item] : [];
    const children = item.children.filter((child) =>
      child.action === 'logout' || getVisibleRoute(role, child)
    );
    return children.length ? [{ ...item, children }] : [];
  }), [role]);
  const activeItem = findActiveItem(pathname, visibleNav);
  const activeGroup = visibleNav.find((item) =>
    item.type === 'group' && item.children.includes(activeItem)
  )?.label;
  const [openGroup, setOpenGroup] = useState(activeGroup || '');

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  const displayName = [user?.name, user?.fullName, user?.full_name, user?.username]
    .find((value) => typeof value === 'string' && value.trim())?.trim() || 'User';
  const displayRole = (typeof role === 'string' && role)
    || (typeof role?.name === 'string' && role.name)
    || (typeof user?.role === 'string' && user.role)
    || 'Team member';

  const handleGroupClick = (label) => {
    if (collapsed && !open) {
      onToggle?.(false);
      setOpenGroup(label);
      return;
    }
    setOpenGroup((current) => current === label ? '' : label);
  };

  const closeAfterNavigation = () => onClose?.();

  return (
    <>
      {open && (
        <button
          className="sb-backdrop"
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        id="app-sidebar"
        className={`sidebar sb${open ? ' sidebar-open' : ''}${collapsed ? ' sb-collapsed' : ''}`}
        aria-label="Application sidebar"
      >
        <div className="sb-brand">
          <Link className="sb-brand-link" href="/bank_profile" onClick={closeAfterNavigation}>
            <span className="sb-brand-mark" aria-hidden="true">L</span>
            <span className="sb-brand-copy">
              <strong>LOS</strong>
              <small>Loan origination</small>
            </span>
          </Link>
          <button
            className="sb-icon-button sb-collapse"
            type="button"
            onClick={() => onToggle?.(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            className="sb-icon-button sb-mobile-close"
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            title="Close navigation menu"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="sb-nav" aria-label="Main navigation">
          {visibleNav.map((item, index) => {
            if (item.type === 'link') {
              const isActive = activeItem === item;
              const Icon = item.icon;
              return (
                <Link
                  className={`sb-item${isActive ? ' is-active' : ''}`}
                  href={item.href}
                  key={item.label}
                  onClick={closeAfterNavigation}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="sb-item-label">{item.label}</span>
                </Link>
              );
            }

            const groupId = `sb-group-${index}`;
            const submenuId = `${groupId}-submenu`;
            const isOpen = openGroup === item.label;
            const isExpanded = isOpen && (!collapsed || open);
            const groupActive = item.children.includes(activeItem);
            const Icon = item.icon;

            return (
              <div className={`sb-group${groupActive ? ' is-active' : ''}`} key={item.label}>
                <button
                  className="sb-item sb-group-trigger"
                  type="button"
                  onClick={() => handleGroupClick(item.label)}
                  aria-label={item.label}
                  aria-expanded={isExpanded}
                  aria-controls={submenuId}
                  title={item.label}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="sb-item-label">{item.label}</span>
                  <ChevronDown
                    className={`sb-chevron${isExpanded ? ' is-open' : ''}`}
                    size={15}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`sb-submenu-grid${isExpanded ? ' is-open' : ''}`}
                  id={submenuId}
                  aria-label={`${item.label} navigation`}
                  inert={!isExpanded}
                >
                  <div className="sb-submenu">
                    {item.children.map((child) => {
                      if (child.action === 'logout') {
                        return (
                          <button
                            className="sb-subitem sb-logout"
                            type="button"
                            key={child.label}
                            onClick={onLogout}
                            tabIndex={isExpanded ? 0 : -1}
                          >
                            <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                            <span>{child.label}</span>
                          </button>
                        );
                      }

                      if (child.disabled) {
                        const ChildIcon = child.icon;
                        return (
                          <span
                            className="sb-subitem sb-subitem-disabled"
                            key={child.label}
                            aria-disabled="true"
                            title={`${child.label} is unavailable`}
                          >
                            <ChildIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                            <span>{child.label}</span>
                          </span>
                        );
                      }

                      const isActive = activeItem === child;
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          className={`sb-subitem${isActive ? ' is-active' : ''}`}
                          href={child.href}
                          key={child.label}
                          onClick={closeAfterNavigation}
                          aria-current={isActive ? 'page' : undefined}
                          tabIndex={isExpanded ? 0 : -1}
                        >
                          <ChildIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sb-user" title={`${displayName} — ${displayRole}`}>
          <span className="sb-avatar" aria-hidden="true">{getInitials(displayName)}</span>
          <span className="sb-user-copy">
            <strong>{displayName}</strong>
            <small>{displayRole}</small>
          </span>
        </div>
      </aside>
    </>
  );
}
