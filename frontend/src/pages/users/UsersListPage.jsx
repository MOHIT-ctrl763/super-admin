import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  Search,
  Filter,
  Key,
  Shield,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Lock,
  Network,
  Briefcase,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserCheck,
  CreditCard,
  LifeBuoy,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { crmApi } from '../../services/crmApi';

export const SAAS_PLATFORM_ROLES = [
  { id: 'SUPER_ADMIN', name: 'SUPER_ADMIN', display_name: 'Super Admin (Full Unrestricted Access)' },
  { id: 'FINANCE_ROLE', name: 'FINANCE_ROLE', display_name: 'Finance Role (Billing, Payments & Invoices)' },
  { id: 'SUPPORT_ROLE', name: 'SUPPORT_ROLE', display_name: 'Support Role (Client Assistance & Helpdesk)' },
  { id: 'SALES_ROLE', name: 'SALES_ROLE', display_name: 'Sales Role (Onboarding, Plans & Subscriptions)' }
];

export const TENANT_ORG_ROLES = [
  { id: 'ORG_ADMIN', name: 'ORG_ADMIN', display_name: 'Organization Admin' },
  { id: 'ORG_MEMBER', name: 'ORG_MEMBER', display_name: 'Organization Member' }
];

export function UsersListPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(SAAS_PLATFORM_ROLES);
  const [allRbacRoles, setAllRbacRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Dual directory tab state: 'SAAS' or 'CRM'
  const [activeTab, setActiveTab] = useState('SAAS');
  const [crmUsers, setCrmUsers] = useState([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmBranchFilter, setCrmBranchFilter] = useState('ALL');
  const [crmStatusFilter, setCrmStatusFilter] = useState('ALL');
  const [crmBranches, setCrmBranches] = useState([]);
  const [crmPositions, setCrmPositions] = useState([]);

  // CRM Modals state
  const [crmCreateModalOpen, setCrmCreateModalOpen] = useState(false);
  const [crmEditModalOpen, setCrmEditModalOpen] = useState(false);
  const [crmInspectModalOpen, setCrmInspectModalOpen] = useState(false);
  const [crmDeleteModalOpen, setCrmDeleteModalOpen] = useState(false);
  const [selectedCrmUser, setSelectedCrmUser] = useState(null);
  const [crmActionLoading, setCrmActionLoading] = useState(false);

  const [crmForm, setCrmForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    branch_id: '',
    position_id: '',
    role: 'SALES_REP'
  });

  // SaaS Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignRolesModalOpen, setAssignRolesModalOpen] = useState(false);
  const [viewPermsModalOpen, setViewPermsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Email OTP verification state for user creation
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Email OTP verification state for CRM staff member creation
  const [crmStaffEmailVerified, setCrmStaffEmailVerified] = useState(false);
  const [crmStaffOtpSent, setCrmStaffOtpSent] = useState(false);
  const [crmStaffOtpCode, setCrmStaffOtpCode] = useState('');
  const [crmStaffOtpLoading, setCrmStaffOtpLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleName: 'ORG_ADMIN',
    organizationId: ''
  });

  const toast = useToast();

  const handleSendCrmStaffOtp = async () => {
    if (!crmForm.email || !crmForm.email.includes('@')) {
      toast.error('Please enter a valid work email address first.');
      return;
    }
    setCrmStaffOtpLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', {
        email: crmForm.email,
        purpose: 'CRM_MEMBER',
        name: crmForm.name || 'CRM Staff Member'
      });
      if (res.success) {
        setCrmStaffOtpSent(true);
        if (res.data?.otp) {
          setCrmStaffOtpCode(res.data.otp);
        }
        toast.success(res.message || 'Verification OTP sent to work email.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setCrmStaffOtpLoading(false);
    }
  };

  const handleVerifyCrmStaffOtp = async () => {
    if (!crmStaffOtpCode || crmStaffOtpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setCrmStaffOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: crmForm.email,
        otp: crmStaffOtpCode,
        purpose: 'CRM_MEMBER'
      });
      if (res.success) {
        setCrmStaffEmailVerified(true);
        toast.success('Work email successfully verified with OTP!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setCrmStaffOtpLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!form.email || !form.email.includes('@')) {
      toast.error('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', {
        email: form.email,
        purpose: 'NEW_USER',
        name: form.name || 'New User'
      });
      if (res.success) {
        setOtpSent(true);
        if (res.data?.otp) {
          setOtpCode(res.data.otp);
        }
        toast.success(res.message || 'Verification OTP sent to email inbox. Please check your email.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: form.email,
        otp: otpCode,
        purpose: 'NEW_USER'
      });
      if (res.success) {
        setEmailVerified(true);
        toast.success('Email successfully verified with OTP!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [orgsRes, rolesRes] = await Promise.all([
        api.get('/organizations', { limit: 100 }),
        api.get('/roles').catch(() => ({ success: false }))
      ]);
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data.items || []);
      }
      if (rolesRes && rolesRes.success && rolesRes.data) {
        setAllRbacRoles(rolesRes.data || []);
      }
    } catch (e) {
      console.error('Failed to pre-fetch organizations or roles', e);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const handleOpenAssignRoles = (user) => {
    setSelectedUser(user);
    const existingIds = Array.isArray(user.roles) ? user.roles.map((r) => r.id) : (user.roleIds || []);
    setSelectedRoleIds(existingIds);
    setAssignRolesModalOpen(true);
  };

  const handleToggleRoleId = (id) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const handleSaveAssignRoles = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.post('/roles/assign-user', {
        userId: selectedUser.id,
        roleIds: selectedRoleIds
      });
      if (res.success) {
        toast.success(`Assigned roles updated for ${selectedUser.name}`);
        setAssignRolesModalOpen(false);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user roles');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenViewPerms = (user) => {
    setSelectedUser(user);
    setViewPermsModalOpen(true);
  };

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/users', {
        page,
        limit: 10,
        search,
        organizationId: orgFilter,
        roleId: roleFilter,
        status: statusFilter === 'ACTIVE' ? 'active' : (statusFilter === 'INACTIVE' ? 'inactive' : '')
      });
      if (res.success && res.data) {
        setUsers(res.data.items);
        setPagination(res.data.pagination);
        if (res.data.filterOptions) {
          if (res.data.filterOptions.roles?.length) setRoles(res.data.filterOptions.roles);
          if (res.data.filterOptions.organizations?.length) setOrganizations(res.data.filterOptions.organizations);
        }
      }
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [search, orgFilter, roleFilter, statusFilter]);

  const fetchCrmData = async () => {
    setCrmLoading(true);
    try {
      const [usersRes, branchesRes, positionsRes] = await Promise.all([
        crmApi.getUsers().catch(() => ({ success: false, data: [] })),
        crmApi.getBranches().catch(() => ({ success: false, data: [] })),
        crmApi.getPositions().catch(() => ({ success: false, data: [] }))
      ]);

      if (usersRes?.success && usersRes?.data) {
        const list = Array.isArray(usersRes.data)
          ? usersRes.data
          : (usersRes.data.items || usersRes.data.users || []);
        setCrmUsers(list);
      }
      if (branchesRes?.success && branchesRes?.data) {
        const blist = Array.isArray(branchesRes.data)
          ? branchesRes.data
          : (branchesRes.data.items || branchesRes.data.branches || []);
        setCrmBranches(blist);
      }
      if (positionsRes?.success && positionsRes?.data) {
        const plist = Array.isArray(positionsRes.data)
          ? positionsRes.data
          : (positionsRes.data.items || positionsRes.data.positions || []);
        setCrmPositions(plist);
      }
    } catch (err) {
      console.error('Failed to load CRM data', err);
    } finally {
      setCrmLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CRM' && crmUsers.length === 0) {
      fetchCrmData();
    }
  }, [activeTab]);

  const handleToggleCrmStatus = async (crmUser) => {
    const nextStatus = !crmUser.is_active;
    setCrmUsers(prev => prev.map(u => u.id === crmUser.id ? { ...u, is_active: nextStatus } : u));
    try {
      const res = await crmApi.toggleUserStatus(crmUser.id, nextStatus);
      if (res.success) {
        toast.success(`User '${crmUser.name || crmUser.email}' ${nextStatus ? 'activated' : 'deactivated'}.`);
      } else {
        setCrmUsers(prev => prev.map(u => u.id === crmUser.id ? { ...u, is_active: crmUser.is_active } : u));
        toast.error(res.message || 'Failed to toggle status in CRM');
      }
    } catch (err) {
      setCrmUsers(prev => prev.map(u => u.id === crmUser.id ? { ...u, is_active: crmUser.is_active } : u));
      toast.error(err.message || 'Error updating status in CRM');
    }
  };

  const handleOpenCrmEdit = (user) => {
    setSelectedCrmUser(user);
    setCrmForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      branch_id: user.branch_id || '',
      position_id: user.position_id || '',
      role: user.role || 'SALES_REP'
    });
    setCrmEditModalOpen(true);
  };

  const handleSaveCrmCreate = async (e) => {
    e.preventDefault();
    if (!crmStaffEmailVerified) {
      toast.error('Please verify work email with OTP before provisioning.');
      return;
    }
    if (crmForm.phone && crmForm.phone.length !== 10) {
      toast.error('Staff phone number must be exactly 10 digits.');
      return;
    }
    setCrmActionLoading(true);
    try {
      const res = await crmApi.createUser({
        name: crmForm.name,
        email: crmForm.email,
        phone: crmForm.phone,
        password: crmForm.password || 'Temporary@123',
        branch_id: crmForm.branch_id || undefined,
        position_id: crmForm.position_id || undefined,
        role: crmForm.role || 'SALES_REP'
      });
      if (res.success) {
        toast.success(`CRM Staff Member '${crmForm.name}' created!`);
        setCrmCreateModalOpen(false);
        setCrmForm({ name: '', email: '', phone: '', password: '', branch_id: '', position_id: '', role: 'SALES_REP' });
        setCrmStaffEmailVerified(false);
        setCrmStaffOtpSent(false);
        setCrmStaffOtpCode('');
        fetchCrmData();
      } else {
        toast.error(res.message || 'Failed to create CRM user');
      }
    } catch (err) {
      toast.error(err.message || 'Error creating CRM user');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const handleSaveCrmEdit = async (e) => {
    e.preventDefault();
    if (!selectedCrmUser) return;
    if (crmForm.phone && crmForm.phone.length !== 10) {
      toast.error('Staff phone number must be exactly 10 digits.');
      return;
    }
    setCrmActionLoading(true);
    try {
      const res = await crmApi.updateUser(selectedCrmUser.id, {
        name: crmForm.name,
        email: crmForm.email,
        phone: crmForm.phone,
        branch_id: crmForm.branch_id || undefined,
        position_id: crmForm.position_id || undefined,
        role: crmForm.role
      });
      if (res.success) {
        toast.success(`CRM user updated successfully.`);
        setCrmEditModalOpen(false);
        fetchCrmData();
      } else {
        toast.error(res.message || 'Failed to update CRM user');
      }
    } catch (err) {
      toast.error(err.message || 'Error updating CRM user');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const handleConfirmDeleteCrmUser = async () => {
    if (!selectedCrmUser) return;
    setCrmActionLoading(true);
    try {
      const res = await crmApi.deleteUser(selectedCrmUser.id);
      if (res.success) {
        toast.success('CRM user account deleted.');
        setCrmDeleteModalOpen(false);
        fetchCrmData();
      } else {
        toast.error(res.message || 'Failed to delete CRM user');
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting CRM user');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!emailVerified) {
      toast.error('Please verify the user email with OTP before provisioning.');
      return;
    }
    if (form.phone && form.phone.length !== 10) {
      toast.error('Contact phone number must be exactly 10 digits.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/users', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        roleName: form.roleName,
        organizationId: form.organizationId ? parseInt(form.organizationId, 10) : null
      });
      if (res.success) {
        toast.success(`User '${res.data?.name || form.name}' created successfully.`);
        setCreateModalOpen(false);
        setForm({ name: '', email: '', phone: '', password: '', roleName: 'ORG_ADMIN', organizationId: '' });
        setEmailVerified(false);
        setOtpSent(false);
        setOtpCode('');
        fetchUsers(1);
        fetchFilterOptions();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}`, {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        roleName: selectedUser.role_name,
        organizationId: selectedUser.organization_id ? parseInt(selectedUser.organization_id, 10) : null,
        isActive: selectedUser.is_active
      });
      if (res.success) {
        toast.success('User updated successfully.');
        setEditModalOpen(false);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, {
        newPassword
      });
      if (res.success) {
        toast.success(`Password updated for ${selectedUser.name}.`);
        setResetModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await api.patch(`/users/${user.id}/toggle-status`);
      if (res.success) {
        toast.success(`User ${res.data.isActive ? 'activated' : 'deactivated'}.`);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/users/${selectedUser.id}`);
      if (res.success) {
        toast.success(`User deleted successfully.`);
        setDeleteModalOpen(false);
        setSelectedUser(null);
        fetchUsers(1);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 text-sm">{row.name}</span>
          <span className="text-xs font-normal text-slate-500">{row.email}</span>
        </div>
      )
    },
    {
      key: 'organization_name',
      label: 'Organization',
      render: (row) => (
        row.organization_name ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-600 stroke-[2]" />
            <span>{row.organization_name}</span>
          </span>
        ) : (
          <span className="text-xs text-purple-700 font-medium italic">● SaaS Platform (Platform Admin)</span>
        )
      )
    },
    {
      key: 'roles',
      label: 'Assigned Roles & Scope',
      render: (row) => {
        const hasRoles = Array.isArray(row.roles) && row.roles.length > 0;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {hasRoles ? (
                row.roles.map((r) => {
                  const slug = (r.slug || '').toLowerCase();
                  let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
                  let icon = <Shield className="w-3 h-3 text-slate-600" />;

                  if (slug === 'super_admin') {
                    badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                    icon = <ShieldCheck className="w-3 h-3 text-purple-600" />;
                  } else if (slug === 'finance_role' || slug === 'finance_admin') {
                    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    icon = <CreditCard className="w-3 h-3 text-emerald-600" />;
                  } else if (slug === 'support_role' || slug === 'support_admin') {
                    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                    icon = <LifeBuoy className="w-3 h-3 text-amber-600" />;
                  } else if (slug === 'sales_role' || slug === 'sales_admin') {
                    badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';
                    icon = <Sparkles className="w-3 h-3 text-blue-600" />;
                  } else if (r.is_system) {
                    badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                    icon = <Shield className="w-3 h-3 text-indigo-600" />;
                  }

                  return (
                    <span
                      key={r.id || r.slug}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}
                    >
                      {icon}
                      {r.name}
                    </span>
                  );
                })
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                  {row.role_display_name || row.role_name}
                </span>
              )}
            </div>
            {row.permissionCount && (
              <span className="text-[10px] font-bold text-slate-500 block">
                {row.permissionCount === 'All (*)' ? 'Full Access (*)' : `${row.permissionCount} permissions`}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'ACTIVE' : 'DEACTIVATED'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* View Effective Permissions */}
          <button
            onClick={() => handleOpenViewPerms(row)}
            title="View Effective Permissions"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Eye className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Assign Roles */}
          <PermissionGuard permission="roles.assign">
            <button
              onClick={() => handleOpenAssignRoles(row)}
              title="Assign / Modify Roles"
              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Edit User */}
          <PermissionGuard permission="users.update">
            <button
              onClick={() => {
                setSelectedUser({ ...row });
                setEditModalOpen(true);
              }}
              title="Edit User"
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Reset Password */}
          <PermissionGuard permission="users.update">
            <button
              onClick={() => {
                setSelectedUser(row);
                setResetModalOpen(true);
              }}
              title="Reset Password"
              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Key className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Toggle Active */}
          <PermissionGuard permission="users.suspend">
            <button
              onClick={() => handleToggleStatus(row)}
              title={row.is_active ? 'Deactivate User' : 'Activate User'}
              className={`p-1.5 rounded-lg transition-colors ${
                row.is_active
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {row.is_active ? <XCircle className="w-4 h-4 stroke-[2.2]" /> : <CheckCircle className="w-4 h-4 stroke-[2.2]" />}
            </button>
          </PermissionGuard>

          {/* Delete User */}
          <PermissionGuard permission="users.delete">
            <button
              onClick={() => {
                setSelectedUser(row);
                setDeleteModalOpen(true);
              }}
              title="Delete User"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  const filteredCrmUsers = crmUsers.filter((u) => {
    const q = crmSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.role_title && u.role_title.toLowerCase().includes(q));

    const matchesBranch = crmBranchFilter === 'ALL' ||
      String(u.branch_id) === String(crmBranchFilter) ||
      (u.branch_name && u.branch_name === crmBranchFilter);

    const matchesStatus = crmStatusFilter === 'ALL' ||
      (crmStatusFilter === 'ACTIVE' ? u.is_active : !u.is_active);

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const crmColumns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
            {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block text-sm">{row.name || 'CRM User'}</span>
            <span className="text-xs text-slate-500 font-normal">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-xs text-slate-700 font-mono">
          {row.phone || '—'}
        </span>
      )
    },
    {
      key: 'role',
      label: 'Role & Position',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
            <Briefcase className="w-3 h-3 text-indigo-500" />
            {row.role_title || row.designation || row.role || 'Sales Rep'}
          </span>
          {row.position_name && (
            <span className="text-[10px] text-slate-400 font-medium">{row.position_name}</span>
          )}
        </div>
      )
    },
    {
      key: 'branch',
      label: 'Branch Location',
      render: (row) => {
        const branchName = row.branch_name || (crmBranches.find(b => String(b.id) === String(row.branch_id))?.name) || 'Headquarters';
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {branchName}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <button
          onClick={() => handleToggleCrmStatus(row)}
          title={`Click to ${row.is_active ? 'deactivate' : 'activate'}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
            row.is_active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${row.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{row.is_active ? 'Active' : 'Inactive'}</span>
        </button>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedCrmUser(row);
              setCrmInspectModalOpen(true);
            }}
            title="Inspect CRM Profile"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Eye className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => handleOpenCrmEdit(row)}
            title="Edit CRM Staff Member"
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => {
              setSelectedCrmUser(row);
              setCrmDeleteModalOpen(true);
            }}
            title="Delete CRM Staff Member"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>User & Staff Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Centrally manage platform administrators, tenant organization owners, and live CRM company staff.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {activeTab === 'SAAS' ? (
            <PermissionGuard permission="users.create">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Add SaaS User</span>
              </button>
            </PermissionGuard>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={fetchCrmData}
                disabled={crmLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${crmLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>Sync CRM</span>
              </button>
              <button
                onClick={() => {
                  setCrmForm({ name: '', email: '', phone: '', password: '', branch_id: '', position_id: '', role: 'SALES_REP' });
                  setCrmCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Add CRM Staff Member</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Directory Tab Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('SAAS')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'SAAS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>SaaS Platform Users</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'SAAS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
            {pagination.total || users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CRM')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'CRM'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-600" />
          <span>CRM Company Staff & Users Directory</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'CRM' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            {crmUsers.length || 'Live'}
          </span>
        </button>
      </div>

      {activeTab === 'SAAS' ? (
        <>
          {/* Filter and Search Bar for SaaS */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name, email or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Org Filter */}
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Organizations</option>
                <option value="PLATFORM">Platform Only (No Org)</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* SaaS Users Table */}
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            emptyMessage="No users matching current filters"
            pagination={pagination}
            onPageChange={(p) => fetchUsers(p)}
          />
        </>
      ) : (
        <>
          {/* Filter and Search Bar for CRM */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
              <input
                type="text"
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="Search CRM staff by name, email or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Filter */}
              <select
                value={crmBranchFilter}
                onChange={(e) => setCrmBranchFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500"
              >
                <option value="ALL">All CRM Branches</option>
                {crmBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={crmStatusFilter}
                onChange={(e) => setCrmStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* CRM Users Table */}
          <DataTable
            columns={crmColumns}
            data={filteredCrmUsers}
            isLoading={crmLoading}
            emptyMessage="No CRM company staff members found"
          />
        </>
      )}

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User"
        subtitle="Add a new member to an organization or promote platform administrators."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
          </div>

          {/* Email Address & Verification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              {emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified via OTP
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  OTP Verification Required
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  disabled={emailVerified}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setEmailVerified(false);
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  placeholder="rahul@company.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                    emailVerified
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>

              {!emailVerified ? (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={otpLoading || !form.email}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {otpLoading ? 'Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEmailVerified(false);
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-100 hover:bg-slate-200"
                >
                  Change
                </button>
              )}
            </div>

            {/* OTP Code Input Box */}
            {otpSent && !emailVerified && (
              <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Enter 6-digit code sent to <span className="underline">{form.email}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-blue-300 text-sm font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={otpLoading || otpCode.length < 6}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm disabled:opacity-50"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contact Phone (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm({ ...form, phone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
              {form.phone && form.phone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                  Must be exactly 10 digits ({form.phone.length}/10)
                </span>
              )}
            </div>
          </div>

          {/* User Scope / Type Selection */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              User Scope & Access Level <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm({
                    ...form,
                    organizationId: '',
                    roleName: 'SUPER_ADMIN'
                  });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  !form.organizationId
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                SaaS Platform Staff
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    ...form,
                    organizationId: organizations[0]?.id || '',
                    roleName: 'ORG_ADMIN'
                  });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  form.organizationId
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Tenant Company User
              </button>
            </div>
            
            {!form.organizationId ? (
              <p className="mt-2.5 text-[11px] text-blue-700 font-semibold bg-blue-50 p-2.5 rounded-lg border border-blue-200/80 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                <span>SaaS Platform Users do not belong to any client company. They log into the Super Admin console and can only view modules permitted for their specific role.</span>
              </p>
            ) : (
              <p className="mt-2.5 text-[11px] text-slate-600 font-medium bg-white p-2.5 rounded-lg border border-slate-200 flex items-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                <span>Tenant users belong to a specific company and only manage their company's CRM resources.</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.roleName}
                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {(!form.organizationId ? SAAS_PLATFORM_ROLES : TENANT_ORG_ROLES).map((r) => (
                  <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
                ))}
              </select>
            </div>

            {form.organizationId ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tenant Organization <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.organizationId}
                  onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                >
                  <option value="" disabled>Select an Organization</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization Scope</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-500 select-none">
                  None (SaaS Platform Staff)
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEmailVerified(false);
                setOtpSent(false);
                setOtpCode('');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !emailVerified}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>{actionLoading ? 'Creating User...' : 'Create User'}</span>
              {emailVerified && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      {selectedUser && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit User: ${selectedUser.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={selectedUser.name}
                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedUser.role_name || ''}
                onChange={(e) => {
                  const newRole = e.target.value;
                  const isPlatformRole = ['SUPER_ADMIN', 'FINANCE_ROLE', 'SUPPORT_ROLE', 'SALES_ROLE'].includes(newRole);
                  setSelectedUser({
                    ...selectedUser,
                    role_name: newRole,
                    organization_id: isPlatformRole ? null : (selectedUser.organization_id || (organizations[0]?.id || null))
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {(selectedUser.organization_id ? TENANT_ORG_ROLES : SAAS_PLATFORM_ROLES).map((r) => (
                  <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization Scope</label>
              {selectedUser.organization_id ? (
                <select
                  value={selectedUser.organization_id || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedUser({
                      ...selectedUser,
                      organization_id: val,
                      role_name: val
                        ? (['SUPER_ADMIN', 'FINANCE_ROLE', 'SUPPORT_ROLE', 'SALES_ROLE'].includes(selectedUser.role_name) ? 'ORG_ADMIN' : selectedUser.role_name)
                        : (['ORG_ADMIN', 'ORG_MEMBER'].includes(selectedUser.role_name) ? 'SUPER_ADMIN' : selectedUser.role_name)
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                >
                  <option value="">Switch to None (SaaS Platform Staff)</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>None (Independent SaaS Platform Staff)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser({
                        ...selectedUser,
                        organization_id: organizations[0]?.id || null,
                        role_name: 'ORG_ADMIN'
                      });
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-extrabold underline ml-2"
                  >
                    Assign to Tenant
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password: ${selectedUser?.name || ''}`}
        subtitle="Specify a new master password for this account."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || newPassword.length < 6}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          ASSIGN RBAC ROLES MODAL
         ======================================================== */}
      <Modal
        isOpen={assignRolesModalOpen}
        onClose={() => setAssignRolesModalOpen(false)}
        title={`Assign Roles: ${selectedUser?.name || ''}`}
        subtitle={`Configure internal RBAC access for ${selectedUser?.email || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveAssignRoles} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Select one or more roles to assign to this administrator. Effective permissions will be calculated automatically from all active assigned roles.
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {allRbacRoles.map((role) => {
              const isChecked = selectedRoleIds.includes(role.id);
              const isSuperAdminRole = role.slug === 'super_admin';
              const cannotAssignSa = isSuperAdminRole && !isSuperAdmin;

              return (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${cannotAssignSa ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={cannotAssignSa}
                    checked={isChecked}
                    onChange={() => !cannotAssignSa && handleToggleRoleId(role.id)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{role.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          role.is_system ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {role.is_system ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {role.description || 'No description provided'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAssignRolesModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save Role Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          VIEW EFFECTIVE PERMISSIONS MODAL
         ======================================================== */}
      <Modal
        isOpen={viewPermsModalOpen}
        onClose={() => setViewPermsModalOpen(false)}
        title={`Effective Permissions: ${selectedUser?.name || ''}`}
        subtitle={`Account: ${selectedUser?.email || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold block">Assigned Roles</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedUser?.roles && selectedUser.roles.length > 0 ? (
                  selectedUser.roles.map((r) => (
                    <span key={r.id || r.slug} className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold text-[11px]">
                      {r.name}
                    </span>
                  ))
                ) : (
                  <span className="font-bold text-slate-700">
                    {selectedUser?.role_display_name || selectedUser?.role_name || 'Standard User'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold block">Permissions Count</span>
              <span className="font-black text-indigo-600 text-sm">
                {selectedUser?.permissionCount ||
                  (Array.isArray(selectedUser?.permissions) ? selectedUser.permissions.length : 0)}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
              Authorized Capabilities
            </span>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedUser?.role_name === 'SUPER_ADMIN' ||
              (selectedUser?.roles && selectedUser.roles.some((r) => r.slug === 'super_admin')) ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Unrestricted Master Privileges (*): This account possesses all capabilities across all 17 system modules.
                  </span>
                </div>
              ) : selectedUser?.permissions && selectedUser.permissions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUser.permissions.map((code) => (
                    <div key={code} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <code className="font-mono text-slate-800 text-[11px] truncate">{code}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No explicit permissions granted to this account.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-right">
            <button
              type="button"
              onClick={() => setViewPermsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user '${selectedUser?.name}' (${selectedUser?.email})?`}
        confirmText="Delete Account"
        type="danger"
        isLoading={actionLoading}
      />

      {/* CREATE CRM USER MODAL */}
      <Modal
        isOpen={crmCreateModalOpen}
        onClose={() => setCrmCreateModalOpen(false)}
        title="Add CRM Staff Member"
        subtitle="Provision a team member into NexFlow CRM with assigned branch and position."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveCrmCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={crmForm.name}
              onChange={(e) => setCrmForm({ ...crmForm, name: e.target.value })}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Work Email <span className="text-rose-500">*</span>
              </label>
              {crmStaffEmailVerified ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Verified via OTP
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  OTP Verification Required
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  disabled={crmStaffEmailVerified}
                  value={crmForm.email}
                  onChange={(e) => {
                    setCrmForm({ ...crmForm, email: e.target.value });
                    setCrmStaffEmailVerified(false);
                    setCrmStaffOtpSent(false);
                    setCrmStaffOtpCode('');
                  }}
                  placeholder="e.g. ramesh@nexflowcrm.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                    crmStaffEmailVerified
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600'
                  }`}
                />
              </div>

              {!crmStaffEmailVerified ? (
                <button
                  type="button"
                  onClick={handleSendCrmStaffOtp}
                  disabled={crmStaffOtpLoading || !crmForm.email}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {crmStaffOtpLoading ? 'Sending...' : (crmStaffOtpSent ? 'Resend OTP' : 'Send OTP')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCrmStaffEmailVerified(false);
                    setCrmStaffOtpSent(false);
                    setCrmStaffOtpCode('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-100 hover:bg-slate-200"
                >
                  Change
                </button>
              )}
            </div>

            {/* CRM Staff OTP Code Input Box */}
            {crmStaffOtpSent && !crmStaffEmailVerified && (
              <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">Enter 6-Digit OTP Code</span>
                  <span className="text-[11px] text-indigo-600">Sent to {crmForm.email}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={crmStaffOtpCode}
                    onChange={(e) => setCrmStaffOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-indigo-300 text-center text-sm font-black tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCrmStaffOtp}
                    disabled={crmStaffOtpLoading || crmStaffOtpCode.length < 6}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm disabled:opacity-50 transition-all"
                  >
                    {crmStaffOtpLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={crmForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCrmForm({ ...crmForm, phone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
              />
              {crmForm.phone && crmForm.phone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                  Must be exactly 10 digits ({crmForm.phone.length}/10)
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                value={crmForm.password}
                onChange={(e) => setCrmForm({ ...crmForm, password: e.target.value })}
                placeholder="Default: Temporary@123"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Assignment
              </label>
              <select
                value={crmForm.branch_id}
                onChange={(e) => setCrmForm({ ...crmForm, branch_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
              >
                <option value="">-- Choose Branch --</option>
                {crmBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Position
              </label>
              <select
                value={crmForm.position_id}
                onChange={(e) => setCrmForm({ ...crmForm, position_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
              >
                <option value="">-- Choose Position --</option>
                {crmPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title || p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role Authority Level
            </label>
            <select
              value={crmForm.role}
              onChange={(e) => setCrmForm({ ...crmForm, role: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
            >
              <option value="SALES_REP">Sales Representative</option>
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="ADMIN">CRM Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCrmCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={crmActionLoading || !crmStaffEmailVerified}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                crmStaffEmailVerified
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {crmActionLoading ? 'Creating...' : (crmStaffEmailVerified ? 'Provision CRM Member' : 'Verify Email with OTP to Proceed')}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CRM USER MODAL */}
      <Modal
        isOpen={crmEditModalOpen}
        onClose={() => setCrmEditModalOpen(false)}
        title="Edit CRM Staff Member"
        subtitle={`Update account profile and hierarchy assignments for ${selectedCrmUser?.name || 'user'}.`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveCrmEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={crmForm.name}
              onChange={(e) => setCrmForm({ ...crmForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={crmForm.email}
              onChange={(e) => setCrmForm({ ...crmForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number (10 Digits)
            </label>
            <input
              type="tel"
              maxLength={10}
              value={crmForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setCrmForm({ ...crmForm, phone: val });
              }}
              placeholder="9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
            {crmForm.phone && crmForm.phone.length !== 10 && (
              <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                Must be exactly 10 digits ({crmForm.phone.length}/10)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Location
              </label>
              <select
                value={crmForm.branch_id}
                onChange={(e) => setCrmForm({ ...crmForm, branch_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
              >
                <option value="">-- No Branch --</option>
                {crmBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Position
              </label>
              <select
                value={crmForm.position_id}
                onChange={(e) => setCrmForm({ ...crmForm, position_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
              >
                <option value="">-- No Position --</option>
                {crmPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title || p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCrmEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={crmActionLoading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {crmActionLoading ? 'Saving...' : 'Update Staff Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* INSPECT CRM USER MODAL */}
      <Modal
        isOpen={crmInspectModalOpen}
        onClose={() => setCrmInspectModalOpen(false)}
        title="CRM Staff Profile & Attributes"
        subtitle={`Live database record for ${selectedCrmUser?.name || 'staff member'}.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {selectedCrmUser?.name ? selectedCrmUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{selectedCrmUser?.name}</h4>
              <p className="text-xs text-indigo-700 font-medium">{selectedCrmUser?.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${selectedCrmUser?.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {selectedCrmUser?.is_active ? 'Active CRM Member' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Phone</span>
              <span className="font-semibold text-slate-800">{selectedCrmUser?.phone || 'Not recorded'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Role</span>
              <span className="font-semibold text-indigo-700">{selectedCrmUser?.role_title || selectedCrmUser?.designation || selectedCrmUser?.role || 'Staff'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Branch ID</span>
              <span className="font-mono text-[11px] text-slate-700 truncate block">{selectedCrmUser?.branch_id || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Created At</span>
              <span className="font-medium text-slate-700">
                {selectedCrmUser?.created_at ? new Date(selectedCrmUser.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-right">
            <button
              type="button"
              onClick={() => setCrmInspectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE CRM USER MODAL */}
      <ConfirmDialog
        isOpen={crmDeleteModalOpen}
        onClose={() => setCrmDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteCrmUser}
        title="Delete CRM Staff Member"
        message={`Are you sure you want to remove '${selectedCrmUser?.name}' (${selectedCrmUser?.email}) from the CRM? This will unassign all their active leads.`}
        confirmText="Delete CRM Member"
        type="danger"
        isLoading={crmActionLoading}
      />
    </div>
  );
}
