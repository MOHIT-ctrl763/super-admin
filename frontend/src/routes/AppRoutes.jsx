import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Module Pages
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { OrganizationsListPage } from '../pages/organizations/OrganizationsListPage';
import { OrganizationDetailsPage } from '../pages/organizations/OrganizationDetailsPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { PlansListPage } from '../pages/plans/PlansListPage';
import { FeaturesPage } from '../pages/plans/FeaturesPage';
import { SubscriptionsListPage } from '../pages/subscriptions/SubscriptionsListPage';
import { UsageLimitsPage } from '../pages/usage/UsageLimitsPage';
import { PaymentsPage } from '../pages/billing/PaymentsPage';
import { InvoicesPage } from '../pages/billing/InvoicesPage';
import { CouponsPage } from '../pages/billing/CouponsPage';
import { TrialsPage } from '../pages/trials/TrialsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { SupportTicketsPage } from '../pages/support/SupportTicketsPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { SystemSettingsPage } from '../pages/settings/SystemSettingsPage';
import { RolesListPage } from '../pages/roles/RolesListPage';
import { PermissionsListPage } from '../pages/permissions/PermissionsListPage';
import { CrmIntegrationPage } from '../pages/crm/CrmIntegrationPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/super-admin/login" element={<LoginPage />} />
      <Route path="/super-admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password" element={<Navigate to="/super-admin/forgot-password" replace />} />

      {/* Protected Super Admin Console */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        
        {/* Core & Tenants */}
        <Route path="dashboard" element={<PermissionGuard permission="dashboard.view" pageGuard={true}><DashboardPage /></PermissionGuard>} />
        <Route path="analytics" element={<PermissionGuard permission="payments.view" pageGuard={true}><AnalyticsPage /></PermissionGuard>} />
        <Route path="organizations" element={<PermissionGuard permission="organizations.view" pageGuard={true}><OrganizationsListPage /></PermissionGuard>} />
        <Route path="organizations/:id" element={<PermissionGuard permission="organizations.view" pageGuard={true}><OrganizationDetailsPage /></PermissionGuard>} />
        <Route path="users" element={<PermissionGuard permission="users.view" pageGuard={true}><UsersListPage /></PermissionGuard>} />
        
        {/* Plans & Subscriptions */}
        <Route path="plans" element={<PermissionGuard permission="plans.view" pageGuard={true}><PlansListPage /></PermissionGuard>} />
        <Route path="features" element={<PermissionGuard permission="features.view" pageGuard={true}><FeaturesPage /></PermissionGuard>} />
        <Route path="subscriptions" element={<PermissionGuard permission="subscriptions.view" pageGuard={true}><SubscriptionsListPage /></PermissionGuard>} />
        
        {/* Billing & Quotas */}
        <Route path="usage" element={<PermissionGuard permission="usage.view" pageGuard={true}><UsageLimitsPage /></PermissionGuard>} />
        <Route path="payments" element={<PermissionGuard permission="payments.view" pageGuard={true}><PaymentsPage /></PermissionGuard>} />
        <Route path="invoices" element={<PermissionGuard permission="invoices.view" pageGuard={true}><InvoicesPage /></PermissionGuard>} />
        <Route path="coupons" element={<PermissionGuard permission="coupons.view" pageGuard={true}><CouponsPage /></PermissionGuard>} />
        <Route path="trials" element={<PermissionGuard permission="trials.view" pageGuard={true}><TrialsPage /></PermissionGuard>} />
        
        {/* Operations & Administration */}
        <Route path="notifications" element={<PermissionGuard permission="notifications.view" pageGuard={true}><NotificationsPage /></PermissionGuard>} />
        <Route path="support" element={<PermissionGuard permission="support.view" pageGuard={true}><SupportTicketsPage /></PermissionGuard>} />
        <Route path="audit-logs" element={<PermissionGuard permission="auditLogs.view" pageGuard={true}><AuditLogsPage /></PermissionGuard>} />
        <Route path="settings" element={<PermissionGuard permission="settings.view" pageGuard={true}><SystemSettingsPage /></PermissionGuard>} />
        <Route path="crm-integration" element={<PermissionGuard permissions={['crm.view', 'settings.view', 'organizations.view', 'dashboard.view']} pageGuard={true}><CrmIntegrationPage /></PermissionGuard>} />
        
        {/* RBAC Access Control */}
        <Route path="roles" element={<PermissionGuard permission="roles.view" pageGuard={true}><RolesListPage /></PermissionGuard>} />
        <Route path="permissions" element={<PermissionGuard permission="permissions.view" pageGuard={true}><PermissionsListPage /></PermissionGuard>} />
      </Route>

      {/* Fallback Redirects */}
      <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
