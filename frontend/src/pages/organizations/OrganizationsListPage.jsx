import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Layers,
  Mail,
  KeyRound,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { crmApi } from '../../services/crmApi';

const INDIAN_STATES = [
  { code: '27', name: 'Maharashtra' },
  { code: '07', name: 'Delhi' },
  { code: '24', name: 'Gujarat' },
  { code: '29', name: 'Karnataka' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '08', name: 'Rajasthan' },
  { code: '06', name: 'Haryana' },
  { code: '36', name: 'Telangana' },
  { code: '19', name: 'West Bengal' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '32', name: 'Kerala' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '10', name: 'Bihar' },
  { code: '21', name: 'Odisha' },
  { code: '18', name: 'Assam' },
  { code: '20', name: 'Jharkhand' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '30', name: 'Goa' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '04', name: 'Chandigarh' },
  { code: '01', name: 'Jammu & Kashmir' },
];

function TenantIdBadge({ id }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Unique Tenant ID copied to clipboard');
  };

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span
        className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200/80 max-w-[210px] truncate select-all cursor-pointer transition-colors"
        title={`Unique Workspace ID: ${id} (Click copy icon)`}
        onClick={handleCopy}
      >
        {id}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy Unique Tenant ID"
        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function OrganizationsListPage() {
  const [plans, setPlans] = useState([]);

  // CRM Companies state
  const [crmCompanies, setCrmCompanies] = useState([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  // Password management modal for CRM company
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedCompanyForPassword, setSelectedCompanyForPassword] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Delete CRM Company state
  const [confirmCrmDeleteOpen, setConfirmCrmDeleteOpen] = useState(false);
  const [selectedCrmCompanyToDelete, setSelectedCrmCompanyToDelete] = useState(null);

  // Create CRM Company Modal
  const [createCrmCompanyModalOpen, setCreateCrmCompanyModalOpen] = useState(false);
  const [showCrmPassword, setShowCrmPassword] = useState(false);
  const [newCrmCompanyForm, setNewCrmCompanyForm] = useState({
    name: '',
    email: '',
    password: '',
    planId: 2,
    phone: '',
    address: '',
    state: 'Maharashtra',
    stateCode: '27',
    financialYearStart: '2026-04-01',
    gstin: '',
    pan: '',
    website: ''
  });
  const [crmActionLoading, setCrmActionLoading] = useState(false);

  // Email OTP verification state for CRM Company creation
  const [crmCompanyEmailVerified, setCrmCompanyEmailVerified] = useState(false);
  const [crmCompanyOtpSent, setCrmCompanyOtpSent] = useState(false);
  const [crmCompanyOtpCode, setCrmCompanyOtpCode] = useState('');
  const [crmCompanyOtpLoading, setCrmCompanyOtpLoading] = useState(false);

  const toast = useToast();

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setPlans(res.data);
        const defaultPlan = res.data.find(p => p.is_popular) || res.data[0];
        setNewCrmCompanyForm(prev => {
          const exists = res.data.some(p => p.id === prev.planId);
          return exists ? prev : { ...prev, planId: defaultPlan.id };
        });
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const fetchCrmCompanies = async () => {
    setCrmLoading(true);
    try {
      const res = await crmApi.getCompanies();
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || res.data.companies || []);
        setCrmCompanies(list);
      }
    } catch (err) {
      console.error('Failed to load CRM companies', err);
    } finally {
      setCrmLoading(false);
    }
  };

  useEffect(() => {
    fetchCrmCompanies();
    fetchPlans();
  }, []);

  const handleSendCrmCompanyOtp = async () => {
    if (!newCrmCompanyForm.email || !newCrmCompanyForm.email.includes('@')) {
      toast.error('Please enter a valid company contact email first.');
      return;
    }
    setCrmCompanyOtpLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', {
        email: newCrmCompanyForm.email,
        purpose: 'CRM_COMPANY',
        name: newCrmCompanyForm.name || 'CRM Company'
      });
      if (res.success) {
        setCrmCompanyOtpSent(true);
        if (res.data?.otp) {
          setCrmCompanyOtpCode(res.data.otp);
        }
        toast.success(res.message || 'Verification OTP sent to company contact email.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setCrmCompanyOtpLoading(false);
    }
  };

  const handleVerifyCrmCompanyOtp = async () => {
    if (!crmCompanyOtpCode || crmCompanyOtpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setCrmCompanyOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: newCrmCompanyForm.email,
        otp: crmCompanyOtpCode,
        purpose: 'CRM_COMPANY'
      });
      if (res.success) {
        setCrmCompanyEmailVerified(true);
        toast.success('Company contact email successfully verified with OTP!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setCrmCompanyOtpLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForPassword) return;
    if (!newAdminPassword || newAdminPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    setResetPasswordLoading(true);
    try {
      const res = await crmApi.resetCompanyPassword(selectedCompanyForPassword.id, {
        password: newAdminPassword.trim()
      });
      if (res.success) {
        toast.success(res.message || 'Password updated and synced to NexFlow CRM!');
        setResetPasswordModalOpen(false);
        setNewAdminPassword('');
        setSelectedCompanyForPassword(null);
        fetchCrmCompanies();
      } else {
        toast.error(res.message || 'Failed to update password');
      }
    } catch (err) {
      toast.error(err.message || 'Error updating password');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleDeleteCrmCompany = async () => {
    if (!selectedCrmCompanyToDelete) return;
    setCrmActionLoading(true);
    try {
      const res = await api.delete(`/crm/companies/${selectedCrmCompanyToDelete.id}`);
      if (res.success) {
        toast.success(`CRM Company '${selectedCrmCompanyToDelete.name}' deleted.`);
        setConfirmCrmDeleteOpen(false);
        setSelectedCrmCompanyToDelete(null);
        fetchCrmCompanies();
      } else {
        toast.error(res.message || 'Failed to delete company');
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting company');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const handleCreateCrmCompany = async (e) => {
    e.preventDefault();
    if (!newCrmCompanyForm.name?.trim()) {
      toast.error('Please enter Company Name');
      return;
    }
    if (newCrmCompanyForm.email && !crmCompanyEmailVerified) {
      toast.error('Please verify company contact email with OTP before provisioning.');
      return;
    }
    if (!newCrmCompanyForm.password || newCrmCompanyForm.password.trim().length < 6) {
      toast.error('Please set a Company Admin Password of at least 6 characters.');
      return;
    }
    if (newCrmCompanyForm.phone && newCrmCompanyForm.phone.length !== 10) {
      toast.error('Company contact phone number must be exactly 10 digits.');
      return;
    }
    if (!newCrmCompanyForm.stateCode) {
      toast.error('Please select State');
      return;
    }
    if (!newCrmCompanyForm.financialYearStart) {
      toast.error('Please select Financial Year Start');
      return;
    }
    setCrmActionLoading(true);
    try {
      const res = await crmApi.createCompany(newCrmCompanyForm);
      if (res.success) {
        toast.success(`CRM Company '${newCrmCompanyForm.name}' created! Login access configured.`);
        setCreateCrmCompanyModalOpen(false);
        setNewCrmCompanyForm({
          name: '',
          email: '',
          password: '',
          planId: plans.find(p => p.is_popular)?.id || (plans[0]?.id || 2),
          phone: '',
          address: '',
          state: 'Maharashtra',
          stateCode: '27',
          financialYearStart: '2026-04-01',
          gstin: '',
          pan: '',
          website: ''
        });
        setCrmCompanyEmailVerified(false);
        setCrmCompanyOtpSent(false);
        setCrmCompanyOtpCode('');
        fetchCrmCompanies();
      } else {
        toast.error(res.message || 'Failed to create CRM company');
      }
    } catch (err) {
      toast.error(err.message || 'Error creating CRM company');
    } finally {
      setCrmActionLoading(false);
    }
  };

  const filteredCrmCompanies = crmCompanies.filter((c) => {
    const q = crmSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.domain && c.domain.toLowerCase().includes(q))
    );
  });

  const crmColumns = [
    {
      key: 'name',
      label: 'CRM Company & Tenant ID',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0">
            {row.name ? row.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-sm block">{row.name}</span>
            <TenantIdBadge id={row.id} />
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact Info',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="text-slate-800 font-medium">{row.email || 'No email registered'}</span>
          <span className="text-slate-500">{row.phone || 'No phone recorded'}</span>
        </div>
      )
    },
    {
      key: 'plan',
      label: 'Sold Subscription Plan',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>{row.plan_name || 'Standard'}</span>
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{row.status || 'ACTIVE'}</span>
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (row) => (
        <span className="text-xs text-slate-500 font-normal">
          {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setSelectedCompanyForPassword(row);
              setNewAdminPassword('');
              setResetPasswordModalOpen(true);
            }}
            title="Set / Reset CRM Login Password"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span>CRM Password</span>
          </button>
          <PermissionGuard permission="organizations.delete">
            <button
              onClick={() => {
                setSelectedCrmCompanyToDelete(row);
                setConfirmCrmDeleteOpen(true);
              }}
              title="Delete CRM Company"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 stroke-[2]" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-600 stroke-[2]" />
            <span>CRM Companies & Workspaces</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
            Client companies using NexFlow CRM, assigned subscription plans, and login access management.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchCrmCompanies}
            disabled={crmLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${crmLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <PermissionGuard permission="organizations.create">
            <button
              onClick={() => {
                fetchPlans();
                setCreateCrmCompanyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>New CRM Company</span>
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* CRM Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            value={crmSearch}
            onChange={(e) => setCrmSearch(e.target.value)}
            placeholder="Search CRM companies by name, email, phone or plan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Companies: <strong className="text-indigo-700 font-bold">{filteredCrmCompanies.length}</strong>
          </span>
        </div>
      </div>

      {/* CRM Companies Table */}
      <DataTable
        columns={crmColumns}
        data={filteredCrmCompanies}
        isLoading={crmLoading}
        emptyMessage="No CRM companies registered yet. Click 'New CRM Company' to provision a company."
      />

      {/* CREATE CRM COMPANY MODAL */}
      <Modal
        isOpen={createCrmCompanyModalOpen}
        onClose={() => setCreateCrmCompanyModalOpen(false)}
        title="Create New CRM Company"
        subtitle="Provision a company workspace directly into NexFlow CRM."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCrmCompany} className="space-y-3.5">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0 stroke-[2.2]" />
            <div className="text-xs text-indigo-950 font-medium leading-relaxed">
              <span className="font-bold block text-indigo-900">Dedicated Tenant Isolation:</span>
              Nayi company create hone par ise ek <strong>Unique Tenant ID (UUID)</strong> assign hogi. Is company ke saare CRM Leads, Customers, Quotes aur Data is ID ke under isolate rahenge aur koi dusri company ise access nahi kar payegi.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCrmCompanyForm.name}
              onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, name: e.target.value })}
              placeholder="e.g. Reliance Retail / Digi Solutions"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
            />
          </div>

          {/* Plan Sold to Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subscription Plan (Sold to Company) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={newCrmCompanyForm.planId}
                onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, planId: parseInt(e.target.value) })}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 appearance-none cursor-pointer"
              >
                {plans && plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{parseFloat(p.price_monthly || p.price || 0).toLocaleString()}/mo • Up to {p.max_users || 'Unlimited'} Users
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Starter Plan — ₹29/mo (5 Users)</option>
                    <option value={2}>Pro Business Plan — ₹79/mo (25 Users)</option>
                    <option value={3}>Enterprise Tier — ₹199/mo (Unlimited Users)</option>
                  </>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Select which plan is being sold to this company. This assigns their CRM quotas, user limits, and features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State & State Code <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={newCrmCompanyForm.stateCode}
                onChange={(e) => {
                  const selected = INDIAN_STATES.find(s => s.code === e.target.value);
                  setNewCrmCompanyForm({
                    ...newCrmCompanyForm,
                    stateCode: e.target.value,
                    state: selected ? selected.name : ''
                  });
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Financial Year Start <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newCrmCompanyForm.financialYearStart}
                onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, financialYearStart: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Company Contact Email <span className="text-rose-500">*</span>
              </label>
              {crmCompanyEmailVerified ? (
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  required
                  disabled={crmCompanyEmailVerified}
                  value={newCrmCompanyForm.email}
                  onChange={(e) => {
                    setNewCrmCompanyForm({ ...newCrmCompanyForm, email: e.target.value });
                    setCrmCompanyEmailVerified(false);
                    setCrmCompanyOtpSent(false);
                    setCrmCompanyOtpCode('');
                  }}
                  placeholder="e.g. contact@digisolutions.com"
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    crmCompanyEmailVerified
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600'
                  }`}
                />
              </div>

              {!crmCompanyEmailVerified ? (
                <button
                  type="button"
                  onClick={handleSendCrmCompanyOtp}
                  disabled={crmCompanyOtpLoading || !newCrmCompanyForm.email}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  {crmCompanyOtpLoading ? 'Sending...' : (crmCompanyOtpSent ? 'Resend' : 'Send OTP')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCrmCompanyEmailVerified(false);
                    setCrmCompanyOtpSent(false);
                    setCrmCompanyOtpCode('');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            {/* OTP Code Box */}
            {crmCompanyOtpSent && !crmCompanyEmailVerified && (
              <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">Enter 6-Digit OTP</span>
                  <span className="text-[11px] text-indigo-600">Sent to {newCrmCompanyForm.email}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={crmCompanyOtpCode}
                    onChange={(e) => setCrmCompanyOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-center text-xs font-black tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCrmCompanyOtp}
                    disabled={crmCompanyOtpLoading || crmCompanyOtpCode.length < 6}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {crmCompanyOtpLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Company Admin Login Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Set Company Admin Password (For CRM Login) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showCrmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newCrmCompanyForm.password}
                onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, password: e.target.value })}
                placeholder="Set password (min. 6 characters, e.g. Pass@2026)"
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCrmPassword(!showCrmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showCrmPassword ? 'Hide password' : 'Show password'}
              >
                {showCrmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline shrink-0" />
              <span>The company will use this password & contact email to log in and manage their isolated CRM workspace.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={newCrmCompanyForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewCrmCompanyForm({ ...newCrmCompanyForm, phone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
              {newCrmCompanyForm.phone && newCrmCompanyForm.phone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                  Must be exactly 10 digits ({newCrmCompanyForm.phone.length}/10)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={15}
                value={newCrmCompanyForm.gstin}
                onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={newCrmCompanyForm.pan}
                onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, pan: e.target.value.toUpperCase() })}
                placeholder="e.g. AAAAA0000A"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Headquarters Address
            </label>
            <input
              type="text"
              value={newCrmCompanyForm.address}
              onChange={(e) => setNewCrmCompanyForm({ ...newCrmCompanyForm, address: e.target.value })}
              placeholder="e.g. Bandra Kurla Complex, Mumbai, Maharashtra"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateCrmCompanyModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={crmActionLoading || (newCrmCompanyForm.email && !crmCompanyEmailVerified)}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                !newCrmCompanyForm.email || crmCompanyEmailVerified
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {crmActionLoading ? 'Creating Workspace...' : (!newCrmCompanyForm.email || crmCompanyEmailVerified ? 'Provision CRM Company' : 'Verify Email with OTP to Proceed')}
            </button>
          </div>
        </form>
      </Modal>

      {/* SET / RESET CRM PASSWORD MODAL */}
      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setSelectedCompanyForPassword(null);
          setNewAdminPassword('');
        }}
        title="Manage CRM Login Access"
        subtitle={selectedCompanyForPassword ? `Set or update login password for '${selectedCompanyForPassword.name}' in NexFlow CRM.` : 'Set CRM Password'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Company:</span>
              <span className="text-slate-900 font-bold">{selectedCompanyForPassword?.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">CRM Login Email:</span>
              <span className="text-indigo-700 font-bold font-mono">{selectedCompanyForPassword?.email || 'No email registered'}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Sold Plan:</span>
              <span className="text-emerald-700 font-bold">{selectedCompanyForPassword?.plan_name || 'Standard Plan'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password for NexFlow CRM Login <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showNewAdminPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline shrink-0" />
              <span>This password will be immediately updated and synchronized into NexFlow CRM.</span>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setSelectedCompanyForPassword(null);
                setNewAdminPassword('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetPasswordLoading || !newAdminPassword || newAdminPassword.length < 6}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {resetPasswordLoading ? 'Syncing to CRM...' : 'Update & Sync to CRM'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CRM COMPANY CONFIRM */}
      <ConfirmDialog
        isOpen={confirmCrmDeleteOpen}
        onClose={() => {
          setConfirmCrmDeleteOpen(false);
          setSelectedCrmCompanyToDelete(null);
        }}
        onConfirm={handleDeleteCrmCompany}
        title="Delete CRM Company"
        message={`Are you sure you want to delete CRM Company '${selectedCrmCompanyToDelete?.name}'? This will remove their workspace and login access.`}
        confirmText={crmActionLoading ? 'Deleting...' : 'Delete Company'}
        type="danger"
      />
    </div>
  );
}
