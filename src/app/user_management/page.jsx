'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {

  Edit3,

  Eye,

  Plus,

  Search,

  X,

  CheckCircle2,
  UserRound,
  ChevronLeft,
  ChevronRight,

} from 'lucide-react';

import AppShell from '../../components/AppShell';

import PageHeader from '../../components/PageHeader';

import Card from '../../components/Card';
import { PermissionGate } from '../../components/AccessControl';
import { api } from '../../services/api.js';
import { getLeads, getUsers } from '../../services/leadService';

const USERS_PER_PAGE = 5;

function normalizeUserRecord(user) {
  const name = user.name
    || user.fullName
    || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  const status = String(user.status || '');
  const normalizedStatus = {
    OPERATIVE: 'Active',
    INOPERATIVE: 'Inactive',
    SUSPENDED: 'Suspended',
  }[status.toUpperCase()] || status;

  return {
    ...user,
    id: user.id || user.userId || user.userCode || user.empNo,
    empNo: user.empNo || user.emp_no || user.employeeId || user.employee_id,
    employeeId: user.employeeId || user.employee_id || user.empNo || user.emp_no,
    name,
    fullName: name,
    title: user.title || ({
      MALE: 'Mr.',
      FEMALE: 'Ms.',
    }[String(user.gender || '').toUpperCase()] || ''),
    userName: user.userName || user.username,
    branch: user.branch || user.branchName || user.loginBranch || user.login_branch_name,
    designation: user.designation || user.jobTitle || user.position,
    userRole: user.userRole || user.role,
    status: normalizedStatus,
  };
}

export default function UserManagementPage() {

  const router = useRouter();

  const [employees, setEmployees] = useState([]);

  const [usersLoading, setUsersLoading] = useState(true);

  const [usersError, setUsersError] = useState('');

  const [leads, setLeads] = useState([]);

  const [customers, setCustomers] = useState([]);

  const [searchInput, setSearchInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  const [notification, setNotification] = useState('');

  useEffect(() => {
    let cancelled = false;
    let notificationTimer;

    const loadUsers = async () => {
      try {
        const users = await getUsers();
        if (!cancelled) setEmployees(users.map(normalizeUserRecord));
      } catch (error) {
        if (!cancelled) {
          setUsersError(error instanceof Error ? error.message : 'Unable to load users.');
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    loadUsers();

    setLeads(getLeads());

    setCustomers(api.customers);

    if (typeof window !== 'undefined') {

      const flash = window.sessionStorage.getItem('los_user_notification');

      if (flash) {

        setNotification(flash);

        window.sessionStorage.removeItem('los_user_notification');

        notificationTimer = setTimeout(() => setNotification(''), 6000);

      }

    }

    return () => {
      cancelled = true;
      if (notificationTimer) clearTimeout(notificationTimer);
    };

  }, []);

  // Search logic: triggers only when Search button is clicked or Enter is pressed

  const handleSearch = () => {

    setCurrentPage(1);

    setSearchQuery(searchInput.trim());

  };

  const handleResetSearch = () => {

    setSearchInput('');

    setSearchQuery('');

    setCurrentPage(1);

  };

  const filteredRecords = useMemo(() => {

    const q = searchQuery.trim().toLowerCase();

    if (!q) return employees;

    return employees.filter((record) => {

      const values = [

        record.empNo,
        record.emp_no,
        record.employeeId,
        record.employee_id,

        record.title,

        record.name,

        record.fullName,

        record.mobile,

        record.branch,

        record.loginBranch,
        record.login_branch_name,

        record.designation,

        record.jobTitle,

        record.position,

        record.systemRole,

        record.system_role,

        record.userRole,

        record.user_role,

        record.role,

        record.status,

      ];

      return values.some((value) => String(value ?? '').toLowerCase().includes(q));

    });

  }, [employees, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / USERS_PER_PAGE));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = filteredRecords.length ? (visiblePage - 1) * USERS_PER_PAGE : 0;
  const pageEnd = Math.min(pageStart + USERS_PER_PAGE, filteredRecords.length);
  const paginatedRecords = filteredRecords.slice(pageStart, pageEnd);

  const tableColumns = ['Sr. No.', 'Emp. No.', 'Employee Name', 'Mobile Number', 'Branch', 'Designation', 'User Role', 'Status'];

  // Navigate to dedicated full-page View

  // const handleView = (emp) => {

  //   const id = emp.empNo || emp.employeeId || emp.id;

  //   router.push(`/user_management/view/${id}`);

  // };

  // const handleEdit = (emp) => {

  //   const id = emp.empNo || emp.employeeId || emp.id;

  //   router.push(`/user_management/edit/${id}`);

  // };

  return (

    <AppShell title="User Management">

      <div style={{ marginTop: '-15px', marginBottom: '26px' }}>
        <h1 style={{ margin: 0, color: '#23474C', font: '700 23px Manrope' }}>
          User Management
        </h1>
      </div>

      <div

        style={{

          display: 'grid',

          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',

          gap: '15px',

          marginBottom: '20px',

        }}

      >

        {[

          { key: 'leads', label: 'Total No. of Leads', count: leads.length },

          { key: 'customers', label: 'Total No. of Customers', count: customers.length },

          { key: 'employees', label: 'Total No. of Employees', count: employees.length },

        ].map((summary) => {

          return (

            <article

              key={summary.key}

              aria-label={`${summary.label}: ${summary.count}`}

              style={{

                minHeight: '112px',

                padding: '19px 21px',

                border: '1px solid #e5ecec',

                borderRadius: '8px',

                background: '#fff',

                boxShadow: '0 2px 8px rgba(17, 39, 45, 0.03)',

                textAlign: 'left',

              }}

            >

              <span style={{ display: 'block', fontSize: '11px', color: '#718185', fontWeight: 600 }}>

                {summary.label}

              </span>

              <strong style={{ display: 'block', marginTop: '7px', font: '700 26px Manrope', color: '#1e3f45' }}>

                {summary.count}

              </strong>

            </article>

          );

        })}

      </div>

      {/* Notification Banner */}

      {notification && (

        <div

          style={{

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'space-between',

            padding: '12px 18px',

            borderRadius: '8px',

            background: '#eef8f5',

            border: '1px solid #cce8e0',

            color: '#13715b',

            fontSize: '13px',

            fontWeight: 500,

            marginBottom: '20px',

            boxShadow: '0 2px 6px rgba(19, 113, 91, 0.06)',

          }}

        >

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <CheckCircle2 size={18} color="#13715b" />

            <span>{notification}</span>

          </div>

          <button

            type="button"

            onClick={() => setNotification('')}

            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#13715b', display: 'grid', placeItems: 'center' }}

            aria-label="Dismiss notification"

          >

            <X size={16} />

          </button>

        </div>

      )}

      {/* =====================================================

          ENHANCED PROMINENT SEARCH BAR SECTION

      ===================================================== */}

      <div

        className="workspace-toolbar"

        style={{

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'space-between',

          gap: '16px',

          marginBottom: '20px',

          flexWrap: 'wrap',

        }}

      >

        <div className="prominent-search-bar">

          <div className="prominent-search-input">

            <Search size={18} />

            <input

              type="text"

              aria-label="Search employees"

              placeholder="Search employees..."

              value={searchInput}

              onChange={(e) => setSearchInput(e.target.value)}

              onKeyDown={(e) => {

                if (e.key === 'Enter') {

                  handleSearch();

                }

              }}

            />

            {searchInput && (

              <button

                type="button"

                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}

                style={{

                  border: 'none',

                  background: 'transparent',

                  cursor: 'pointer',

                  color: '#7a8e91',

                  padding: '0 4px',

                  display: 'grid',

                  placeItems: 'center',

                }}

                title="Clear input"

                aria-label="Clear employee search"

              >

                <X size={16} />

              </button>

            )}

          </div>

          <button

            type="button"

            className="primary-button"

            onClick={handleSearch}

            style={{

              height: '50px',

              padding: '0 22px',

              fontSize: '13px',

              display: 'inline-flex',

              alignItems: 'center',

              gap: '8px',
              flexShrink: 0,
              background: '#167c78',
              color: '#fff',
              border: '1px solid #167c78',
              boxShadow: '0 4px 12px rgba(23, 126, 122, 0.15)',
            }}

          >

            <Search size={15} />

            Search

          </button>

          {searchQuery && (

            <button

              type="button"

              className="secondary-button"

              onClick={handleResetSearch}

              style={{ height: '50px', padding: '0 16px', fontSize: '12px', flexShrink: 0 }}

            >

              Reset Filter

            </button>

          )}

        </div>

        <PermissionGate module="user-management" action="create">
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push('/user_management/add')}

          style={{

            height: '50px',

            padding: '0 20px',

            fontSize: '13px',

            display: 'inline-flex',

            alignItems: 'center',
            gap: '8px',
            background: '#167c78',
            color: '#fff',
            border: '1px solid #167c78',
            boxShadow: '0 4px 12px rgba(23, 126, 122, 0.15)',
          }}

        >

          <Plus size={16} />

          Add User

        </button>
        </PermissionGate>

      </div>

      {/* =====================================================

          IMPROVED EMPLOYEE TABLE

          - All column headers bold

          - Column: Employee Name (renamed from Name of the Employee)

          - Reduced excessive spacing between Employee Name and Mobile

          - Subtle row separators and clean hover effect

          - Properly aligned Action column

      ===================================================== */}

      <Card className="table-panel">

        <div className="panel-heading" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div>

            <h2>Employee Directory</h2>

            <p>

              Showing {filteredRecords.length} of {employees.length} employees

              {searchQuery ? ` matching "${searchQuery}"` : ''}

            </p>

          </div>

        </div>

        <div className="table-scroll">

          <table className="employee-directory-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>

            <thead>

              <tr>

                {tableColumns.map((column) => (

                  <th

                    key={column}

                    style={{

                      width: {
                        'Sr. No.': '58px',
                        'Emp. No.': '105px',
                        'Employee Name': '210px',
                        'Mobile Number': '125px',
                        Branch: '140px',
                        Designation: '155px',
                        'User Role': '125px',
                        Status: '105px',
                      }[column],
                      fontWeight: 700,
                      fontSize: '10px',
                      color: '#173e46',
                      textAlign: column === 'Sr. No.' ? 'center' : undefined,

                    }}

                  >

                    {column}

                  </th>

                ))}

              </tr>

            </thead>

            <tbody>

              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px', color: '#7a898b' }}>
                    <div style={{ display: 'grid', placeItems: 'center', gap: '8px' }}>
                      <UserRound size={32} color="#9bb0af" />
                      <strong style={{ color: '#173e46', fontSize: '14px' }}>
                        {usersLoading
                          ? 'Loading users...'
                          : usersError
                            ? 'Unable to load users'
                            : 'No employees found'}
                      </strong>
                      <span style={{ fontSize: '12px' }}>
                        {usersError
                          ? usersError
                          : searchQuery
                            ? 'Try clearing or modifying your search terms.'
                            : 'Click "Add User" to register a new employee.'}
                      </span>
                    </div>

                  </td>

                </tr>

              ) : (
                <>
                  {paginatedRecords.map((emp, index) => (
                  <tr

                    key={emp.id || emp.empNo || index}

                    style={{

                      transition: 'background-color 0.15s ease',

                      borderBottom: '1px solid #edf2f1',

                    }}

                  >

                    <td style={{ color: '#708087', fontSize: '12px', padding: '11px 9px', textAlign: 'center' }}>

                      {pageStart + index + 1}

                    </td>

                    <td style={{ padding: '11px 9px' }}>

                      <strong className="id-text" style={{ fontSize: '12px', fontWeight: 700 }}>

                        {emp.empNo || emp.emp_no || emp.employeeId || emp.employee_id}

                      </strong>

                    </td>

                    <td style={{ padding: '11px 9px', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>

                      <strong style={{ fontSize: '13px', color: '#173e46' }}>

                        {[emp.title, emp.name || emp.fullName].filter(Boolean).join(' ')}

                      </strong>

                      {emp.userName && (
                        <span style={{ fontSize: '10px', color: '#889a9c', display: 'block', marginTop: '2px', overflowWrap: 'anywhere' }}>
                          @{emp.userName}
                        </span>
                      )}

                    </td>

                    <td style={{ color: '#2c4751', fontSize: '11px', padding: '11px 9px', whiteSpace: 'nowrap' }}>

                      {emp.mobile || '-'}

                    </td>

                    <td style={{ color: '#2c4751', fontSize: '11px', padding: '11px 9px', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>

                      {emp.branch || emp.loginBranch || emp.login_branch_name || '-'}

                    </td>

                    <td style={{ color: '#2c4751', fontSize: '11px', padding: '11px 9px', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>

                      {emp.designation || emp.jobTitle || emp.position || '-'}

                    </td>

                    <td style={{ padding: '11px 9px' }}>
                      <span className="role-badge employee-role-badge" style={{ fontWeight: 600, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                        {emp.userRole || emp.user_role || emp.role || '-'}
                      </span>
                    </td>

                    <td style={{ padding: '11px 9px' }}>
                      <span
                        className={`employee-status-badge status-${String(emp.status || '').toLowerCase()}`}
                        style={{
                          display: 'inline-block',
                          padding: '5px 9px',
                          borderRadius: '20px',
                          fontSize: '10px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {emp.status || 'Not set'}
                      </span>
                    </td>

                    {/* <td style={{ padding: '14px 12px', textAlign: 'center' }}>

                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>

                          <PermissionGate module="user-management" action="edit">
                          <button

                            type="button"

                            className="icon-button"

                            title="View Employee Details"

                            aria-label={`View ${emp.name || emp.fullName}`}

                            onClick={() => handleView(emp)}

                            style={{

                              border: '1px solid #d8e2e1',

                              width: '32px',

                              height: '32px',

                              borderRadius: '6px',

                              color: '#167c78',

                              background: '#fff',

                            }}

                          >

                            <Eye size={15} />

                          </button>

                          <button

                            type="button"

                            className="icon-button"

                            title="Edit Employee"

                            aria-label={`Edit ${emp.name || emp.fullName}`}

                            onClick={() => handleEdit(emp)}

                            style={{

                              border: '1px solid #d8e2e1',

                              width: '32px',

                              height: '32px',

                              borderRadius: '6px',

                              color: '#2563eb',

                              background: '#fff',

                            }}

                          >

                            <Edit3 size={15} />

                          </button>
                          </PermissionGate>

                      </div>

                    </td> */}

                  </tr>

                  ))}
                </>

              )}

            </tbody>

          </table>

        </div>

        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '11px 14px',
            borderTop: '1px solid #e8eeec',
            color: '#718284',
            fontSize: '10px',
          }}
        >
          <span>
            Showing {filteredRecords.length ? pageStart + 1 : 0}–{pageEnd} of {filteredRecords.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={visiblePage === 1}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '30px',
                height: '30px',
                border: '1px solid #d8e3e1',
                borderRadius: '4px',
                background: '#fff',
                color: '#456567',
                cursor: visiblePage === 1 ? 'not-allowed' : 'pointer',
                opacity: visiblePage === 1 ? 0.45 : 1,
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ minWidth: '48px', textAlign: 'center', color: '#496163', fontWeight: 700 }}>
              {visiblePage} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={visiblePage === pageCount}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '30px',
                height: '30px',
                border: '1px solid #d8e3e1',
                borderRadius: '4px',
                background: '#fff',
                color: '#456567',
                cursor: visiblePage === pageCount ? 'not-allowed' : 'pointer',
                opacity: visiblePage === pageCount ? 0.45 : 1,
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>

      </Card>

    </AppShell>

  );

}