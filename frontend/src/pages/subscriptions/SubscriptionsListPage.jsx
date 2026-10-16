import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  Ban,
  CheckCircle,
  Building2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  BarChart2,
  TrendingUp,
  UserX
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { crmApi } from '../../services/crmApi';

export function SubscriptionsListPage() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'churn'
  const [subscriptions, setSubscriptions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [additionalDays, setAdditionalDays] = useState(30);
  const [cancelReasonCategory, setCancelReasonCategory] = useState('Switched to alternative solution');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Change Plan Form State
  const [changePlanForm, setChangePlanForm] = useState({
    targetPlanId: '',
    billingCycle: 'MONTHLY',
    immediate: true
  });

  // Churn Analytics State
  const [churnAnalytics, setChurnAnalytics] = useState(null);
  const [churnLoading, setChurnLoading] = useState(false);

  // Add Subscription Form State
  const [subForm, setSubForm] = useState({
    organizationId: '',
    planId: '',
    billingCycle: 'MONTHLY',
    amount: '',
    status: 'ACTIVE',
    durationDays: 30,
    autoRenew: true,
    paymentMethod: 'DIRECT_ADMIN',
    paymentStatus: 'SUCCESS'
  });

  const toast = useToast();

  const fetchSubscriptions = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/subscriptions', {
        page,
        limit: 10,
        search,
        status: statusFilter
      });
      if (res.success && res.data) {
        setSubscriptions(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load subscriptions: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [orgsRes, plansRes, crmCompsRes] = await Promise.all([
        api.get('/organizations', { limit: 200 }),
        api.get('/plans'),
        crmApi.getCompanies().catch(() => ({ success: false, data: [] }))
      ]);

      let allOrgs = [];
      if (orgsRes.success && orgsRes.data) {
        allOrgs = [...(orgsRes.data.items || [])];
      }

      // Filter out deleted or orphaned organizations whose CRM company was deleted
      const activeCrmList = (Array.isArray(crmCompsRes.data) ? crmCompsRes.data : (crmCompsRes.data?.items || []))
        .filter(c => c.status !== 'DELETED');
      const activeCrmIds = new Set(activeCrmList.map(c => String(c.id)));

      allOrgs = allOrgs.filter(o => {
        if (o.status === 'DELETED') return false;
        if (o.crm_company_id && !activeCrmIds.has(String(o.crm_company_id))) {
          return false;
        }
        return true;
      });

      // Merge active CRM companies into organizations list
      for (const c of activeCrmList) {
        const matchIdx = allOrgs.findIndex(o => 
          (o.crm_company_id && String(o.crm_company_id) === String(c.id)) ||
          (o.name && c.name && o.name.toLowerCase() === c.name.toLowerCase()) ||
          (o.email && c.email && o.email.toLowerCase() === c.email.toLowerCase())
        );

        if (matchIdx !== -1) {
          allOrgs[matchIdx] = {
            ...allOrgs[matchIdx],
            crm_company_id: c.id,
            crm_synced: true
          };
        } else {
          allOrgs.push({
            id: c.id,
            name: c.name,
            email: c.email || '',
            phone: c.phone || '',
            plan_name: c.plan_name || 'Standard',
            status: c.status || 'ACTIVE',
            crm_company_id: c.id,
            is_crm_only: true
          });
        }
      }

      // Sort alphabetically by company name
      allOrgs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setOrganizations(allOrgs);

      if (plansRes.success && plansRes.data) {
        const plansList = Array.isArray(plansRes.data) ? plansRes.data : [];
        setPlans(plansList);
      }
    } catch (err) {
      console.error('Failed to load pre-requisites:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions(1);
    fetchPrerequisites();
  }, [search, statusFilter]);

  const handleOpenCreateModal = () => {
    fetchPrerequisites();
    const defaultOrg = organizations[0]?.id || '';
    const defaultPlan = plans.find(p => p.is_popular) || plans[0];
    const defaultPlanId = defaultPlan ? defaultPlan.id : '';
    const initialAmount = defaultPlan ? (defaultPlan.price_monthly ?? defaultPlan.monthly_price ?? 79) : 79;

    setSubForm({
      organizationId: defaultOrg,
      planId: defaultPlanId,
      billingCycle: 'MONTHLY',
      amount: initialAmount,
      status: 'ACTIVE',
      durationDays: 30,
      autoRenew: true,
      paymentMethod: 'DIRECT_ADMIN',
      paymentStatus: 'SUCCESS'
    });
    setCreateModalOpen(true);
  };

  const handleStatusChange = (newStatus) => {
    setSubForm(prev => ({
      ...prev,
      status: newStatus,
      paymentStatus: newStatus === 'TRIAL' ? 'PENDING' : (prev.paymentStatus === 'NONE' ? 'SUCCESS' : prev.paymentStatus)
    }));
  };

  // Auto calculate amount when plan or cycle changes
  const handlePlanOrCycleChange = (newPlanId, newCycle) => {
    const selectedPlanObj = plans.find(p => String(p.id) === String(newPlanId));
    let calculatedAmt = 0;
    let days = 30;

    if (selectedPlanObj) {
      if (newCycle === 'YEARLY') {
        calculatedAmt = parseFloat(selectedPlanObj.price_yearly ?? selectedPlanObj.yearly_price ?? (selectedPlanObj.price_monthly * 10) ?? 0);
        days = 365;
      } else {
        calculatedAmt = parseFloat(selectedPlanObj.price_monthly ?? selectedPlanObj.monthly_price ?? 0);
        days = 30;
      }
    }

    setSubForm(prev => ({
      ...prev,
      planId: newPlanId,
      billingCycle: newCycle,
      amount: calculatedAmt,
      durationDays: days
    }));
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!subForm.organizationId) {
      toast.error('Please select an organization.');
      return;
    }
    if (!subForm.planId) {
      toast.error('Please select a plan.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        organizationId: parseInt(subForm.organizationId, 10),
        organization_id: parseInt(subForm.organizationId, 10),
        planId: parseInt(subForm.planId, 10),
        plan_id: parseInt(subForm.planId, 10),
        billingCycle: subForm.billingCycle,
        billing_cycle: subForm.billingCycle,
        amount: parseFloat(subForm.amount || 0),
        status: subForm.status,
        durationDays: parseInt(subForm.durationDays, 10) || 30,
        auto_renew: !!subForm.autoRenew,
        paymentMethod: subForm.paymentMethod || 'DIRECT_ADMIN',
        payment_method: subForm.paymentMethod || 'DIRECT_ADMIN',
        paymentStatus: subForm.paymentStatus || (subForm.status === 'TRIAL' ? 'PENDING' : 'SUCCESS'),
        payment_status: subForm.paymentStatus || (subForm.status === 'TRIAL' ? 'PENDING' : 'SUCCESS')
      };

      const res = await api.post('/subscriptions', payload);
      if (res.success) {
        toast.success(`Subscription created successfully with amount ₹${payload.amount}.`);
        setCreateModalOpen(false);
        fetchSubscriptions(1);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${selectedSub.id}/extend`, {
        days: additionalDays
      });
      if (res.success) {
        toast.success(`Subscription extended by ${additionalDays} days.`);
        setExtendModalOpen(false);
        setSelectedSub(null);
        fetchSubscriptions(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extend subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const fullReason = cancelFeedback.trim()
        ? `${cancelReasonCategory}: ${cancelFeedback.trim()}`
        : cancelReasonCategory;
      const res = await api.post(`/subscriptions/${selectedSub.id}/cancel`, {
        reason: fullReason,
        feedback: cancelFeedback,
        immediate: cancelImmediate
      });
      if (res.success) {
        toast.success(res.message || 'Subscription status updated.');
        setCancelModalOpen(false);
        setSelectedSub(null);
        setCancelFeedback('');
        fetchSubscriptions(pagination.page);
        if (activeTab === 'churn') fetchChurnAnalytics();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChangePlan = (sub) => {
    setSelectedSub(sub);
    const otherPlan = plans.find(p => p.id !== sub.plan_id) || plans[0];
    setChangePlanForm({
      targetPlanId: otherPlan ? otherPlan.id : sub.plan_id,
      billingCycle: sub.billing_cycle || 'MONTHLY',
      immediate: true,
      paymentMethod: 'UPI',
      paymentStatus: 'SUCCESS'
    });
    setChangePlanModalOpen(true);
  };

  const handleChangePlanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSub || !changePlanForm.targetPlanId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${selectedSub.id}/change-plan`, {
        planId: parseInt(changePlanForm.targetPlanId, 10),
        billingCycle: changePlanForm.billingCycle,
        immediate: changePlanForm.immediate,
        paymentMethod: changePlanForm.paymentMethod || 'UPI',
        paymentStatus: changePlanForm.paymentStatus || 'SUCCESS'
      });
      if (res.success) {
        toast.success(res.message || 'Plan transition registered.');
        setChangePlanModalOpen(false);
        setSelectedSub(null);
        fetchSubscriptions(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchChurnAnalytics = async () => {
    setChurnLoading(true);
    try {
      const res = await api.get('/subscriptions/churn-analytics');
      if (res.success && res.data) {
        setChurnAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load churn analytics:', err);
    } finally {
      setChurnLoading(false);
    }
  };

  const handleReactivate = async (sub) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${sub.id}/reactivate`);
      if (res.success) {
        toast.success(`Subscription reactivated for ${sub.organization_name}.`);
        fetchSubscriptions(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/subscriptions/${selectedSub.id}`);
      if (res.success) {
        toast.success('Subscription record deleted.');
        setDeleteConfirmOpen(false);
        setSelectedSub(null);
        fetchSubscriptions(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'organization_name',
      label: 'Organization',
      render: (row) => (
        <div className="flex flex-col">
          <Link
            to={`/super-admin/organizations/${row.organization_id}`}
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            {row.organization_name}
          </Link>
          <span className="text-xs font-normal text-slate-500">{row.organization_email || '—'}</span>
        </div>
      )
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (row) => (
        <div className="flex flex-col gap-1 items-start">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {row.plan_name}
          </span>
          {row.scheduled_plan_id && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="w-2.5 h-2.5" />
              Queued: {row.scheduled_plan_name || 'Next Plan'}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'billing_cycle',
      label: 'Cycle',
      render: (row) => (
        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
          {row.billing_cycle || 'MONTHLY'}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className="font-bold text-slate-900 text-sm">
          ₹{Number(row.amount ?? 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.status}>{row.status}</Badge>
          {row.cancel_at_period_end && row.status !== 'CANCELLED' && (
            <span className="text-[10px] font-semibold text-rose-600">
              Cancels at period end
            </span>
          )}
        </div>
      )
    },
    {
      key: 'end_date',
      label: 'Valid Until',
      render: (row) => {
        const rawDate = row.end_date || row.current_period_end;
        if (!rawDate) return <span className="text-xs text-slate-400">N/A</span>;
        const endDateObj = new Date(rawDate);
        const isValidDate = !isNaN(endDateObj.getTime());
        if (!isValidDate) return <span className="text-xs text-slate-400">N/A</span>;

        const isExpiringSoon = endDateObj < new Date(Date.now() + 7 * 86400000);
        return (
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${isExpiringSoon && row.status === 'ACTIVE' ? 'text-amber-700' : 'text-slate-800'}`}>
              {endDateObj.toLocaleDateString()}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              Auto Renew: {row.auto_renew ? 'Yes' : 'No'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Upgrade / Downgrade Plan */}
          <button
            onClick={() => handleOpenChangePlan(row)}
            title="Change Plan (Upgrade/Downgrade)"
            className="p-1.5 rounded-lg text-purple-700 hover:text-purple-800 hover:bg-purple-50 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Extend */}
          <button
            onClick={() => {
              setSelectedSub(row);
              setExtendModalOpen(true);
            }}
            title="Extend Subscription"
            className="p-1.5 rounded-lg text-sky-700 hover:text-sky-800 hover:bg-sky-50 transition-colors"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Reactivate or Cancel */}
          {['CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(row.status) ? (
            <button
              onClick={() => handleReactivate(row)}
              title="Reactivate Subscription"
              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedSub(row);
                setCancelModalOpen(true);
              }}
              title="Cancel Subscription"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              setSelectedSub(row);
              setDeleteConfirmOpen(true);
            }}
            title="Delete Subscription Record"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
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
            <CreditCard className="w-7 h-7 text-emerald-600 stroke-[2]" />
            <span>Subscription Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Monitor client billing cycles, automated renewals, cancellations and trial durations.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 stroke-[2]" />
          <span>Subscriptions List</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('churn');
            fetchChurnAnalytics();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'churn'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-4 h-4 stroke-[2]" />
          <span>Churn & Retention Intelligence</span>
        </button>
      </div>

      {/* CHURN ANALYTICS TAB */}
      {activeTab === 'churn' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Churned Accounts</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{churnAnalytics?.totalChurn ?? '—'}</p>
                <span className="text-[11px] text-slate-400">All-time cancellations & failures</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <UserX className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Churn Rate</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{churnAnalytics?.churnRatePercent !== undefined ? `${churnAnalytics.churnRatePercent}%` : '—'}</p>
                <span className="text-[11px] text-slate-400">Churned / Total Subscriptions ratio</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Paying Tenants</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{churnAnalytics?.activeSubscriptions ?? '—'}</p>
                <span className="text-[11px] text-slate-400">Retained active accounts</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Breakdown by Churn Type & Top Reasons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Churn Events By Nature</h3>
              <div className="space-y-2.5">
                {(churnAnalytics?.byType || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No churn events recorded yet.</p>
                ) : (
                  churnAnalytics.byType.map(item => (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700">{item.type.replace(/_/g, ' ')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-black">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Top Cancellation Reasons</h3>
              <div className="space-y-2.5">
                {(churnAnalytics?.topReasons || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No cancellation feedback logged yet.</p>
                ) : (
                  churnAnalytics.topReasons.map(item => (
                    <div key={item.reason} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[280px]">{item.reason}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Churn Ledger */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Churn Event Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tenant</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Churn Type</th>
                    <th className="py-2.5 px-3">Logged Reason</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(churnAnalytics?.recentEvents || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">No recent churn events.</td>
                    </tr>
                  ) : (
                    churnAnalytics.recentEvents.map(evt => (
                      <tr key={evt.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{evt.organization_name}</td>
                        <td className="py-2.5 px-3">{evt.plan_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {evt.churn_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{evt.reason || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(evt.churn_date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS LIST TAB */}
      {activeTab === 'list' && (
        <>
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name, email or plan..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 stroke-[2]" /> Status:
              </span>
              {['ALL', 'ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Subscriptions Table */}
          <DataTable
            columns={columns}
            data={subscriptions}
            isLoading={isLoading}
            emptyMessage="No subscription records matching criteria"
            pagination={pagination}
            onPageChange={(p) => fetchSubscriptions(p)}
          />
        </>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Subscription"
        subtitle="Provision an active or trial subscription for a tenant with plan pricing."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          {/* Target CRM Company Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Target CRM Company *
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                {organizations.length} CRM Companies Available
              </span>
            </div>
            <select
              required
              value={subForm.organizationId}
              onChange={(e) => {
                const orgId = e.target.value;
                setSubForm(prev => ({ ...prev, organizationId: orgId }));
                const chosenOrg = organizations.find(o => String(o.id) === String(orgId));
                if (chosenOrg && chosenOrg.plan_id) {
                  handlePlanOrCycleChange(chosenOrg.plan_id, subForm.billingCycle);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 shadow-xs"
            >
              <option value="">-- Select CRM Company ({organizations.length} Companies) --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  🏢 {org.name} {org.email ? `(${org.email})` : ''} • Current: {org.plan_name || 'Standard'} [{org.status || 'ACTIVE'}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting a company provisions this subscription directly to their CRM workspace and enables full CRM access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plan Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Plan *</label>
              <select
                required
                value={subForm.planId}
                onChange={(e) => handlePlanOrCycleChange(e.target.value, subForm.billingCycle)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="">-- Select Plan --</option>
                {plans.map((p) => {
                  const mPrice = Number(p.price_monthly ?? p.monthly_price ?? 0);
                  const yPrice = Number(p.price_yearly ?? p.yearly_price ?? 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{mPrice}/mo · ₹{yPrice}/yr) {p.is_popular ? '★ Popular' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Billing Cycle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle *</label>
              <select
                value={subForm.billingCycle}
                onChange={(e) => handlePlanOrCycleChange(subForm.planId, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="MONTHLY">Monthly Cycle (30 Days)</option>
                <option value="YEARLY">Yearly Cycle (365 Days)</option>
              </select>
            </div>
          </div>

          {/* Amount & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={subForm.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                  setSubForm({ ...subForm, amount: cleanVal });
                }}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">Type custom amount or auto-fills from plan</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={subForm.durationDays}
                onChange={(e) => setSubForm({ ...subForm, durationDays: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={subForm.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
              </select>
            </div>
          </div>

          {/* Payment Method & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={subForm.paymentMethod}
                onChange={(e) => setSubForm({ ...subForm, paymentMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="DIRECT_ADMIN">Direct Admin / Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="RAZORPAY">Razorpay Online</option>
                <option value="STRIPE">Stripe Gateway</option>
              </select>
            </div>

            {/* Payment Status (Paid vs Payment Pending) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Status *
              </label>
              <select
                value={subForm.paymentStatus}
                onChange={(e) => setSubForm({ ...subForm, paymentStatus: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="SUCCESS">Payment Received (Paid)</option>
                <option value="PENDING">Payment Pending (Awaiting Clearance)</option>
                <option value="NONE">No Payment Required (Free Trial)</option>
              </select>
              {subForm.status === 'TRIAL' && (
                <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                  ★ Trial Active: Marked as Payment Pending until trial converts.
                </span>
              )}
            </div>
          </div>

          {/* Auto-renew checkbox */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={subForm.autoRenew}
              onChange={(e) => setSubForm({ ...subForm, autoRenew: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <span>Enable Auto-Renew at billing period conclusion</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Create Subscription</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EXTEND SUBSCRIPTION MODAL */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        title={`Extend Subscription: ${selectedSub?.organization_name || ''}`}
        subtitle="Grant additional active billing days to this tenant's current plan period."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Days to Add *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={additionalDays}
              onChange={(e) => setAdditionalDays(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setExtendModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              Extend Subscription
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL SUBSCRIPTION MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Subscription: ${selectedSub?.organization_name || ''}`}
        subtitle="Collect cancellation reason for retention analytics and schedule end date."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cancellation Reason Category *</label>
            <select
              value={cancelReasonCategory}
              onChange={(e) => setCancelReasonCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500"
            >
              <option value="Switched to alternative solution">Switched to alternative solution</option>
              <option value="Price / Budget constraints">Price / Budget constraints</option>
              <option value="Missing required features">Missing required features</option>
              <option value="Temporary project / paused operations">Temporary project / paused operations</option>
              <option value="Poor customer experience / support">Poor customer experience / support</option>
              <option value="Business closure / downsizing">Business closure / downsizing</option>
              <option value="Admin manual intervention">Admin manual intervention</option>
              <option value="Other reason">Other reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Additional Customer Feedback / Notes</label>
            <textarea
              rows={2}
              value={cancelFeedback}
              onChange={(e) => setCancelFeedback(e.target.value)}
              placeholder="Provide specific notes or client remarks for churn analytics..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={cancelImmediate}
              onChange={(e) => setCancelImmediate(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-0"
            />
            <span>Cancel immediately (Revoke access now)</span>
          </label>

          <p className="text-[11px] font-semibold text-slate-500">
            {cancelImmediate
              ? 'Account will immediately transition to CANCELLED and churn will be logged.'
              : 'Auto-renew will be disabled. The subscription remains ACTIVE until the current billing period concludes.'}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </Modal>

      {/* UPGRADE / DOWNGRADE PLAN MODAL */}
      <Modal
        isOpen={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        title={`Change Plan: ${selectedSub?.organization_name || ''}`}
        subtitle={`Current Plan: ${selectedSub?.plan_name} (${selectedSub?.billing_cycle || 'MONTHLY'})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePlanSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Plan *</label>
            <select
              value={changePlanForm.targetPlanId}
              onChange={(e) => setChangePlanForm({ ...changePlanForm, targetPlanId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price_monthly}/mo (₹{p.price_yearly}/yr)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cadence *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChangePlanForm({ ...changePlanForm, billingCycle: 'MONTHLY' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  changePlanForm.billingCycle === 'MONTHLY'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setChangePlanForm({ ...changePlanForm, billingCycle: 'YEARLY' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  changePlanForm.billingCycle === 'YEARLY'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="block text-xs font-bold text-slate-700">Transition Execution Schedule</span>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="planChangeImmediate"
                checked={changePlanForm.immediate === true}
                onChange={() => setChangePlanForm({ ...changePlanForm, immediate: true })}
                className="text-purple-600 focus:ring-0"
              />
              <span>Apply Immediately (Resets billing cycle today)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="planChangeImmediate"
                checked={changePlanForm.immediate === false}
                onChange={() => setChangePlanForm({ ...changePlanForm, immediate: false })}
                className="text-purple-600 focus:ring-0"
              />
              <span>Schedule for Next Cycle (Period End transition)</span>
            </label>
          </div>

          {changePlanForm.immediate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={changePlanForm.paymentMethod || 'UPI'}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500"
                >
                  <option value="UPI">UPI (GPay/PhonePe/QR)</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                  <option value="CASH">Cash / Offline</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={changePlanForm.paymentStatus || 'SUCCESS'}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500"
                >
                  <option value="SUCCESS">Completed (Success)</option>
                  <option value="PENDING">Payment Pending</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setChangePlanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-black shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              Confirm Plan Change
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE SUBSCRIPTION DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedSub(null);
        }}
        onConfirm={handleDeleteSubscription}
        title="Delete Subscription Record"
        message={`Are you sure you want to delete the subscription for '${selectedSub?.organization_name}'? This action cannot be undone.`}
        confirmText="Delete Record"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
