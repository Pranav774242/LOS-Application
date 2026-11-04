'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { AccessContext } from './AccessControl';
import {
  DEFAULT_ROLES,
  getCurrentRole,
  getRoutePermission,
  hasRolePermission,
  readStoredRoles,
  ROLE_CHANGE_EVENT,
} from '../lib/rbac';
import { getUserProfile } from '../services/user_profile';
import { LOGOUT_PENDING_KEY, logout } from '../services/login';
import './shell.css';

const SIDEBAR_STORAGE_KEY = 'los-sidebar-collapsed';

export default function AppShell({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [authData, setAuthData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessReady, setAccessReady] = useState(false);
  const [accessError, setAccessError] = useState('');
  const pathname = usePathname() || '';

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
    } catch (error) {
      console.error('Unable to load the saved sidebar preference.', error);
    } finally {
      setSidebarPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    } catch (error) {
      console.error('Unable to save the sidebar preference.', error);
    }
  }, [sidebarCollapsed, sidebarPreferenceLoaded]);

  useEffect(() => {
    const redirectIfLoggedOut = () => {
      if (window.sessionStorage.getItem(LOGOUT_PENDING_KEY) === 'true') {
        window.location.replace('/login');
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted) redirectIfLoggedOut();
    };

    redirectIfLoggedOut();
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let currentAuth = null;
    let currentRoles = DEFAULT_ROLES;

    try {
      const storedAuth = window.localStorage.getItem('authData');
      currentAuth = storedAuth ? JSON.parse(storedAuth) : null;
      currentRoles = readStoredRoles();
      setAuthData(currentAuth);
      setRoles(currentRoles);
    } catch (error) {
      setRoles([]);
      setAccessError(error instanceof Error ? error.message : 'Saved role settings could not be loaded.');
      setAccessReady(true);
      console.error('Unable to initialize role-based access settings.', error);
      return undefined;
    }

    const loadRoleProfile = async () => {
      try {
        if (currentAuth?.user?.id && !getCurrentRole(currentAuth, null, currentRoles)) {
          const currentProfile = await getUserProfile();
          if (!cancelled) setProfile(currentProfile);
        } else {
          setAccessReady(true);
          return;
        }
      } catch (error) {
        setAccessError(error instanceof Error ? error.message : 'Unable to load the current user role.');
      } finally {
        if (!cancelled) setAccessReady(true);
      }
    };

    const reloadRoles = () => {
      try {
        setRoles(readStoredRoles());
        setAccessError('');
      } catch (error) {
        setRoles([]);
        setAccessError(error instanceof Error ? error.message : 'Saved roles could not be reloaded.');
        console.error('Unable to reload saved roles.', error);
      }
    };

    window.addEventListener('storage', reloadRoles);
    window.addEventListener(ROLE_CHANGE_EVENT, reloadRoles);
    loadRoleProfile();

    return () => {
      cancelled = true;
      window.removeEventListener('storage', reloadRoles);
      window.removeEventListener(ROLE_CHANGE_EVENT, reloadRoles);
    };
  }, []);

  const currentRole = useMemo(
    () => getCurrentRole(authData, profile, roles),
    [authData, profile, roles]
  );
  const hasPermission = useCallback(
    (module, action = 'view') => hasRolePermission(currentRole, module, action),
    [currentRole]
  );
  const accessContext = useMemo(
    () => ({ role: currentRole, loading: !accessReady, hasPermission }),
    [accessReady, currentRole, hasPermission]
  );
  const routePermission = getRoutePermission(pathname);
  const canViewRoute = !routePermission || hasPermission(...routePermission);
  const currentUser = profile || authData?.user || authData?.profile || authData;

  const handleLogout = async () => {
    try {
      window.sessionStorage.setItem(LOGOUT_PENDING_KEY, 'true');
    } catch (error) {
      console.error('Unable to save the logout state.', error);
    }

    try {
      await logout();
    } catch (error) {
      console.error('Unable to complete server logout; completing local sign-out.', error);
    } finally {
      try {
        window.localStorage.removeItem('authData');
      } catch (error) {
        console.error('Unable to clear the saved sign-in data.', error);
      }
      window.location.replace('/login');
    }
  };

  const toggleSidebar = (nextCollapsed) => {
    setSidebarCollapsed((current) =>
      typeof nextCollapsed === 'boolean' ? nextCollapsed : !current
    );
  };

  return (
    <AccessContext.Provider value={accessContext}>
      <div className="los-shell">
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          onClose={() => setSidebarOpen(false)}
          role={currentRole}
          user={currentUser}
          onLogout={handleLogout}
        />
        <div className="los-workspace">
          <Header menuOpen={sidebarOpen} onMenu={() => setSidebarOpen((open) => !open)} />
          <main className="main-content los-main-content">
            <div className="page-wrap los-page-wrap">
              {!accessReady ? (
                <div className="los-access-message" role="status" aria-live="polite">
                  Checking page access…
                </div>
              ) : !currentRole || !canViewRoute ? (
                <section className="los-access-restricted" role="alert">
                  <h2>Access restricted</h2>
                  <p>
                    {accessError
                      ? `Role-based access could not be initialized: ${accessError}`
                      : !currentRole
                        ? 'Your session role does not match an active UI role. Contact an administrator to configure access.'
                        : 'Your role does not have permission to view this page.'}
                  </p>
                </section>
              ) : children}
            </div>
          </main>
        </div>
      </div>
    </AccessContext.Provider>
  );
}
