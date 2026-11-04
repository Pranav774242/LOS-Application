'use client';

import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { logout, LOGOUT_PENDING_KEY } from '../services/login';
import { getUserProfile } from '../services/user_profile';

let headerDetailsCache = null;

export default function Header({ menuOpen, onMenu }) {
  const [details, setDetails] = useState(getInitialHeaderDetails);

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
  const role = firstText(profile?.user_role, profile?.role, profile?.role_name)
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
        <HeaderDetail label="User Role" value={role} error={profileError} />
        <HeaderDetail label="Designation" value={designation} error={profileError} />
      </div>
      <div className="top-actions">
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