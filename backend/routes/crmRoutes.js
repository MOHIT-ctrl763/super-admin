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
router.get('/companies', requirePermission('organizations.view'), crmController.getCompanies);
router.get('/companies/:id', requirePermission('organizations.view'), crmController.getCompanyById);
router.post('/companies', requirePermission('organizations.create'), crmController.createCompany);
router.put('/companies/:id', requirePermission('organizations.update'), crmController.updateCompany);
router.delete('/companies/:id', requirePermission('organizations.delete'), crmController.deleteCompany);
router.post('/companies/:id/reset-password', requirePermission('organizations.update'), crmController.resetCompanyPassword);
router.post('/migrate-local-data', crmController.migrateLocalData);

// CRM User Management
router.get('/users', requirePermission('users.view'), crmController.getUsers);
router.get('/users/:id', requirePermission('users.view'), crmController.getUserById);
router.post('/users', requirePermission('users.create'), crmController.createUser);
router.put('/users/:id', requirePermission('users.update'), crmController.updateUser);
router.delete('/users/:id', requirePermission('users.delete'), crmController.deleteUser);
router.patch('/users/:id/toggle-status', requirePermission('users.suspend'), crmController.toggleUserStatus);

// CRM Branches Management
router.get('/branches', requirePermission('organizations.view'), crmController.getBranches);
router.get('/branches/stats', requirePermission('organizations.view'), crmController.getBranchStats);
router.get('/branches/:id', requirePermission('organizations.view'), crmController.getBranchById);
router.get('/branches/:id/users', requirePermission('users.view'), crmController.getBranchUsers);
router.post('/branches', requirePermission('organizations.create'), crmController.createBranch);
router.put('/branches/:id', requirePermission('organizations.update'), crmController.updateBranch);
router.patch('/branches/:id/toggle-status', requirePermission('organizations.update'), crmController.toggleBranchStatus);
router.delete('/branches/:id', requirePermission('organizations.delete'), crmController.deleteBranch);

// Positions & Teams & Roles
router.get('/positions', requirePermission('settings.view'), crmController.getPositions);
router.get('/teams', requirePermission('settings.view'), crmController.getTeams);
router.get('/roles', requirePermission('roles.view'), crmController.getRoles);
router.get('/roles/stats', requirePermission('roles.view'), crmController.getRoleStats);

// SaaS Tenant to CRM Link
router.post('/sync-organization/:id', requirePermission('organizations.update'), crmController.syncOrganization);

// CRM Leads & Pipeline
router.get('/leads', requirePermission('organizations.view'), crmController.getLeads);
router.get('/leads/stats', requirePermission('dashboard.view'), crmController.getLeadStats);
router.get('/leads/:id', requirePermission('organizations.view'), crmController.getLeadById);
router.post('/leads', requirePermission('organizations.create'), crmController.createLead);
router.patch('/leads/:id', requirePermission('organizations.update'), crmController.updateLead);
router.delete('/leads/:id', requirePermission('organizations.delete'), crmController.deleteLead);

// Pipeline Stages & Fields Configuration
router.get('/pipeline-stages', requirePermission('settings.view'), crmController.getPipelineStages);
router.get('/pipeline-stages/:stageId/fields', requirePermission('settings.view'), crmController.getStageFields);
router.get('/custom-fields', requirePermission('settings.view'), crmController.getCustomFields);
router.get('/industry-templates', requirePermission('settings.view'), crmController.getIndustryTemplates);

// Lead Capture Forms
router.get('/lead-capture/forms', requirePermission('settings.view'), crmController.getLeadCaptureForms);
router.get('/lead-capture/forms/:formId/submissions', requirePermission('settings.view'), crmController.getFormSubmissions);

// CRM WhatsApp & Bot
router.get('/whatsapp/chats', requirePermission('settings.view'), crmController.getWhatsAppChats);
router.get('/whatsapp/stats', requirePermission('settings.view'), crmController.getWhatsAppStats);
router.get('/whatsapp/chats/:chatId/messages', requirePermission('settings.view'), crmController.getWhatsAppChatMessages);
router.get('/whatsapp/templates', requirePermission('settings.view'), crmController.getWhatsAppTemplates);
router.get('/whatsapp/quick-replies', requirePermission('settings.view'), crmController.getWhatsAppQuickReplies);
router.get('/bot/settings', requirePermission('settings.view'), crmController.getBotSettings);

// CRM Workflows & Projects
router.get('/workflows', requirePermission('plans.view'), crmController.getWorkflows);
router.get('/projects', requirePermission('plans.view'), crmController.getProjects);
router.get('/projects/:id', requirePermission('plans.view'), crmController.getProjectById);
router.get('/projects/:id/inventory', requirePermission('plans.view'), crmController.getProjectInventory);
router.get('/projects/:id/tasks', requirePermission('plans.view'), crmController.getProjectTasks);

// CRM Quotations & Revenue
router.get('/quotations', requirePermission('dashboard.view'), crmController.getQuotations);
router.get('/quotations/stats', requirePermission('dashboard.view'), crmController.getQuotationStats);
router.get('/quotations/templates', requirePermission('settings.view'), crmController.getQuotationTemplates);
router.get('/quotations/:id', requirePermission('dashboard.view'), crmController.getQuotationById);

// Calls & Telephony
router.get('/calls', requirePermission('dashboard.view'), crmController.getCalls);
router.get('/calls/stats', requirePermission('dashboard.view'), crmController.getCallStats);
router.get('/calls/scheduled', requirePermission('dashboard.view'), crmController.getScheduledCalls);

// Marketing Campaigns
router.get('/campaigns', requirePermission('plans.view'), crmController.getCampaigns);
router.get('/campaigns/:id', requirePermission('plans.view'), crmController.getCampaignById);

// Verified CRM Activity Stream & Reports
router.get('/activities', requirePermission('auditLogs.view'), crmController.getActivities);
router.get('/reports/summary', requirePermission('dashboard.view'), crmController.getReportsSummary);
router.get('/integrations', requirePermission('settings.view'), crmController.getIntegrations);

module.exports = router;
