/**
 * CRM Integration Routes for Super Admin
 * Route paths mounted at /api/super-admin/crm
 */

const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { authenticateSuperAdmin, requirePermission, requireAnyPermission } = require('../middleware/auth');

// All CRM integration routes require Super Admin authentication
router.use(authenticateSuperAdmin);

// Connection & Health Diagnostics
router.get('/status', crmController.getStatus);
router.get('/health', crmController.getStatus);
router.get('/endpoints-coverage', requirePermission('settings.view'), crmController.getEndpointsCoverage);
router.post('/connect', requireAnyPermission(['settings.view', 'organizations.update']), crmController.connect);
router.post('/disconnect', requireAnyPermission(['settings.view', 'organizations.update']), crmController.disconnect);

// CRM Company Management
router.get('/companies', requireAnyPermission(['crm.companies.manage', 'crm.view', 'organizations.view']), crmController.getCompanies);
router.get('/companies/:id', requireAnyPermission(['crm.companies.manage', 'crm.view', 'organizations.view']), crmController.getCompanyById);
router.post('/companies', requireAnyPermission(['crm.companies.manage', 'organizations.create']), crmController.createCompany);
router.put('/companies/:id', requireAnyPermission(['crm.companies.manage', 'organizations.update']), crmController.updateCompany);
router.delete('/companies/:id', requirePermission('organizations.delete'), crmController.deleteCompany);
router.post('/companies/:id/reset-password', requireAnyPermission(['crm.companies.manage', 'organizations.update']), crmController.resetCompanyPassword);
router.post('/migrate-local-data', requirePermission('settings.view'), crmController.migrateLocalData);

// CRM User Management
router.get('/users', requireAnyPermission(['crm.users.manage', 'users.view', 'crm.view']), crmController.getUsers);
router.get('/users/:id', requireAnyPermission(['crm.users.manage', 'users.view']), crmController.getUserById);
router.post('/users', requireAnyPermission(['crm.users.manage', 'users.create']), crmController.createUser);
router.put('/users/:id', requireAnyPermission(['crm.users.manage', 'users.update']), crmController.updateUser);
router.delete('/users/:id', requirePermission('users.delete'), crmController.deleteUser);
router.patch('/users/:id/toggle-status', requireAnyPermission(['crm.users.manage', 'users.suspend', 'users.update']), crmController.toggleUserStatus);

// CRM Branches Management
router.get('/branches', requireAnyPermission(['crm.companies.manage', 'crm.view', 'organizations.view']), crmController.getBranches);
router.get('/branches/stats', requireAnyPermission(['crm.companies.manage', 'crm.view', 'organizations.view']), crmController.getBranchStats);
router.get('/branches/:id', requireAnyPermission(['crm.companies.manage', 'crm.view', 'organizations.view']), crmController.getBranchById);
router.get('/branches/:id/users', requireAnyPermission(['crm.users.manage', 'users.view']), crmController.getBranchUsers);
router.post('/branches', requireAnyPermission(['crm.companies.manage', 'organizations.create']), crmController.createBranch);
router.put('/branches/:id', requireAnyPermission(['crm.companies.manage', 'organizations.update']), crmController.updateBranch);
router.patch('/branches/:id/toggle-status', requireAnyPermission(['crm.companies.manage', 'organizations.update']), crmController.toggleBranchStatus);
router.delete('/branches/:id', requirePermission('organizations.delete'), crmController.deleteBranch);

// Positions & Teams & Roles
router.get('/positions', requireAnyPermission(['crm.view', 'settings.view', 'roles.view']), crmController.getPositions);
router.get('/teams', requireAnyPermission(['crm.view', 'settings.view', 'roles.view']), crmController.getTeams);
router.get('/roles', requireAnyPermission(['crm.view', 'roles.view']), crmController.getRoles);
router.get('/roles/stats', requireAnyPermission(['crm.view', 'roles.view']), crmController.getRoleStats);

// SaaS Tenant to CRM Link
router.post('/sync-organization/:id', requireAnyPermission(['crm.companies.manage', 'organizations.update']), crmController.syncOrganization);

// CRM Leads & Pipeline
router.get('/leads', requireAnyPermission(['crm.leads.manage', 'crm.view', 'organizations.view']), crmController.getLeads);
router.get('/leads/stats', requireAnyPermission(['crm.leads.manage', 'crm.view', 'dashboard.view']), crmController.getLeadStats);
router.get('/leads/:id', requireAnyPermission(['crm.leads.manage', 'crm.view', 'organizations.view']), crmController.getLeadById);
router.post('/leads', requireAnyPermission(['crm.leads.manage', 'organizations.create']), crmController.createLead);
router.patch('/leads/:id', requireAnyPermission(['crm.leads.manage', 'organizations.update']), crmController.updateLead);
router.delete('/leads/:id', requireAnyPermission(['crm.leads.manage', 'organizations.delete']), crmController.deleteLead);

// Pipeline Stages & Fields Configuration
router.get('/pipeline-stages', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getPipelineStages);
router.get('/pipeline-stages/:stageId/fields', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getStageFields);
router.get('/custom-fields', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getCustomFields);
router.get('/industry-templates', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getIndustryTemplates);

// Lead Capture Forms
router.get('/lead-capture/forms', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getLeadCaptureForms);
router.get('/lead-capture/forms/:formId/submissions', requireAnyPermission(['crm.leads.manage', 'crm.view', 'settings.view']), crmController.getFormSubmissions);

// CRM WhatsApp & Bot
router.get('/whatsapp/chats', requireAnyPermission(['crm.support.manage', 'crm.view', 'support.view', 'settings.view']), crmController.getWhatsAppChats);
router.get('/whatsapp/stats', requireAnyPermission(['crm.support.manage', 'crm.view', 'support.view', 'settings.view']), crmController.getWhatsAppStats);
router.get('/whatsapp/chats/:chatId/messages', requireAnyPermission(['crm.support.manage', 'crm.view', 'support.view', 'settings.view']), crmController.getWhatsAppChatMessages);
router.get('/whatsapp/templates', requireAnyPermission(['crm.support.manage', 'crm.view', 'support.view', 'settings.view']), crmController.getWhatsAppTemplates);
router.get('/whatsapp/quick-replies', requireAnyPermission(['crm.support.manage', 'crm.view', 'support.view', 'settings.view']), crmController.getWhatsAppQuickReplies);
router.get('/bot/settings', requireAnyPermission(['crm.support.manage', 'crm.view', 'settings.view']), crmController.getBotSettings);

// CRM Workflows & Projects
router.get('/workflows', requireAnyPermission(['crm.workflows.manage', 'crm.view', 'plans.view']), crmController.getWorkflows);
router.get('/projects', requireAnyPermission(['crm.projects.view', 'crm.leads.manage', 'crm.view', 'plans.view']), crmController.getProjects);
router.get('/projects/:id', requireAnyPermission(['crm.projects.view', 'crm.leads.manage', 'crm.view', 'plans.view']), crmController.getProjectById);
router.get('/projects/:id/inventory', requireAnyPermission(['crm.projects.view', 'crm.leads.manage', 'crm.view', 'plans.view']), crmController.getProjectInventory);
router.get('/projects/:id/tasks', requireAnyPermission(['crm.projects.view', 'crm.leads.manage', 'crm.view', 'plans.view']), crmController.getProjectTasks);

// CRM Quotations & Revenue
router.get('/quotations', requireAnyPermission(['crm.quotations.manage', 'crm.view', 'dashboard.view', 'payments.view', 'invoices.view']), crmController.getQuotations);
router.get('/quotations/stats', requireAnyPermission(['crm.quotations.manage', 'crm.view', 'dashboard.view']), crmController.getQuotationStats);
router.get('/quotations/templates', requireAnyPermission(['crm.quotations.manage', 'crm.view', 'settings.view']), crmController.getQuotationTemplates);
router.get('/quotations/:id', requireAnyPermission(['crm.quotations.manage', 'crm.view', 'dashboard.view']), crmController.getQuotationById);

// Calls & Telephony
router.get('/calls', requireAnyPermission(['crm.telephony.manage', 'crm.support.manage', 'crm.view', 'dashboard.view', 'support.view']), crmController.getCalls);
router.get('/calls/stats', requireAnyPermission(['crm.telephony.manage', 'crm.support.manage', 'crm.view', 'dashboard.view']), crmController.getCallStats);
router.get('/calls/scheduled', requireAnyPermission(['crm.telephony.manage', 'crm.support.manage', 'crm.view', 'dashboard.view']), crmController.getScheduledCalls);

// Marketing Campaigns
router.get('/campaigns', requireAnyPermission(['crm.leads.manage', 'crm.view', 'plans.view']), crmController.getCampaigns);
router.get('/campaigns/:id', requireAnyPermission(['crm.leads.manage', 'crm.view', 'plans.view']), crmController.getCampaignById);

// Verified CRM Activity Stream & Reports
router.get('/activities', requireAnyPermission(['auditLogs.view', 'crm.support.manage', 'crm.view', 'support.view']), crmController.getActivities);
router.get('/reports/summary', requireAnyPermission(['dashboard.view', 'crm.view', 'payments.view']), crmController.getReportsSummary);
router.get('/integrations', requireAnyPermission(['crm.view', 'settings.view']), crmController.getIntegrations);

module.exports = router;
