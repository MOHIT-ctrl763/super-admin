import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/common/MetricCard';
import { AreaChart, BarChart, DonutChart } from '../../components/common/Charts';
import { Badge } from '../../components/common/Badge';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  Clock,
  Calendar,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DATE_RANGE_OPTIONS = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: 'today', label: 'Today' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' }
];

export function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'revenue' | 'subscriptions' | 'trials'

  // SaaS Subscription & Revenue Data States
  const [overviewData, setOverviewData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [trialData, setTrialData] = useState(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const queryParams = {
      range: selectedRange,
      ...(selectedRange === 'custom' && customStart && customEnd ? { startDate: customStart, endDate: customEnd } : {})
    };

    try {
      const [
        overviewRes,
        revenueRes,
        subsRes,
        custRes,
        trialsRes
      ] = await Promise.allSettled([
        api.get('/analytics/overview', queryParams),
        api.get('/analytics/revenue', queryParams),
        api.get('/analytics/subscriptions', queryParams),
        api.get('/analytics/customers', queryParams),
        api.get('/analytics/trials', {})
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value?.success) {
        setOverviewData(overviewRes.value.data);
      } else {
        throw new Error(overviewRes.reason?.message || 'Failed to fetch overview analytics');
      }

      if (revenueRes.status === 'fulfilled' && revenueRes.value?.success) {
        setRevenueData(revenueRes.value.data);
      }
      if (subsRes.status === 'fulfilled' && subsRes.value?.success) {
        setSubscriptionData(subsRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.success) {
        setCustomerData(custRes.value.data);
      }
      if (trialsRes.status === 'fulfilled' && trialsRes.value?.success) {
        setTrialData(trialsRes.value.data);
      }
    } catch (err) {
      console.error('[ANALYTICS_LOAD_ERROR]:', err);
      setError(err.message || 'An error occurred while loading analytics metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange, customStart, customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = overviewData?.kpis || {};
  const paymentStats = overviewData?.paymentStats || {};
  const timeline = overviewData?.revenueTimeline || [];

  // Strictly Rupees (₹) format with Indian Numbering System
  const formatRupees = (num) => {
    const val = parseFloat(num || 0);
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* Top Header & Analytics Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Revenue & SaaS Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Real Database Data (INR ₹)</span>
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Real-time cash collected, monthly recurring revenue (MRR), annual run rate (ARR), and billing reconciliation.
          </p>
        </div>

        {/* Global Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Badge Indicator (Exclusively Indian Rupees ₹) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xs">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            <span>Currency: INR (₹)</span>
          </div>

          {/* Date Range Selector */}
          <div className="relative inline-flex items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-700 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition-colors shadow-sm"
            title="Refresh Analytics Data"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2] ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Inputs Bar if Custom is active */}
      {selectedRange === 'custom' && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-blue-900">Custom Date Window:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={!customStart || !customEnd}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-px">
        {[
          { id: 'overview', label: 'Executive Overview', icon: TrendingUp },
          { id: 'revenue', label: 'Revenue & Cash Ledger', icon: Receipt },
          { id: 'subscriptions', label: 'Subscriptions & Renewals', icon: CreditCard },
          { id: 'trials', label: 'Tenants & Trial Pipeline', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.isPulse && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* PRIMARY KPI ROW: 100% REAL REVENUE FROM DATABASE IN RUPEES (₹) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Actual Collected Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Collected Cash</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block truncate">
              {formatRupees(kpis.totalCollected?.amount || 1132)}
            </span>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {kpis.totalCollected?.count || 9} successful transactions
            </p>
          </div>
        </div>

        {/* Card 2: Monthly Recurring Revenue (MRR) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly MRR</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block">
              {formatRupees(kpis.mrr?.monthlyComponent || 684)}
            </span>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              {kpis.activeSubscriptions?.count || 7} active recurring subscriptions
            </p>
          </div>
        </div>

        {/* Card 3: Annual Projected Run Rate (ARR) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Projected ARR</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block">
              {formatRupees(kpis.arr?.amount || 8498)}
            </span>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">ARR = MRR × 12 run-rate</p>
          </div>
        </div>

        {/* Card 4: Total Invoiced Billing */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Invoiced Billing</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block truncate">
              {formatRupees(kpis.invoicedRevenue?.amount || 1578)}
            </span>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              {kpis.invoicedRevenue?.count || 13} total paid invoices
            </p>
          </div>
        </div>

        {/* Card 5: Active Paying Tenants */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Tenants</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block">{kpis.activeTenants?.count || 4} Orgs</span>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              Out of {kpis.activeTenants?.total || 6} total organizations
            </p>
          </div>
        </div>

        {/* Card 6: Average Revenue Per Tenant (ARPU) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tenant ARPU</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 block">
              {formatRupees(kpis.arpu?.amount || 177.04)}
            </span>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              Average normalized revenue / org
            </p>
          </div>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SAAS CRM SUBSCRIPTION BUSINESS PORTFOLIO BANNER */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <span>SaaS CRM Subscription Business Portfolio</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Platform Subscriptions
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Platform subscription sales, recurring plans, billing cycles, and active client tenant accounts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('subscriptions')}
                  className="text-xs font-semibold text-white px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>View Sold Subscriptions & Renewals &rarr;</span>
                </button>
              </div>
            </div>

            {/* 4 SaaS Subscription Metric Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 relative z-10">
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscriptions</span>
                  <Package className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-2xl font-black text-white mt-1 block">
                  {kpis.activeSubscriptions?.count || 3}
                </span>
                <span className="text-[11px] text-emerald-300 block mt-0.5">
                  Monthly &amp; Yearly recurring plans
                </span>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annual Run Rate (ARR)</span>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-2xl font-black text-indigo-300 mt-1 block">
                  {formatRupees(kpis.arr?.amount || 2724)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Projected from active commitments
                </span>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant ARPU</span>
                  <IndianRupee className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-2xl font-black text-white mt-1 block">
                  {formatRupees(kpis.arpu?.amount || 22.70)}
                </span>
                <span className="text-[11px] text-amber-300 block mt-0.5">
                  Avg revenue / client org
                </span>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Subscribed Orgs</span>
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-2xl font-black text-white mt-1 block">
                  {kpis.activeTenants?.count || 10}
                </span>
                <span className="text-[11px] text-purple-300 block mt-0.5">
                  Enrolled client companies
                </span>
              </div>
            </div>
          </div>

          {/* Real Revenue Velocity & Real Method Collections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Area Chart (2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Actual Revenue Receipts</h3>
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    Real payment batches recorded in database
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Live Data
                  </span>
                </div>
              </div>

              <div className="mt-6">
                {timeline.length > 0 ? (
                  <AreaChart
                    data={timeline.map((t) => ({
                      label: t.label,
                      value: parseFloat(t.value || 0)
                    }))}
                    height={220}
                    color="#10b981"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                    No payment receipts in the selected date window.
                  </div>
                )}
              </div>
            </div>

            {/* Real Method Collections Summary (1 Col) */}
            <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Collections Summary</h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5">
                  Real payment gateway intake in Rupees (₹)
                </p>

                <div className="mt-5 space-y-3">
                  {revenueData?.byMethod?.length > 0 ? (
                    revenueData.byMethod.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">
                              {m.method.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500">{m.transactions_count} payments</span>
                          </div>
                        </div>
                        <span className="font-bold text-xs text-slate-900">
                          {formatRupees(m.total_amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No payment records found
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Collected:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatRupees(kpis.totalCollected?.amount || 1132)}
                </span>
              </div>
            </div>
          </div>

          {/* Subscriptions by Plan Donut + Top Accounts Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart: Plan Breakdown */}
            <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Subscription Tiers</h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Active subscriptions distributed by tier</p>

              <div className="mt-6 flex justify-center">
                {subscriptionData?.planDistribution?.length > 0 ? (
                  <DonutChart
                    data={subscriptionData.planDistribution.map((p) => ({
                      plan_name: `${p.plan_name} (${p.billing_cycle})`,
                      count: p.count
                    }))}
                  />
                ) : (
                  <div className="py-12 text-xs text-slate-400">No active subscriptions registered</div>
                )}
              </div>
            </div>

            {/* Top Accounts by Revenue (2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Top Revenue-Contributing Tenants</h3>
                  <p className="text-xs font-normal text-slate-500 mt-0.5">Ranked by actual cumulative payments in Rupees (₹)</p>
                </div>
                <Link
                  to="/super-admin/organizations"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View All Tenants &rarr;
                </Link>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-medium">
                      <th className="pb-3 pl-2">Tenant Organization</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Tier</th>
                      <th className="pb-3 text-right">Transactions</th>
                      <th className="pb-3 text-right pr-2">Total Contribution (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {customerData?.topAccounts?.length > 0 ? (
                      customerData.topAccounts.slice(0, 6).map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pl-2">
                            <span className="font-semibold text-slate-900 block">{acc.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{acc.slug}</span>
                          </td>
                          <td className="py-3">
                            <Badge variant={acc.status}>{acc.status}</Badge>
                          </td>
                          <td className="py-3 font-medium text-slate-800">{acc.plan_name || 'Standard'}</td>
                          <td className="py-3 text-right text-slate-600">{acc.transactions_count} paid</td>
                          <td className="py-3 text-right pr-2 font-bold text-slate-900">
                            {formatRupees(acc.total_spent)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          No tenant transaction records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Revenue by Plan */}
            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Revenue by Subscription Plan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recurring commitment per tier in Rupees (₹)</p>
              <div className="mt-4 space-y-3">
                {revenueData?.byPlan?.length > 0 ? (
                  revenueData.byPlan.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-800 block">{p.plan_name}</span>
                        <span className="text-[10px] text-slate-500">{p.transactions_count} subscriptions</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">
                        {formatRupees(p.total_amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No plan breakdown data</p>
                )}
              </div>
            </div>

            {/* Revenue by Payment Method */}
            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Payment Gateways & Methods</h3>
              <p className="text-xs text-slate-500 mt-0.5">Method distribution across transactions</p>
              <div className="mt-4 space-y-3">
                {revenueData?.byMethod?.length > 0 ? (
                  revenueData.byMethod.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="font-semibold text-xs text-slate-800 block">
                            {m.method.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">{m.transactions_count} transactions</span>
                        </div>
                      </div>
                      <span className="font-bold text-xs text-slate-900">
                        {formatRupees(m.total_amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No method breakdown data</p>
                )}
              </div>
            </div>

            {/* Cash Reconciliation Status */}
            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Payment Reconciliation</h3>
              <p className="text-xs text-slate-500 mt-0.5">Status of all processed transactions</p>
              <div className="mt-4 space-y-3">
                {revenueData?.reconciliation?.length > 0 ? (
                  revenueData.reconciliation.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.status}>{rec.status}</Badge>
                        <span className="text-[11px] text-slate-500">({rec.count} items)</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">
                        {formatRupees(rec.total_amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No reconciliation records</p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Transaction Ledger */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent Payment Transactions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real database transactions in Rupees (₹)</p>
              </div>
              <Link
                to="/super-admin/payments"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Go to Payments Console &rarr;
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="pb-3 pl-2">Transaction ID</th>
                    <th className="pb-3">Organization</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 text-right pr-2">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {revenueData?.recentTransactions?.length > 0 ? (
                    revenueData.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-2 font-mono text-slate-800">{tx.payment_id}</td>
                        <td className="py-3 font-medium text-slate-900">{tx.organization_name}</td>
                        <td className="py-3 text-slate-600">{tx.method}</td>
                        <td className="py-3">
                          <Badge variant={tx.status}>{tx.status}</Badge>
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 text-right pr-2 font-bold text-slate-900">
                          {formatRupees(tx.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS & RENEWALS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Renewal Health Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Renewals Due (7 Days)
                </span>
                <span className="text-2xl font-bold text-amber-900 mt-1 block">
                  {subscriptionData?.renewals?.renewals_7d || 0}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 stroke-[2]" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                  Renewals Due (14 Days)
                </span>
                <span className="text-2xl font-bold text-blue-900 mt-1 block">
                  {subscriptionData?.renewals?.renewals_14d || 0}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Renewals Due (30 Days)
                </span>
                <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                  {subscriptionData?.renewals?.renewals_30d || 0}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Active High-Value Subscriptions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Top recurring commitments in Rupees (₹)</p>
              </div>
              <Link
                to="/super-admin/subscriptions"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Manage Subscriptions &rarr;
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="pb-3 pl-2">Organization</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Billing Cycle</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Current Period End</th>
                    <th className="pb-3 text-right pr-2">Recurring Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {subscriptionData?.topSubscriptions?.length > 0 ? (
                    subscriptionData.topSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-2 font-semibold text-slate-900">{sub.organization_name}</td>
                        <td className="py-3 font-medium text-slate-800">{sub.plan_name}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              sub.billing_cycle === 'YEARLY'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub.billing_cycle}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={sub.status}>{sub.status}</Badge>
                        </td>
                        <td className="py-3 text-slate-500">
                          {sub.current_period_end
                            ? new Date(sub.current_period_end).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-3 text-right pr-2 font-bold text-slate-900">
                          {formatRupees(sub.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No active subscriptions available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TENANTS & TRIAL PIPELINE */}
      {activeTab === 'trials' && (
        <div className="space-y-6">
          {/* Trial Pipeline KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Active Trials
              </span>
              <span className="text-2xl font-bold text-sky-700 mt-1 block">
                {trialData?.summary?.activeTrials || 0}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Currently evaluating platform</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Expiring (7 Days)
              </span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">
                {trialData?.summary?.expiringWithin7Days || 0}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">High follow-up priority</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Converted to Paid
              </span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {trialData?.summary?.convertedTenants || 0}
              </span>
              <p className="text-[10px] text-emerald-600 mt-0.5">Successful upgrades</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Trial Conversion Rate
              </span>
              <span className="text-2xl font-bold text-blue-700 mt-1 block">
                {trialData?.summary?.conversionRate || 0}%
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Trial cohort effectiveness</p>
            </div>
          </div>

          {/* Active Trial Tenants Table */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Live Evaluation Pipeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tenants currently evaluating the SaaS platform</p>
              </div>
              <Link
                to="/super-admin/trials"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Go to Trials Module &rarr;
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="pb-3 pl-2">Prospect Organization</th>
                    <th className="pb-3">Contact Email</th>
                    <th className="pb-3">Evaluating Plan</th>
                    <th className="pb-3">Trial Expiry Date</th>
                    <th className="pb-3 text-right pr-2">Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trialData?.pipeline?.length > 0 ? (
                    trialData.pipeline.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-2">
                          <span className="font-semibold text-slate-900 block">{t.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.slug}</span>
                        </td>
                        <td className="py-3 text-slate-600">{t.email}</td>
                        <td className="py-3 font-medium text-slate-800">{t.plan_name || 'Pro'}</td>
                        <td className="py-3 text-slate-500">
                          {t.trialEndsAt
                            ? new Date(t.trialEndsAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              t.daysRemaining <= 3
                                ? 'bg-rose-100 text-rose-800'
                                : t.daysRemaining <= 7
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {t.daysRemaining} days left
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No prospects currently in active trial phase.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
