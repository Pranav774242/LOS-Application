'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, LogOut, Menu, CircleUserRound, Search, X } from 'lucide-react';
import Link from 'next/link';
import { logout, LOGOUT_PENDING_KEY } from '../services/login';
import { getUserProfile } from '../services/user_profile';
import { getSidebarSearchItems } from './Sidebar';
import { usePathname } from 'next/navigation';

let headerDetailsCache = null;

export default function Header({ menuOpen, onMenu, role }) {
  const [details, setDetails] = useState(getInitialHeaderDetails);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsedSearchSections, setCollapsedSearchSections] = useState([]);
  const searchRef = useRef(null);
  const pathname = usePathname() || '';
  const searchItems = useMemo(() => getSidebarSearchItems(role), [role]);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const matchingPages = normalizedQuery
    ? searchItems.filter((item) => item.label.toLocaleLowerCase().includes(normalizedQuery))
    : [];
  const searchSections = matchingPages.reduce((sections, item) => {
    const section = item.section || 'Pages';
    const existing = sections.find((entry) => entry.label === section);
    if (existing) existing.items.push(item);
    else sections.push({ label: section, items: [item] });
    return sections;
  }, []);

  useEffect(() => {
    const closeSearchOnOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };

    document.addEventListener('mousedown', closeSearchOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeSearchOnOutsideClick);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    loadHeaderDetails().then((headerDetails) => {
      if (isCurrent) setDetails(headerDetails);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleLogout = async () => {
    window.sessionStorage.setItem(LOGOUT_PENDING_KEY, 'true');
    try {
      await logout();
    } catch {
      console.error('Unable to complete server logout; completing local sign-out.');
    } finally {
      window.localStorage.removeItem('authData');
      headerDetailsCache = null;
      window.location.replace('/login');
    }
  };

  const { profile, profileError, profileLoaded } = details;
  const branch = firstText(
    profile?.login_branch,
    profile?.login_branch_name,
    profile?.loginBranch,
    profile?.branch_name,
    profile?.branch,
  ) || getUnavailableValue(profileLoaded, profileError);
  const userRole = firstText(profile?.user_role, profile?.role, profile?.role_name)
    || getUnavailableValue(profileLoaded, profileError);
  const designation = firstText(profile?.designation_name)
    || getUnavailableValue(profileLoaded, profileError);

  return (
    <header className="topbar">
      <button
        className="icon-button menu-trigger"
        type="button"
        onClick={onMenu}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
      >
        <Menu size={20} />
      </button>
      <div className="header-user-details">
        <HeaderDetail label="Login Branch" value={branch} error={profileError} />
        <HeaderDetail label="User Role" value={userRole} error={profileError} />
        <HeaderDetail label="Designation" value={designation} error={profileError} />
      </div>
      <div className="top-actions">
        <div className="header-page-search" ref={searchRef}>
          <div className={`header-page-search-control${searchOpen ? ' is-open' : ''}`}>
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setCollapsedSearchSections([]);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSearchOpen(false);
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search pages"
              aria-label="Search sidebar pages"
              aria-expanded={searchOpen && Boolean(normalizedQuery)}
              aria-controls="header-page-search-results"
              aria-autocomplete="list"
            />
            {searchQuery && (
              <button
                className="header-page-search-clear"
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(true);
                  setCollapsedSearchSections([]);
                }}
                aria-label="Clear page search"
              >
                <X size={15} />
              </button>
            )}
          </div>
          {searchOpen && normalizedQuery && (
            <div
              className="header-page-search-results"
              id="header-page-search-results"
              aria-label="Matching pages"
            >
              {searchSections.length ? searchSections.map((section) => {
                const isCollapsed = collapsedSearchSections.includes(section.label);
                const sectionId = `header-page-search-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                return (
                  <section className="header-page-search-section" key={section.label}>
                    <button
                      className="header-page-search-section-toggle"
                      type="button"
                      onClick={() => setCollapsedSearchSections((current) =>
                        isCollapsed
                          ? current.filter((label) => label !== section.label)
                          : [...current, section.label]
                      )}
                      aria-expanded={!isCollapsed}
                      aria-controls={sectionId}
                    >
                      <span>{section.label}</span>
                      <span className={`header-page-search-chevron${isCollapsed ? '' : ' is-open'}`} aria-hidden="true" />
                    </button>
                    {!isCollapsed && (
                      <div className="header-page-search-section-items" id={sectionId}>
                        {section.items.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          const Icon = item.icon;
                          const matchIndex = item.label.toLocaleLowerCase().indexOf(normalizedQuery);
                          const matchEnd = matchIndex + normalizedQuery.length;
                          return (
                            <Link
                              className={`header-page-search-result${isActive ? ' is-active' : ''}`}
                              href={item.href}
                              key={item.href}
                              onClick={() => {
                                setSearchQuery('');
                                setSearchOpen(false);
                              }}
                            >
                              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                              <span>
                                {item.label.slice(0, matchIndex)}
                                <mark>{item.label.slice(matchIndex, matchEnd)}</mark>
                                {item.label.slice(matchEnd)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              }) : (
                <p className="header-page-search-empty" role="status">No matching pages</p>
              )}
            </div>
          )}
        </div>
        <Link className="icon-button profile-button" href="/profile" aria-label="User profile" title="User profile">
          <CircleUserRound size={19} />
        </Link>
        <button className="icon-button logout-button" type="button" onClick={handleLogout} aria-label="Logout" title="Logout">
          <LogOut size={19} />
        </button>
        <button className="icon-button notification" type="button" aria-label="Notifications">
          <Bell size={19} /><i />
        </button>
      </div>
    </header>
  );
}

function HeaderDetail({ label, value, error }) {
  return (
    <div className="header-detail" title={error || undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim();
}

function getUnavailableValue(loaded, error) {
  if (!loaded) return 'Loading...';
  return error ? 'Unavailable' : '—';
}

function getInitialHeaderDetails() {
  if (typeof window === 'undefined') return emptyHeaderDetails();

  const authData = window.localStorage.getItem('authData') || '';
  return headerDetailsCache?.authData === authData
    ? headerDetailsCache.details || emptyHeaderDetails()
    : emptyHeaderDetails();
}

function emptyHeaderDetails() {
  return {
    profile: null,
    profileError: '',
    profileLoaded: false,
  };
}

function loadHeaderDetails() {
  const authData = window.localStorage.getItem('authData') || '';

  if (headerDetailsCache?.authData === authData) {
    if (headerDetailsCache.details) return Promise.resolve(headerDetailsCache.details);
    if (headerDetailsCache.promise) return headerDetailsCache.promise;
  }

  const cache = { authData, details: null, promise: null };
  headerDetailsCache = cache;
  cache.promise = Promise.allSettled([getUserProfile()]).then(
    ([profileResult]) => {
      const details = {
        profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
        profileError: profileResult.status === 'rejected'
          ? profileResult.reason?.message || 'Unable to load user details.'
          : '',
        profileLoaded: true,
      };

      if (headerDetailsCache === cache) {
        cache.details = details;
        cache.promise = null;
      }

      return details;
    },
  );

  return cache.promise;
}