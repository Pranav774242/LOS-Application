'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../../../components/AppShell';
import PageHeader from '../../../../components/PageHeader';
import Card from '../../../../components/Card';
import { getEmployeeById } from '../../../../services/employeeService';
import {
  ArrowLeft,
  Clock,
  Edit3,
  Lock,
  Shield,
  User,
  AlertCircle,
  Building,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export default function ViewUserPage() {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedId = routeParams?.id;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resolvedId) {
      const emp = getEmployeeById(resolvedId);
      setEmployee(emp);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [resolvedId]);

  if (loading) {
    return (
      <AppShell title="Employee Details">
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#7a8e91' }}>
          Loading employee details...
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell title="Employee Not Found">
        <Card style={{ padding: '36px', textAlign: 'center', maxWidth: '560px', margin: '40px auto' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={26} />
          </div>
          <h2 style={{ fontSize: '18px', color: '#173e46', margin: '0 0 8px' }}>
            Employee Record Not Found
          </h2>
          <p style={{ color: '#7a8e91', fontSize: '13px', margin: '0 0 24px' }}>
            The requested employee identifier could not be located in the directory.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push('/user_management')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            Return to User Management
          </button>
        </Card>
      </AppShell>
    );
  }

  const fullName = employee.name || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  const empId = employee.empNo || employee.employeeId;

  return (
    <AppShell title={`Employee: ${fullName}`}>
      <PageHeader
        eyebrow="EMPLOYEE DIRECTORY"
        title={fullName}
        description={`Emp ID: ${empId} • Designation: ${employee.designation || 'Staff'} • Branch: ${employee.branch || employee.loginBranch || 'Head Office'}`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push('/user_management')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push(`/user_management/edit/${empId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Edit3 size={15} />
              Edit Employee
            </button>
          </div>
        }
      />

      {/* Overview Banner Card */}
      <div
        className="form-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fbfb 100%)',
          border: '1px solid #dce6e5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: '#e0eeea',
              color: '#167c78',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              fontWeight: 800,
            }}
          >
            {fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#173e46' }}>
              {fullName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#6a7e82' }}>
              <span>@{employee.userName}</span>
              <span>•</span>
              <span className="role-badge">{employee.userRole || employee.role || 'Staff'}</span>
              <span>•</span>
              <span
                className={`status ${
                  employee.status === 'Active' ? 'status-green' : employee.status === 'Suspended' ? 'status-amber' : 'status-grey'
                }`}
              >
                {employee.status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#7a8e91', display: 'block' }}>Branch</span>
            <strong style={{ fontSize: '13px', color: '#173e46' }}>
              {employee.branch || employee.loginBranch || 'Head Office'}
            </strong>
          </div>
          <div style={{ height: '32px', width: '1px', background: '#e1e9e8' }} />
          <div>
            <span style={{ fontSize: '11px', color: '#7a8e91', display: 'block' }}>Last Login</span>
            <strong style={{ fontSize: '13px', color: '#173e46' }}>
              {employee.lastLogin || 'Never'}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '22px' }}>
        {/* SECTION 1: Employee and Personal Information */}
        <div className="form-card" style={{ marginBottom: 0 }}>
          <div className="form-card-title">
            <User size={18} color="#167c78" />
            <span>Employee and Personal Information</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Emp ID</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{empId}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>First Name</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.firstName || '-'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Middle Name</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.middleName || '-'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Last Name</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.lastName || '-'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Mobile Number</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.mobile || '-'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Date of Birth</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.dateOfBirth || '-'}</strong>
            </div>
          </div>
        </div>

        {/* SECTION 2: Login Information */}
        <div className="form-card" style={{ marginBottom: 0 }}>
          <div className="form-card-title">
            <Lock size={18} color="#167c78" />
            <span>Login Information</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>User Name</span>
              <strong style={{ fontSize: '13px', color: '#167c78' }}>{employee.userName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Email Address</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.email || '-'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Password</span>
              <span style={{ fontSize: '13px', color: '#88999a', letterSpacing: '2px' }}>••••••••••••</span>
            </div>

            {/* Hidden as requested:
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Allow 2FA Login</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: employee.allow2FA || employee.twoFAEnabled === 'Y' ? '#2c956d' : '#88999a' }}>
                {employee.allow2FA || employee.twoFAEnabled === 'Y' ? (
                  <>
                    <CheckCircle2 size={16} /> Enabled
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Disabled
                  </>
                )}
              </span>
            </div>
            */}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Account State</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.status}</strong>
            </div>
          </div>
        </div>

        {/* SECTION 3: Role and Access Information */}
        <div className="form-card" style={{ marginBottom: 0 }}>
          <div className="form-card-title">
            <Shield size={18} color="#167c78" />
            <span>Role and Access Information</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Designation</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.designation || 'Staff'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>User Role</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.userRole || employee.role}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>System Role</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.systemRole || 'BRANCH_USER'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Login Branch</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>{employee.loginBranch || employee.branch || 'Head Office'}</strong>
            </div>

            {/* <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Allow MultiBranch</span>
              <strong style={{ fontSize: '13px', color: employee.allowMultiBranch || employee.multiBranchAccess === 'Y' ? '#167c78' : '#6a7e82' }}>
                {employee.allowMultiBranch || employee.multiBranchAccess === 'Y' ? 'Yes (Access All)' : 'No (Branch Specific)'}
              </strong>
            </div> */}

            {/* <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Allow Login On Holidays</span>
              <strong style={{ fontSize: '13px', color: employee.allowLoginOnHolidays || employee.loginOnHolidays === 'Y' ? '#167c78' : '#6a7e82' }}>
                {employee.allowLoginOnHolidays || employee.loginOnHolidays === 'Y' ? 'Yes' : 'No'}
              </strong>
            </div> */}
          </div>
        </div>

        {/* SECTION 4: Session and Login Settings */}
        <div className="form-card" style={{ marginBottom: 0 }}>
          <div className="form-card-title">
            <Clock size={18} color="#167c78" />
            <span>Session and Login Settings</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {/* Hidden as requested:
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Idle Timeout In (Secs)</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>
                {employee.idleTimeout || employee.inactiveSessionTimeout || 900} seconds
              </strong>
            </div>
            */}

            {/* Hidden as requested:
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>No. of Bad Login Attempts</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>
                {employee.badLogins ?? 3} allowed
              </strong>
            </div>
            */}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f4' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Permitted Login Time</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>
                {employee.loginTime || '09:00 AM'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#6a7e82' }}>Permitted LogOut Time</span>
              <strong style={{ fontSize: '13px', color: '#173e46' }}>
                {employee.logoutTime || '06:00 PM'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Back Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '28px', marginBottom: '40px' }}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push('/user_management')}
          aria-label="Back to User Management"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 20px' }}
        >
          <ArrowLeft size={16} />
        </button>
      </div>
    </AppShell>
  );
}
