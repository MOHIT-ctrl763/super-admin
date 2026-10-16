import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  Plus,
  LayoutDashboard,
  TrendingUp,
  Building2,
  Users,
  Layers,
  CreditCard,
  Sliders,
  Gauge,
  Receipt,
  FileText,
  Tag,
  Clock,
  Bell,
  LifeBuoy,
  ShieldCheck,
  Shield,
  Key,
  Settings,
  Network,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_GROUPS = [
  {
    category: 'MAIN',
    items: [
      { path: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      { path: '/super-admin/analytics', label: 'Revenue Analytics', icon: TrendingUp, permission: 'payments.view' }
    ]
  },
  {
    category: 'TENANTS',
    items: [
      { path: '/super-admin/organizations', label: 'CRM Companies', icon: Building2, permission: 'organizations.view' },
      { path: '/super-admin/users', label: 'Users', icon: Users, permission: 'users.view' }
    ]
  },
  {
    category: 'BILLING & PLANS',
    items: [
      { path: '/super-admin/plans', label: 'Plans', icon: Layers, permission: 'plans.view' },
      { path: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard, permission: 'subscriptions.view' },
      { path: '/super-admin/payments', label: 'Payments', icon: Receipt, permission: 'payments.view' },
      { path: '/super-admin/invoices', label: 'Invoices', icon: FileText, permission: 'invoices.view' },
      { path: '/super-admin/coupons', label: 'Coupons', icon: Tag, permission: 'coupons.view' },
      { path: '/super-admin/trials', label: 'Trials', icon: Clock, permission: 'trials.view' }
    ]
  },
  {
    category: 'OPERATIONS',
    items: [
      { path: '/super-admin/features', label: 'Features', icon: Sliders, permission: 'features.view' },
      { path: '/super-admin/usage', label: 'Usage & Limits', icon: Gauge, permission: 'usage.view' },
      { path: '/super-admin/notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
      { path: '/super-admin/support', label: 'Support', icon: LifeBuoy, permission: 'support.view' },
      { path: '/super-admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck, permission: 'auditLogs.view' },
      { path: '/super-admin/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
      { path: '/super-admin/crm-integration', label: 'CRM Integration', icon: Network, permission: 'settings.view' }
    ]
  },
  {
    category: 'ACCESS CONTROL',
    items: [
      { path: '/super-admin/roles', label: 'Roles', icon: Shield, permission: 'roles.view' },
      { path: '/super-admin/permissions', label: 'Permissions', icon: Key, permission: 'permissions.view' }
    ]
  }
];

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();

  const filteredNavGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      )
    })).filter((group) => group.items.length > 0);
  }, [hasPermission, user]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel - Deep Dark Styling matching CRM Pro design */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0b1329] border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}`}
      >
        {/* Brand Header with Hamburger Icon */}
        <div
          className={`h-16 flex items-center border-b border-slate-800/80 shrink-0 ${
            isCollapsed ? 'lg:justify-center px-3.5 justify-between' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Hamburger Button (visible on sidebar itself) */}
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Logo Badge & Title */}
            <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/30 shrink-0">
                <ShieldCheck className="w-5 h-5 text-white stroke-[2.3]" />
              </div>
              <div className="overflow-hidden">
                <span className="text-sm font-black text-white tracking-tight block truncate">
                  Super Admin
                </span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Console</p>
              </div>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        {(hasPermission('organizations.create') || hasPermission('organizations.view')) && (
          <div className={`px-3 pt-3 pb-1 ${isCollapsed ? 'lg:px-2' : ''}`}>
            <NavLink
              to="/super-admin/organizations"
              onClick={() => onClose && onClose()}
              title="Create or View Organizations"
              className={`w-full flex items-center ${
                isCollapsed ? 'lg:justify-center lg:px-0' : 'justify-center gap-2'
              } py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/30 transition-all`}
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span>Quick Tenant</span>}
            </NavLink>
          </div>
        )}

        {/* Navigation Categories and Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredNavGroups.map((group, gIdx) => (
            <div key={group.category || gIdx} className="space-y-1">
              {/* Category Header */}
              {isCollapsed ? (
                <div className="hidden lg:block my-2 border-t border-slate-800/80" />
              ) : (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                  {group.category}
                </div>
              )}

              {/* Items in Category */}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose && onClose()}
                    className={({ isActive }) =>
                      `relative group flex items-center ${
                        isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3'
                      } py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 stroke-[2] shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate ml-3">{item.label}</span>}

                        {/* Floating Tooltip when collapsed on desktop */}
                        {isCollapsed && (
                          <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {item.label}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080d1d] shrink-0">
          <div
            className={`flex items-center ${
              isCollapsed ? 'lg:justify-center p-1.5' : 'justify-between p-2.5'
            } rounded-xl bg-slate-900/90 border border-slate-800`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-sm ring-1 ring-blue-400/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 font-normal truncate">{user?.email || 'admin@platform.io'}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}
          </div>

          {/* Compact Logout Icon for Collapsed Mode */}
          {isCollapsed && (
            <div className="hidden lg:flex justify-center mt-2">
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
