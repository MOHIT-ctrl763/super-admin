import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/common/MetricCard';
import { AreaChart, DonutChart } from '../../components/common/Charts';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  Calendar,
  Network,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  Package,
  LifeBuoy,
  FileText,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { user, isSuperAdmin, isFinanceRole, isSupportRole, isSalesRole, hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const saasRes = await api.get('/dashboard/stats');
      if (saasRes && saasRes.success) {
        setData(saasRes.data);
      } else {
        throw new Error('Failed to load dashboard metrics');
      }
    } catch (err) {
      setError(err.message || 'Error fetching SaaS analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const orgs = data?.organizations || {};
  const subs = data?.subscriptions || {};
  const rev = data?.revenue || {};
  const users = data?.users || {};
  const charts = data?.charts || {};
  const recentOrgs = data?.recentOrganizations || [];
  const breakdowns = data?.breakdowns || {};
  const upcomingRenewals = breakdowns.upcomingRenewals || [];
  const expiringTrials = breakdowns.expiringTrials || [];
  const recentPurchases = breakdowns.recentPurchases || [];
  const subRevenue = breakdowns.subscriptionRevenue || [];

  return (
    <div className="space-y-7 animate-fade-in pb-10">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              SaaS Business Performance &amp; CRM Subscriptions
            </h1>
            {isSuperAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Super Admin
              </span>
            )}
            {!isSuperAdmin && isFinanceRole && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-emerald-600" />
                Finance Role
              </span>
            )}
            {!isSuperAdmin && isSupportRole && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <LifeBuoy className="w-3 h-3 text-amber-600" />
                Support Role
              </span>
            )}
            {!isSuperAdmin && isSalesRole && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Sales Role
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            {isFinanceRole && 'Finance view: Platform subscription sales, revenue collection, MRR/ARR, and invoice reconciliation.'}
            {isSupportRole && 'Support view: Client tenant accounts, operational activity, and user assistance helpdesk.'}
            {isSalesRole && 'Sales view: Client company onboarding, trial conversions, and subscription package pipelines.'}
            {(isSuperAdmin || (!isFinanceRole && !isSupportRole && !isSalesRole)) && 'Platform-level SaaS metrics: CRM plan sales, active subscriptions, collected revenue, MRR, and renewal pipeline.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={fetchDashboardStats}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition-colors shadow-sm cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2] ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {hasPermission('subscriptions.view') && (
            <Link
              to="/super-admin/subscriptions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm transition-all"
            >
              <Package className="w-4 h-4 stroke-[2]" />
              <span>CRM Subscriptions</span>
            </Link>
          )}

          {hasPermission('organizations.create') && (
            <Link
              to="/super-admin/organizations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Register New Company</span>
            </Link>
          )}

          {!hasPermission('organizations.create') && hasPermission('support.view') && (
            <Link
              to="/super-admin/support"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              <LifeBuoy className="w-4 h-4 stroke-[2]" />
              <span>Support Desk</span>
            </Link>
          )}

          {!hasPermission('organizations.create') && hasPermission('invoices.view') && (
            <Link
              to="/super-admin/invoices"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <FileText className="w-4 h-4 stroke-[2]" />
              <span>Manage Invoices</span>
            </Link>
          )}
        </div>
      </div>

      {/* Row 1: Primary SaaS Revenue & Subscription KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Registered Companies"
          value={orgs.total || 0}
          subtitle={`${orgs.active || 0} Active • ${orgs.trial || 0} Trial • ${orgs.suspended || 0} Suspended`}
          icon={Building2}
          featured={true}
          trend={`${orgs.active || 0} Paying Tenants`}
          trendPositive={true}
        />

        <MetricCard
          title="Active CRM Subscriptions"
          value={subs.active || 0}
          subtitle={`${subs.expired || 0} Expired • ${subs.cancelled || 0} Cancelled • ${subs.expiringSoon || 0} Expiring (30d)`}
          icon={CreditCard}
          color="amber"
          trend={`${subs.total || 0} Total Plans Sold`}
          trendPositive={true}
        />

        {hasPermission('payments.view') ? (
          <>
            <MetricCard
              title="Monthly Recurring Revenue (MRR)"
              value={`₹${(rev.mrr || rev.monthly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              subtitle={`Annualized Run Rate (ARR): ₹${(rev.arr || ((rev.mrr || rev.monthly || 0) * 12) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              color="emerald"
              trend={`ARR: ₹${(rev.arr || 0).toLocaleString('en-IN')}`}
              trendPositive={true}
            />

            <MetricCard
              title="Collected SaaS Revenue"
              value={`₹${(rev.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              subtitle={`Pending: ₹${(rev.pending || 0).toLocaleString('en-IN')} • Failed: ₹${(rev.failed || 0).toLocaleString('en-IN')}`}
              icon={Receipt}
              color="purple"
              trend="From Subscription Sales"
              trendPositive={true}
            />
          </>
        ) : isSupportRole ? (
          <>
            <MetricCard
              title="Free Trial Evaluations"
              value={orgs.trial || 0}
              subtitle="Prospective organizations"
              icon={Clock}
              color="sky"
              trend="14-Day Free Evaluation"
              trendPositive={true}
            />

            <MetricCard
              title="Tenant Platform Users"
              value={users.total || 0}
              subtitle={`${users.active || 0} active accounts`}
              icon={Users}
              color="emerald"
              trend="User Accounts Managed"
              trendPositive={true}
            />
          </>
        ) : (
          <>
            <MetricCard
              title="Upcoming Renewals (30d)"
              value={upcomingRenewals.length || 0}
              subtitle="Subscriptions due for renewal"
              icon={Calendar}
              color="emerald"
              trend="High Priority Accounts"
              trendPositive={true}
            />

            <MetricCard
              title="Expiring Trials (7d)"
              value={expiringTrials.length || 0}
              subtitle="Ready for paid conversion"
              icon={Sparkles}
              color="purple"
              trend="Sales Conversion Pipeline"
              trendPositive={true}
            />
          </>
        )}
      </div>

      {/* Row 2: Secondary Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Trial Companies
            </span>
            <span className="text-2xl font-black text-sky-700 mt-1 block">
              {orgs.trial || 0}
            </span>
            <span className="text-[10px] text-slate-400">14-day free trial</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Expired Subscriptions
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {subs.expired || 0}
            </span>
            <span className="text-[10px] text-slate-400">Past period end</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Cancelled Subscriptions
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {subs.cancelled || 0}
            </span>
            <span className="text-[10px] text-slate-400">Cancelled by customer</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Suspended Companies
            </span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">
              {orgs.suspended || 0}
            </span>
            <span className="text-[10px] text-slate-400">Account locked</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Row 3: SaaS Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Performance Overview Area Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  SaaS Subscription Revenue Trend
                </h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5">Real collected payments from selling CRM subscriptions</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                  <span>Last 6 Months</span>
                </div>
              </div>
            </div>

            <div className="mt-2 mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Collected Revenue</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  ₹{(rev.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Real Database Payments</span>
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 mt-2">
            <AreaChart data={charts.monthlyRevenueTrend || []} />
          </div>
        </div>

        {/* Right: Plan Distribution Donut Chart */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Subscription Tier Share
              </h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Distribution of active CRM plans sold</p>
            </div>
            <div className="h-60 mt-3 flex items-center justify-center">
              <DonutChart data={charts.planDistribution || []} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: SaaS Subscription Breakdown Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Subscription-Wise SaaS Revenue Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Recurring revenue performance across CRM plan tiers and billing cycles</p>
          </div>
          <Link
            to="/super-admin/subscriptions"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
          >
            <span>Manage Subscriptions</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Plan Tier</th>
                <th className="py-2.5 px-3">Billing Cycle</th>
                <th className="py-2.5 px-3">Total Sold</th>
                <th className="py-2.5 px-3">Active Subscriptions</th>
                <th className="py-2.5 px-3 text-right">Recurring Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subRevenue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No active subscription packages recorded.</td>
                </tr>
              ) : (
                subRevenue.map((sub, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{sub.plan_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {sub.billing_cycle}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{sub.total_subscriptions}</td>
                    <td className="py-3 px-3 font-medium text-emerald-700">{sub.active_count} Active</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{parseFloat(sub.recurring_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: Upcoming Renewals & Expiring Trials Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Upcoming Subscription Renewals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Companies whose CRM subscriptions expire within 30 days</p>
              </div>
            </div>
            <Badge variant="warning">{upcomingRenewals.length} Upcoming</Badge>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {upcomingRenewals.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No subscriptions renewing in the next 30 days.</p>
            ) : (
              upcomingRenewals.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{r.organization_name}</span>
                    <span className="text-[11px] text-slate-500">{r.plan_name} • {r.billing_cycle} • Renews {new Date(r.current_period_end).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold text-xs text-slate-900">₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiring Trials */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Expiring Trial Companies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Prospect tenants nearing trial expiration (within 7 days)</p>
              </div>
            </div>
            <Badge variant="default">{expiringTrials.length} In Pipeline</Badge>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {expiringTrials.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No tenant trials expiring in the next 7 days.</p>
            ) : (
              expiringTrials.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{t.name}</span>
                    <span className="text-[11px] text-slate-500">{t.email} • Trial ends {new Date(t.trial_ends_at).toLocaleDateString()}</span>
                  </div>
                  <Link
                    to={`/super-admin/organizations/${t.id}`}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Convert to Paid →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 6: Two Split Columns (Recently Enrolled CRM Companies & Recent Subscription Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recently Enrolled CRM Companies */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Recently Enrolled Companies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Companies provisioned with CRM workspaces</p>
            </div>
            <Link
              to="/super-admin/organizations"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {recentOrgs.map((org) => (
              <div key={org.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link to={`/super-admin/organizations/${org.id}`} className="font-bold text-slate-900 text-xs hover:text-blue-600">
                    {org.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">{org.email} • {org.plan_name}</p>
                </div>
                <Badge variant={org.status}>{org.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Subscription Purchases & Payments Ledger */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Recent Subscription Purchases
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Actual payments received from selling CRM plans</p>
            </div>
            <Link
              to="/super-admin/payments"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {recentPurchases.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No subscription payments recorded yet.</p>
            ) : (
              recentPurchases.slice(0, 5).map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{p.organization_name}</span>
                    <span className="text-[11px] text-slate-500">{p.plan_name} • {p.method} • {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-slate-900 block">
                      ₹{parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                      p.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' :
                      p.status === 'PENDING' ? 'text-amber-700 bg-amber-50' :
                      'text-rose-700 bg-rose-50'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
