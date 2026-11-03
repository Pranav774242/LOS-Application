export const ROLE_STORAGE_KEY = 'los_rbac_roles';
export const ROLE_CHANGE_EVENT = 'los:roles-updated';

export const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { id: 'bank-management', label: 'Bank Management', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'user-management', label: 'User Management', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'lead-management', label: 'Lead Management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: 'loan-applications', label: 'Loan Applications', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: 'applicant-management', label: 'Applicant Management', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'reports', label: 'Reports', actions: ['view'] },
  { id: 'settings', label: 'Settings', actions: ['view', 'edit'] },
  { id: 'role-access', label: 'Role & Access Management', actions: ['view', 'create', 'edit', 'delete'] },
];

const allPermissionKeys = PERMISSION_MODULES.flatMap((module) =>
  module.actions.map((action) => `${module.id}.${action}`)
);

function makePermissions(grants = []) {
  return Object.fromEntries(allPermissionKeys.map((key) => [key, grants.includes(key)]));
}

export const DEFAULT_ROLES = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full access to administration and lending operations.',
    status: 'Active',
    isSystem: true,
    permissions: makePermissions(allPermissionKeys),
  },
  {
    id: 'BRANCH_USER',
    name: 'Branch User',
    description: 'Branch-level access to customer and application workflows.',
    status: 'Active',
    isSystem: true,
    permissions: makePermissions([
      'dashboard.view', 'bank-management.view', 'user-management.view',
      'lead-management.view', 'lead-management.create', 'lead-management.edit',
      'loan-applications.view', 'loan-applications.create', 'loan-applications.edit',
      'applicant-management.view', 'applicant-management.create',
      'applicant-management.edit', 'reports.view', 'settings.view',
    ]),
  },
  {
    id: 'CREDIT_USER',
    name: 'Credit User',
    description: 'Reviews applications and records credit decisions.',
    status: 'Active',
    isSystem: true,
    permissions: makePermissions([
      'dashboard.view', 'lead-management.view', 'loan-applications.view',
      'loan-applications.edit', 'loan-applications.approve',
      'applicant-management.view', 'reports.view',
    ]),
  },
  {
    id: 'AUDIT_USER',
    name: 'Audit User',
    description: 'Read-only access to operational records and reports.',
    status: 'Active',
    isSystem: true,
    permissions: makePermissions([
      'dashboard.view', 'bank-management.view', 'user-management.view',
      'lead-management.view', 'loan-applications.view',
      'applicant-management.view', 'reports.view',
    ]),
  },
];

export function readStoredRoles() {
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (!stored) return DEFAULT_ROLES;

  const roles = JSON.parse(stored);
  if (!Array.isArray(roles)) throw new Error('Saved roles are not in a valid format.');
  return roles;
}

export function saveRoles(roles) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(roles));
  window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
}

function normalizeRole(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '_') : '';
}

export function getCurrentRole(authData, profile, roles) {
  const user = authData?.user || authData?.profile || {};
  const identifiers = [
    profile?.system_role, profile?.systemRole, profile?.system_role_code, profile?.systemRoleCode,
    profile?.user_role, profile?.userRole, profile?.user_role_name, profile?.userRoleName,
    profile?.role_name, profile?.roleName, profile?.role_code, profile?.roleCode, profile?.role,
    authData?.systemRole, authData?.system_role, authData?.systemRoleCode, authData?.system_role_code,
    authData?.userRole, authData?.user_role, authData?.userRoleName, authData?.role,
    user?.systemRole, user?.system_role, user?.systemRoleCode, user?.system_role_code,
    user?.userRole, user?.user_role, user?.userRoleName, user?.roleName, user?.role,
  ].map(normalizeRole).filter(Boolean);

  return roles.find((role) =>
    identifiers.includes(normalizeRole(role.id))
    || identifiers.includes(normalizeRole(role.name))
  ) || null;
}

export function hasRolePermission(role, moduleId, action = 'view') {
  if (!role || role.status !== 'Active') return false;
  return role.permissions?.[`${moduleId}.${action}`] === true;
}

export function getRoutePermission(pathname) {
  if (pathname === '/dashboard' || pathname === '/') return ['dashboard', 'view'];
  if (pathname.startsWith('/role_access')) return ['role-access', 'view'];
  if (pathname === '/user_management/add') return ['user-management', 'create'];
  if (pathname.startsWith('/user_management/edit/')) return ['user-management', 'edit'];
  if (pathname.startsWith('/user_management')) return ['user-management', 'view'];
  if (pathname.startsWith('/lead_management') || pathname.startsWith('/lead_managenet') || pathname.startsWith('/lead_generation')) return ['lead-management', 'view'];
  if (pathname.startsWith('/customer_management/customer_onboarding')) return ['loan-applications', 'create'];
  if (pathname.startsWith('/customer_management')) return ['applicant-management', 'view'];
  if (pathname.startsWith('/gold_loan_application/apply')) return ['loan-applications', 'create'];
  if (pathname.startsWith('/gold_loan_application/edit/')) return ['loan-applications', 'edit'];
  if (pathname.startsWith('/gold_loan_application')) return ['loan-applications', 'view'];
  if (pathname.startsWith('/master_creation')) return ['bank-management', 'edit'];
  if (pathname.startsWith('/bank_profile') || pathname.startsWith('/product_management')) {
    return ['bank-management', 'view'];
  }
  if (pathname.startsWith('/reports') || pathname.startsWith('/audit_logs')) return ['reports', 'view'];
  if (pathname.startsWith('/settings') || pathname.startsWith('/profile') || pathname.startsWith('/rule_engine')
    || pathname.startsWith('/interest_rate_master') || pathname.startsWith('/gold_rate_master')
    || pathname.startsWith('/lookup_management')) {
    return ['settings', 'view'];
  }
  if (pathname.startsWith('/loan_eligibility')) return ['loan-applications', 'view'];
  return null;
}
