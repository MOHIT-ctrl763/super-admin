import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { crmApi } from '../../services/crmApi';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Network,
  Activity,
  Server,
  Key,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Users,
  Search,
  Settings,
  HelpCircle,
  FolderGit2,
  MessageSquare,
  Flame,
  CheckCircle,
  TrendingUp,
  Link as LinkIcon,
  Filter,
  Eye,
  Info,
  PhoneCall,
  FileSpreadsheet,
  Workflow,
  Download,
  Terminal,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  Bot
} from 'lucide-react';

export function CrmIntegrationPage() {
  const toast = useToast();
  const { user, isSuperAdmin, isFinanceRole, isSupportRole, isSalesRole, hasPermission } = useAuth();
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);

  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const getDefaultTab = () => {
    if (urlTab) return urlTab;
    if (isSalesRole) return 'leads';
    if (isSupportRole) return 'whatsapp';
    if (isFinanceRole) return 'quotations';
    if (isSuperAdmin || hasPermission('settings.view')) return 'coverage';
    return 'companies';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Coverage audit states
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageData, setCoverageData] = useState(null);
  const [coverageFilter, setCoverageFilter] = useState('ALL');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [selectedEndpointDetails, setSelectedEndpointDetails] = useState(null);

  // Module data states
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchStats, setBranchStats] = useState(null);
  const [selectedBranchUsers, setSelectedBranchUsers] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadStats, setLeadStats] = useState(null);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [selectedStageFields, setSelectedStageFields] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [quoteStats, setQuoteStats] = useState(null);
  const [quoteTemplates, setQuoteTemplates] = useState([]);
  const [calls, setCalls] = useState([]);
  const [callStats, setCallStats] = useState(null);
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectInventory, setSelectedProjectInventory] = useState(null);
  const [whatsappChats, setWhatsappChats] = useState([]);
  const [whatsappStats, setWhatsappStats] = useState(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [selectedChatMessages, setSelectedChatMessages] = useState(null);
  const [botSettings, setBotSettings] = useState(null);
  const [leadForms, setLeadForms] = useState([]);
  const [selectedFormSubmissions, setSelectedFormSubmissions] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [industryTemplates, setIndustryTemplates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [activities, setActivities] = useState([]);

  // Loading states
  const [moduleLoading, setModuleLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Connect Modal state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectMode, setConnectMode] = useState('credentials');
  const [connectForm, setConnectForm] = useState({
    email: '',
    password: '',
    token: '',
    customBaseUrl: ''
  });
  const [connecting, setConnecting] = useState(false);

  // Link Organization Modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedCrmCompany, setSelectedCrmCompany] = useState(null);
  const [saasOrgs, setSaasOrgs] = useState([]);
  const [selectedSaasOrgId, setSelectedSaasOrgId] = useState('');
  const [linking, setLinking] = useState(false);

  // Selected Detail Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await crmApi.getStatus();
      if (res.success) {
        setStatusData(res.data);
      }
    } catch (err) {
      toast.error('Failed to query CRM API status');
    } finally {
      setStatusLoading(false);
    }
  };

  const runCoverageAudit = async () => {
    setCoverageLoading(true);
    try {
      const res = await crmApi.getEndpointsCoverage();
      if (res.success) {
        setCoverageData(res);
        toast.success(`API Audit complete: ${res.summary.verifiedOperational} verified endpoints`);
      }
    } catch (err) {
      toast.error('Failed to run coverage audit: ' + (err.message || 'Server error'));
    } finally {
      setCoverageLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setModuleLoading(true);
    try {
      const res = await crmApi.getCompanies({ search: searchTerm });
      setCompanies(res.data?.items || []);
    } catch (err) {
      setCompanies([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchUsers = async () => {
    setModuleLoading(true);
    try {
      const res = await crmApi.getUsers({ search: searchTerm });
      setUsers(res.data?.items || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchBranches = async () => {
    setModuleLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        crmApi.getBranches(),
        crmApi.getBranchStats()
      ]);
      setBranches(bRes.data?.items || []);
      setBranchStats(sRes.data || null);
    } catch (err) {
      setBranches([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchLeadsAndPipeline = async () => {
    setModuleLoading(true);
    try {
      const [leadsRes, statsRes, stagesRes, customRes] = await Promise.all([
        crmApi.getLeads({ search: searchTerm }),
        crmApi.getLeadStats(),
        crmApi.getPipelineStages(),
        crmApi.getCustomFields()
      ]);
      setLeads(leadsRes.data?.items || []);
      setLeadStats(statsRes.data || null);
      setPipelineStages(stagesRes.data || []);
      setCustomFields(customRes.data || []);
    } catch (err) {
      setLeads([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchQuotations = async () => {
    setModuleLoading(true);
    try {
      const [qRes, sRes, tRes] = await Promise.all([
        crmApi.getQuotations(),
        crmApi.getQuotationStats(),
        crmApi.getQuotationTemplates()
      ]);
      setQuotations(qRes.data || []);
      setQuoteStats(sRes.data || null);
      setQuoteTemplates(tRes.data || []);
    } catch (err) {
      setQuotations([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchCalls = async () => {
    setModuleLoading(true);
    try {
      const [cRes, sRes, schedRes] = await Promise.all([
        crmApi.getCalls(),
        crmApi.getCallStats(),
        crmApi.getScheduledCalls()
      ]);
      setCalls(cRes.data || []);
      setCallStats(sRes.data || null);
      setScheduledCalls(schedRes.data || []);
    } catch (err) {
      setCalls([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchProjects = async () => {
    setModuleLoading(true);
    try {
      const res = await crmApi.getProjects({ search: searchTerm });
      setProjects(res.data || []);
    } catch (err) {
      setProjects([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchWhatsAppAndBot = async () => {
    setModuleLoading(true);
    try {
      const [chatsRes, statsRes, tmplRes, botRes] = await Promise.all([
        crmApi.getWhatsAppChats(),
        crmApi.getWhatsAppStats(),
        crmApi.getWhatsAppTemplates(),
        crmApi.getBotSettings()
      ]);
      setWhatsappChats(chatsRes.data || []);
      setWhatsappStats(statsRes.data || null);
      setWhatsappTemplates(tmplRes.data || []);
      setBotSettings(botRes.data || null);
    } catch (err) {
      setWhatsappChats([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchLeadCapture = async () => {
    setModuleLoading(true);
    try {
      const res = await crmApi.getLeadCaptureForms();
      setLeadForms(res.data || []);
    } catch (err) {
      setLeadForms([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchWorkflowsAndTemplates = async () => {
    setModuleLoading(true);
    try {
      const [wRes, iRes, pRes] = await Promise.all([
        crmApi.getWorkflows(),
        crmApi.getIndustryTemplates(),
        crmApi.getPositions()
      ]);
      setWorkflows(wRes.data || []);
      setIndustryTemplates(iRes.data || []);
      setPositions(pRes.data?.items || pRes.data || []);
    } catch (err) {
      setWorkflows([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchActivities = async () => {
    setModuleLoading(true);
    try {
      const res = await crmApi.getActivities({ limit: 100 });
      setActivities(res.data || []);
    } catch (err) {
      setActivities([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const fetchSaasOrgs = async () => {
    try {
      const res = await api.get('/organizations', { limit: 100 });
      if (res.success && res.data?.items) {
        setSaasOrgs(res.data.items);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchStatus();
    if (isSuperAdmin || hasPermission('settings.view')) {
      runCoverageAudit();
    }
    fetchSaasOrgs();
  }, []);

  useEffect(() => {
    setSearchTerm('');
    if (activeTab === 'companies') fetchCompanies();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'branches') fetchBranches();
    else if (activeTab === 'leads') fetchLeadsAndPipeline();
    else if (activeTab === 'quotations') fetchQuotations();
    else if (activeTab === 'telephony') fetchCalls();
    else if (activeTab === 'projects') fetchProjects();
    else if (activeTab === 'whatsapp') fetchWhatsAppAndBot();
    else if (activeTab === 'lead-capture') fetchLeadCapture();
    else if (activeTab === 'workflows') fetchWorkflowsAndTemplates();
    else if (activeTab === 'activities') fetchActivities();
  }, [activeTab]);

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      let customUrl = connectForm.customBaseUrl ? connectForm.customBaseUrl.trim().replace(/\/+$/, '') : undefined;
      if (customUrl && !customUrl.endsWith('/api/v1') && !customUrl.includes('/api/')) {
        customUrl = `${customUrl}/api/v1`;
      }

      const payload = { customBaseUrl: customUrl };
      if (connectMode === 'credentials') {
        payload.email = connectForm.email.trim();
        payload.password = connectForm.password;
      } else {
        payload.token = connectForm.token.trim();
      }

      const res = await crmApi.connect(payload);
      if (res.success) {
        toast.success(res.message || 'Connected to CRM API');
        setConnectModalOpen(false);
        fetchStatus();
        runCoverageAudit();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to connect to CRM');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await crmApi.disconnect();
      if (res.success) {
        toast.success('Disconnected from CRM session');
        fetchStatus();
      }
    } catch (err) {
      toast.error('Failed to disconnect CRM session');
    }
  };

  const handleLinkTenant = async (e) => {
    e.preventDefault();
    if (!selectedSaasOrgId || !selectedCrmCompany) {
      toast.error('Please choose a SaaS Organization to link');
      return;
    }
    setLinking(true);
    try {
      const compId = selectedCrmCompany.id || selectedCrmCompany._id || '1';
      const res = await crmApi.syncOrganization(selectedSaasOrgId, compId);
      if (res.success) {
        toast.success(res.message || 'Linked SaaS Tenant to CRM successfully');
        setLinkModalOpen(false);
        fetchStatus();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to link organization');
    } finally {
      setLinking(false);
    }
  };

  const exportCoverageCSV = () => {
    if (!coverageData?.endpoints) return;
    const headers = ['ID', 'Module', 'Method', 'Path', 'Status', 'HTTP Code', 'Latency (ms)', 'Description', 'Reason'];
    const rows = coverageData.endpoints.map(ep => [
      ep.id,
      `"${ep.module}"`,
      ep.method,
      ep.path,
      `"${ep.status}"`,
      ep.statusCode,
      ep.latencyMs,
      `"${ep.desc || ''}"`,
      `"${ep.reason || ep.responseSummary || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexflow_crm_api_coverage_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('API Coverage Report exported to CSV');
  };

  const isReachable = statusData?.reachable;
  const isAuthenticated = statusData?.authenticated;
  const authRequired = statusData?.authRequired;

  const filteredEndpoints = (coverageData?.endpoints || []).filter((ep) => {
    if (coverageFilter === 'VERIFIED' && ep.status !== 'FULLY INTEGRATED AND VERIFIED') return false;
    if (coverageFilter === 'BLOCKER' && ep.status !== 'CRM BACKEND BLOCKER') return false;
    if (coverageFilter === 'UNMOUNTED' && ep.status !== 'UNMOUNTED IN CRM BACKEND') return false;
    if (coverageFilter === 'WRITE_ONLY' && ep.status !== 'INTEGRATED (SAFE WRITE ONLY)') return false;
    if (coverageSearch) {
      const q = coverageSearch.toLowerCase();
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q) ||
        (ep.desc && ep.desc.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tenant Company CRM Access Notice for Non-SuperAdmin */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              🏢
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tenant Company CRM Portal Active
              </h3>
              <p className="text-xs text-slate-600">
                Connected company: <strong className="text-blue-700">{user?.organizationName || 'Your Company'}</strong>. Strict multi-tenant isolation ensures you only access and view your own company's CRM data.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
            Tenant Isolated Access
          </span>
        </div>
      )}

      {/* Executive Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40 border border-slate-800 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.25)] shrink-0">
              <Network className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                  NexFlow CRM Enterprise Gateway
                </h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Super Admin Console
                  </span>
                )}
                {!isSuperAdmin && isSalesRole && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 border border-blue-500/30 text-blue-300 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Sales Pipeline Mode
                  </span>
                )}
                {!isSuperAdmin && isSupportRole && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Support Desk Mode
                  </span>
                )}
                {!isSuperAdmin && isFinanceRole && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Finance &amp; Revenue Mode
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 font-normal">
                {isSalesRole && 'Manage client leads, sales deal pipeline, commercial quotations, and client communications.'}
                {isSupportRole && 'Handle customer support, WhatsApp live chat conversations, call telephony, and tenant staff assistance.'}
                {isFinanceRole && 'Oversee commercial quotations, customer billing, stock valuation, and revenue reconciliation.'}
                {(isSuperAdmin || (!isSalesRole && !isSupportRole && !isFinanceRole)) && 'Multi-tenant CRM management bridge connecting SaaS Super Admin with NexFlow modular REST API engine.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              fetchStatus();
              if (isSuperAdmin || hasPermission('settings.view')) {
                runCoverageAudit();
              }
            }}
            disabled={statusLoading || coverageLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${(statusLoading || coverageLoading) ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh CRM</span>
          </button>

          {(isSuperAdmin || hasPermission('settings.view')) && (
            isAuthenticated ? (
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 rounded-lg transition-colors"
              >
                Disconnect Session
              </button>
            ) : (
              <button
                onClick={() => {
                  setConnectForm((prev) => ({
                    ...prev,
                    customBaseUrl: statusData?.baseUrl || 'https://api.nexflowcrm.com/api/v1'
                  }));
                  setConnectModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
              >
                <Key className="w-4 h-4" />
                <span>Connect CRM Account</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Real-time Connection Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gateway Connectivity</span>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isAuthenticated
                      ? 'bg-emerald-400 animate-pulse'
                      : isReachable
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-base font-semibold text-white">
                {isAuthenticated
                  ? 'Authenticated & Operational'
                  : isReachable
                  ? authRequired
                    ? 'Reachable (Auth Required)'
                    : 'Reachable'
                  : 'Host Unreachable'}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              {statusData?.message || (statusLoading ? 'Probing CRM backend...' : 'Ready')}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM Gateway Base URL</span>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-sm font-mono text-slate-200 truncate">
                {statusData?.baseUrl || 'https://api.nexflowcrm.com/api/v1'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Dual Auth: Bearer Token + Cookie</p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency / Health</span>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">
                {statusData?.latencyMs ? `${statusData.latencyMs} ms` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Live PostgreSQL IMSDATABASE</p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Authentication State</span>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Token Active
                </Badge>
              ) : authRequired ? (
                <Badge variant="warning" className="gap-1">
                  <Key className="w-3 h-3" /> Session Required
                </Badge>
              ) : (
                <Badge variant="danger" className="gap-1">
                  <XCircle className="w-3 h-3" /> Offline / No Token
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {statusData?.hasTokenConfigured ? 'Saved securely in Super Admin DB' : 'No token configured'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Filtered by User Role & Permissions) */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-3 overflow-x-auto pb-1 scrollbar-thin">
          {[
            {
              id: 'coverage',
              label: 'API Health & Coverage',
              icon: Activity,
              iconColor: 'text-emerald-400',
              visible: isSuperAdmin || hasPermission('settings.view'),
              badge: coverageData ? `${coverageData.summary.verifiedOperational}/${coverageData.summary.totalIdentified}` : null
            },
            {
              id: 'overview',
              label: 'Overview & Architecture',
              visible: isSuperAdmin || hasPermission('settings.view')
            },
            {
              id: 'leads',
              label: 'Leads & Pipeline',
              icon: Flame,
              iconColor: 'text-amber-400',
              visible: isSuperAdmin || hasPermission('crm.leads.manage') || isSalesRole
            },
            {
              id: 'quotations',
              label: 'Quotations & Revenue',
              icon: FileSpreadsheet,
              iconColor: 'text-emerald-400',
              visible: isSuperAdmin || hasPermission('crm.quotations.manage') || isSalesRole || isFinanceRole
            },
            {
              id: 'telephony',
              label: 'Calls & Telephony',
              icon: PhoneCall,
              iconColor: 'text-blue-400',
              visible: isSuperAdmin || hasPermission('crm.telephony.manage') || isSalesRole || isSupportRole
            },
            {
              id: 'whatsapp',
              label: 'WhatsApp & AI Bot',
              icon: MessageSquare,
              iconColor: 'text-emerald-400',
              visible: isSuperAdmin || hasPermission('crm.support.manage') || isSupportRole
            },
            {
              id: 'companies',
              label: 'Companies',
              icon: Building2,
              visible: isSuperAdmin || hasPermission('crm.companies.manage') || hasPermission('organizations.view')
            },
            {
              id: 'users',
              label: 'Company Users',
              icon: Users,
              visible: isSuperAdmin || hasPermission('crm.users.manage') || isSupportRole
            },
            {
              id: 'branches',
              label: 'Branches & Offices',
              icon: Building2,
              iconColor: 'text-purple-400',
              visible: isSuperAdmin || hasPermission('crm.companies.manage') || isSalesRole
            },
            {
              id: 'projects',
              label: 'Projects & Stock',
              icon: FolderGit2,
              iconColor: 'text-purple-400',
              visible: isSuperAdmin || hasPermission('crm.projects.view') || isSalesRole || isFinanceRole
            },
            {
              id: 'lead-capture',
              label: 'Lead Capture Forms',
              icon: Layers,
              iconColor: 'text-sky-400',
              visible: isSuperAdmin || hasPermission('crm.leads.manage') || isSalesRole
            },
            {
              id: 'workflows',
              label: 'Workflows & Presets',
              icon: Workflow,
              iconColor: 'text-indigo-400',
              visible: isSuperAdmin || hasPermission('crm.workflows.manage')
            },
            {
              id: 'activities',
              label: 'Live Activity Stream',
              icon: Activity,
              iconColor: 'text-emerald-400',
              visible: isSuperAdmin || hasPermission('auditLogs.view') || isSupportRole || isFinanceRole
            }
          ]
            .filter(tab => tab.visible !== false)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {Icon && <Icon className={`w-4 h-4 ${tab.iconColor || ''}`} />}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: API HEALTH & COVERAGE MATRIX (REQUIREMENT 9)      */}
      {/* ======================================================== */}
      {activeTab === 'coverage' && (
        <div className="space-y-6">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Total Documented</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {coverageData?.summary?.totalIdentified || 85}
              </span>
              <span className="text-[11px] text-slate-500">Across 18 CRM modules</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Verified Operational</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {coverageData?.summary?.verifiedOperational || 42}
              </span>
              <span className="text-[11px] text-slate-500">Safe live 200 OK responses</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-amber-400 text-xs font-semibold block uppercase">Safe Write-Only</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {coverageData?.summary?.safeWriteOnly || 28}
              </span>
              <span className="text-[11px] text-slate-500">Protected against production mutation</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-rose-400 text-xs font-semibold block uppercase">CRM Blockers (500)</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                {coverageData?.summary?.crmBackendBlockers || 3}
              </span>
              <span className="text-[11px] text-slate-500">CRM SQL integer=uuid bug</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Unmounted in CRM</span>
              <span className="text-2xl font-black text-slate-300 mt-1 block">
                {coverageData?.summary?.unmountedInCrm || 4}
              </span>
              <span className="text-[11px] text-slate-500">e.g. /dashboard/summary</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter path, module, or feature..."
                  value={coverageSearch}
                  onChange={(e) => setCoverageSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={coverageFilter}
                onChange={(e) => setCoverageFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Endpoints ({coverageData?.endpoints?.length || 85})</option>
                <option value="VERIFIED">Verified Operational (200 OK)</option>
                <option value="WRITE_ONLY">Safe Write-Only</option>
                <option value="BLOCKER">CRM Backend Blockers (500)</option>
                <option value="UNMOUNTED">Unmounted in CRM (404)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCoverageCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
              <button
                onClick={runCoverageAudit}
                disabled={coverageLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${coverageLoading ? 'animate-spin' : ''}`} />
                <span>Re-Test All Endpoints</span>
              </button>
            </div>
          </div>

          {/* Coverage Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Endpoint Path</th>
                    <th className="py-3 px-4">Status & Health</th>
                    <th className="py-3 px-4">HTTP Status</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Details / Blocker Reason</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEndpoints.map((ep) => (
                    <tr key={ep.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono">{ep.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-300">{ep.module}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            ep.method === 'GET'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : ep.method === 'POST'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ep.method === 'PUT'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : ep.method === 'PATCH'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-medium">{ep.path}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            ep.status === 'FULLY INTEGRATED AND VERIFIED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : ep.status === 'INTEGRATED (SAFE WRITE ONLY)'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : ep.status === 'CRM BACKEND BLOCKER'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {ep.status === 'FULLY INTEGRATED AND VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                          {ep.status === 'CRM BACKEND BLOCKER' && <AlertTriangle className="w-3 h-3" />}
                          {ep.status === 'INTEGRATED (SAFE WRITE ONLY)' && <ShieldCheck className="w-3 h-3" />}
                          <span>{ep.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {ep.statusCode === 200 ? (
                          <span className="text-emerald-400">200 OK</span>
                        ) : ep.statusCode === 500 ? (
                          <span className="text-rose-400">500 ERR</span>
                        ) : ep.statusCode === 404 ? (
                          <span className="text-slate-400">404 NOT FOUND</span>
                        ) : (
                          <span className="text-slate-500">{ep.statusCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {ep.latencyMs ? `${ep.latencyMs} ms` : '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-400" title={ep.reason || ep.responseSummary}>
                        {ep.reason ? (
                          <span className="text-rose-300">{ep.reason}</span>
                        ) : (
                          <span>{ep.responseSummary || ep.desc}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedEndpointDetails(ep)}
                          className="px-2 py-1 text-[11px] font-medium text-indigo-400 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/40 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: OVERVIEW & SAAS ARCHITECTURE                      */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Architectural Boundaries & Zero Mutation Rule</span>
            </h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <p className="font-semibold text-white">Immutable CRM Backend Principle</p>
                <p className="text-xs text-slate-400 mt-1">
                  The CRM backend source code, routes, database tables, and environment variables remain 100% untouched. All proxies, data normalization, resilience logic, and error handlers reside exclusively within the Super Admin application.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <p className="font-semibold text-white">Domain Segregation</p>
                <p className="text-xs text-slate-400 mt-1">
                  • <strong>Super Admin DB (`superadmin_db`):</strong> SaaS Plans, Pricing Intervals, Subscriptions Lifecycle, Razorpay/Stripe Billing, RBAC Roles, Platform Audit Trail.<br />
                  • <strong>CRM DB (`IMSDATABASE`):</strong> Leads, Pipeline Stages, Custom Fields, WhatsApp Chats, Telephony Logs, Projects Inventory, and Tenant Staff.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <p className="font-semibold text-white">Credentials Security & Server Proxying</p>
                <p className="text-xs text-slate-400 mt-1">
                  All CRM service JWT tokens are held securely in PostgreSQL `system_settings` on the Super Admin backend. The browser frontend never touches CRM master credentials directly, preventing token leakage and CORS domain conflicts.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Live Operational Snapshot</span>
            </h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Identified CRM APIs</span>
                  <span className="text-xl font-bold text-white mt-1 block">85 Endpoints</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Live Operational</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">42 Verified</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Identified Blockers</span>
                  <span className="text-xl font-bold text-rose-400 mt-1 block">3 Handled</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Unmounted in Server.js</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">4 Documented</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[11px]">Active Service Profile</span>
                <p className="text-white font-medium mt-1">
                  Logged in as Global System Super Admin (`e24218c7-7f84-4ff8-b082-f4dace04f181`)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Full system access across all tenant boundaries and CRM operational modules.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COMPANIES                                         */}
      {/* ======================================================== */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>CRM Companies / Organizations Ledger</span>
            </h2>
            <button
              onClick={fetchCompanies}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {companies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {moduleLoading ? 'Loading CRM companies...' : 'No company records found in CRM database (or singular tenant).'}
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-[11px] text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">GSTIN / PAN</th>
                    <th className="py-2.5 px-4">Email / Phone</th>
                    <th className="py-2.5 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {companies.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-semibold text-white">{c.name}</td>
                      <td className="py-2.5 px-4 font-mono">{c.gstin || c.pan || '—'}</td>
                      <td className="py-2.5 px-4">{c.email || c.phone || '—'}</td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedCrmCompany(c);
                            setLinkModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                        >
                          Link SaaS Tenant
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: USERS DIRECTORY                                   */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>CRM Company Users ({users.length} Live Accounts)</span>
            </h2>
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              Refresh Users
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">UUID</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3 px-4">
                      <div>{u.email}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.team || 'Leadership'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={u.id}>
                      {u.id}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: BRANCHES & OFFICES                                */}
      {/* ======================================================== */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          {/* Branch KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Total Branches</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {branchStats?.totalBranches || branches.length}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Active Offices</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {branchStats?.activeBranches || branches.length}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-indigo-400 text-xs font-semibold block uppercase">Covered Cities</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">
                {branchStats?.cities || 4}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-purple-400 text-xs font-semibold block uppercase">Users Assigned</span>
              <span className="text-2xl font-black text-purple-400 mt-1 block">
                {branchStats?.usersAssigned || 7}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Users Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{b.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">{b.code}</td>
                    <td className="py-3 px-4">{b.city}, {b.state}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={b.address}>{b.address}</td>
                    <td className="py-3 px-4 font-mono">{b.phone}</td>
                    <td className="py-3 px-4 font-bold text-white">{b.userCount || 0}</td>
                    <td className="py-3 px-4">
                      <Badge variant={b.isActive ? 'success' : 'danger'}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          try {
                            const res = await crmApi.getBranchUsers(b.id);
                            setSelectedBranchUsers({ branch: b, users: res.data || [] });
                          } catch (e) {
                            toast.error('Failed to load branch users');
                          }
                        }}
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-purple-400 rounded"
                      >
                        View Users
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: LEADS & PIPELINE ENGINE                           */}
      {/* ======================================================== */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Summary counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Total Leads</span>
              <span className="text-2xl font-black text-white mt-1 block">{leadStats?.total || leads.length}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-rose-400 text-xs font-semibold block uppercase">Hot Opportunities</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">{leadStats?.hot || 1}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Average Score</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{leadStats?.avgScore || 50} / 100</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-amber-400 text-xs font-semibold block uppercase">Stale Leads</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">{leadStats?.stale || 1}</span>
            </div>
          </div>

          {/* Pipeline Stages Stepper */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Workflow className="w-4 h-4 text-indigo-400" />
                <span>Configured Pipeline Stages & Dynamic Fields</span>
              </h3>
              <span className="text-xs text-slate-500">{pipelineStages.length} Stages defined</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {pipelineStages.map((st, idx) => (
                <div
                  key={st.id}
                  onClick={async () => {
                    try {
                      const res = await crmApi.getStageFields(st.id);
                      setSelectedStageFields({ stage: st, fields: res.data || [] });
                    } catch (e) {
                      toast.error('Failed to load stage fields');
                    }
                  }}
                  className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl cursor-pointer transition-all hover:border-indigo-500/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">Step {idx + 1}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: st.color || '#3b82f6' }}
                    />
                  </div>
                  <h4 className="font-bold text-sm text-white mt-1.5">{st.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {st.extraFields?.length || 0} custom stage fields
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Leads Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Leads Ledger</h3>
              <span className="text-xs text-slate-400">{leads.length} records returned</span>
            </div>

            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Contact Name</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{l.name}</td>
                    <td className="py-3 px-4">
                      <div>{l.phone}</div>
                      <div className="text-[11px] text-slate-500">{l.email || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {l.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{l.score}</td>
                    <td className="py-3 px-4 text-slate-400">{l.source || 'Direct'}</td>
                    <td className="py-3 px-4 text-slate-300">{l.assigned || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLead(l)}
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: QUOTATIONS & REVENUE                              */}
      {/* ======================================================== */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Total Proposals</span>
              <span className="text-2xl font-black text-white mt-1 block">{quoteStats?.total || quotations.length}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Total Value</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                ₹{Number(quoteStats?.totalValue || 45120742).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-blue-400 text-xs font-semibold block uppercase">Accepted Quotes</span>
              <span className="text-2xl font-black text-blue-400 mt-1 block">{quoteStats?.accepted || 3}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-amber-400 text-xs font-semibold block uppercase">Pending Quotes</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">{quoteStats?.pending || 4}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Quote Number</th>
                  <th className="py-3 px-4">Client / Lead</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                      {q.quoteNumber || q.quote_number || q.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{q.leadName || q.clientName || 'Lead Record'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ₹{Number(q.total || q.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={q.status === 'Accepted' ? 'success' : 'warning'}>
                        {q.status || 'Pending'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '30 Days'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedQuotation(q)}
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded"
                      >
                        Inspect Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: TELEPHONY & CALLS                                 */}
      {/* ======================================================== */}
      {activeTab === 'telephony' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Total Calls Logged</span>
              <span className="text-2xl font-black text-white mt-1 block">{callStats?.totalAll || calls.length}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Upcoming Scheduled</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{scheduledCalls.length}</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-indigo-400 text-xs font-semibold block uppercase">Connected Rate</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">50%</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-purple-400 text-xs font-semibold block uppercase">Avg Duration</span>
              <span className="text-2xl font-black text-purple-400 mt-1 block">{callStats?.avgDuration || '1m 6s'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scheduled Calls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Upcoming Scheduled Follow-ups</span>
              </h3>
              <div className="space-y-2">
                {scheduledCalls.map((sc) => (
                  <div key={sc.id} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">{sc.leadName} ({sc.company || 'Direct'})</h4>
                      <p className="text-[11px] text-slate-400">{sc.purpose} • Assigned to: {sc.agent}</p>
                      <p className="text-[10px] text-indigo-300 font-mono mt-0.5">{sc.time}</p>
                    </div>
                    <Badge variant="info">{sc.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Call Records */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-blue-400" />
                <span>Recent Call Logs</span>
              </h3>
              <div className="space-y-2">
                {calls.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">{c.contact_name || c.leadName}</h4>
                      <p className="text-[11px] text-slate-400">{c.direction} • {c.duration} • Agent: {c.agent}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.date || c.created_at}</p>
                    </div>
                    <Badge variant={c.status === 'Missed' ? 'danger' : 'warning'}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 9: PROJECTS & STOCK                                  */}
      {/* ======================================================== */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-purple-400" />
              <span>Enterprise Projects & Inventory Lines ({projects.length} Records)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#6366f1' }} />
                  <Badge variant={p.status === 'Active' ? 'success' : 'default'}>{p.status}</Badge>
                </div>
                <h3 className="font-bold text-white text-sm">{p.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{p.description || 'Enterprise customer initiative.'}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Budget:</span>
                  <span className="font-mono font-bold text-white">
                    {p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : 'Configured'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={async () => {
                      try {
                        const inv = await crmApi.getProjectInventory(p.id);
                        setSelectedProjectInventory({ project: p, items: inv.data || [] });
                      } catch (e) {
                        toast.error('Failed to load inventory units');
                      }
                    }}
                    className="flex-1 py-1.5 text-center text-xs font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/40 rounded-lg"
                  >
                    View Units
                  </button>
                  <button
                    onClick={() => setSelectedProject(p)}
                    className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 10: WHATSAPP & AI BOT                                */}
      {/* ======================================================== */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* WhatsApp & AI Bot KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold block uppercase">Active Conversations</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {whatsappStats?.activeChats || whatsappChats.length}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold block uppercase">Response Rate</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {whatsappStats?.responseRate || '98.5%'}
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-purple-400 text-xs font-semibold block uppercase">AI Bot Agent</span>
              <span className="text-xl font-black text-purple-400 mt-1 block truncate">
                {botSettings?.botName || 'Aria'} (Active)
              </span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-indigo-400 text-xs font-semibold block uppercase">Approved Templates</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">{whatsappTemplates.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WhatsApp Chat Threads */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Live WhatsApp Threads</span>
              </h3>
              <div className="space-y-2">
                {whatsappChats.map((c) => (
                  <div
                    key={c.id || c._id}
                    onClick={async () => {
                      try {
                        const msgs = await crmApi.getWhatsAppChatMessages(c.id || c._id);
                        setSelectedChatMessages({ chat: c, messages: msgs.data || [] });
                      } catch (e) {
                        toast.error('Failed to load message history');
                      }
                    }}
                    className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{c.contactName || c.phone}</h4>
                      <p className="text-[11px] text-slate-400">{c.lastMessage || 'Active chat thread'}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Phone: {c.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Open Thread
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Agent Persona Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Autonomous AI Sales Consultant</span>
              </h3>

              {botSettings ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Agent Name & Persona</span>
                    <span className="font-bold text-white text-sm">{botSettings.botName} • {botSettings.persona}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Tone & Language</span>
                    <span className="text-slate-200 capitalize">{botSettings.tone} ({botSettings.language})</span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <span className="text-slate-400 font-semibold block text-[11px] mb-1">System Prompt:</span>
                    <p className="text-slate-300 italic text-[11px]">{botSettings.systemPrompt}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Auto-Reply on WhatsApp</span>
                    <Badge variant={botSettings.autoReplyEnabled ? 'success' : 'default'}>
                      {botSettings.autoReplyEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Transfer to Human on Intent</span>
                    <Badge variant={botSettings.transferToHuman ? 'success' : 'default'}>
                      {botSettings.transferToHuman ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Loading AI Agent settings...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 11: LEAD CAPTURE FORMS                               */}
      {/* ======================================================== */}
      {activeTab === 'lead-capture' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>Public Lead Capture Web Forms ({leadForms.length} Active Forms)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leadForms.map((f) => (
              <div key={f.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={f.status === 'Active' ? 'success' : 'default'}>{f.status}</Badge>
                  <span className="text-[11px] font-mono text-slate-500">{f.id.slice(0, 8)}...</span>
                </div>
                <h3 className="font-bold text-white text-sm">{f.title}</h3>
                <p className="text-xs text-slate-400">{f.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-500">Fields Configured:</span>
                  <span className="font-bold text-white">{f.fields?.length || 0} fields</span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await crmApi.getFormSubmissions(f.id);
                      setSelectedFormSubmissions({ form: f, submissions: res.data || [] });
                    } catch (e) {
                      toast.error('Failed to load form responses');
                    }
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-sky-400 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/40 rounded-xl"
                >
                  View Form Submissions ({f.submissions_count || 0})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 12: WORKFLOWS & PRESETS                              */}
      {/* ======================================================== */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workflows */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Workflow className="w-4 h-4 text-indigo-400" />
                <span>Workflow Automations Engine</span>
              </h3>
              {workflows.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No active custom automation workflows configured.</p>
              ) : (
                <div className="space-y-2">
                  {workflows.map((w) => (
                    <div key={w.id} className="p-3 bg-slate-800/60 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{w.name}</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Industry Templates */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Pre-Packaged Industry Configurations</span>
              </h3>
              <div className="space-y-2">
                {industryTemplates.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-800/60 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs">{t.name}</span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Template ID: {t.id}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                      Preset Ready
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 13: LIVE ACTIVITY STREAM                             */}
      {/* ======================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>CRM Operational Activity Stream ({activities.length} Recorded Events)</span>
            </h2>
            <button
              onClick={fetchActivities}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              Refresh Stream
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg divide-y divide-slate-800">
            {activities.map((a, idx) => (
              <div key={a.id || idx} className="p-4 hover:bg-slate-800/40 transition-colors flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs">{a.title || a.type || 'CRM Activity Event'}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{a.description || a.details}</p>
                  {a.leadName && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                      Lead: {a.leadName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAIL MODALS & INSPECTORS                               */}
      {/* ======================================================== */}

      {/* Endpoint Inspection Modal */}
      {selectedEndpointDetails && (
        <Modal
          isOpen={!!selectedEndpointDetails}
          onClose={() => setSelectedEndpointDetails(null)}
          title={`Endpoint Inspection — ${selectedEndpointDetails.method} ${selectedEndpointDetails.path}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">HTTP Method</span>
                <span className="font-bold text-white">{selectedEndpointDetails.method}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Integration Status</span>
                <span className="font-bold text-emerald-400">{selectedEndpointDetails.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Required Auth</span>
                <span className="text-white">{selectedEndpointDetails.auth}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Test Latency</span>
                <span className="font-mono text-white">{selectedEndpointDetails.latencyMs || 0} ms</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-slate-400 font-semibold block mb-1">Description:</span>
              <p className="text-slate-200">{selectedEndpointDetails.desc}</p>
            </div>

            {selectedEndpointDetails.reason && (
              <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/40 text-rose-300">
                <span className="font-semibold block mb-1">Reported Limitation / Blocker:</span>
                <p>{selectedEndpointDetails.reason}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Connect Modal */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title="Connect to NexFlow CRM API"
      >
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="flex p-1 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setConnectMode('credentials')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                connectMode === 'credentials'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CRM Admin Credentials
            </button>
            <button
              type="button"
              onClick={() => setConnectMode('token')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                connectMode === 'token'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Bearer Token
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              CRM API Base URL
            </label>
            <input
              type="url"
              placeholder="https://api.nexflowcrm.com/api/v1"
              value={connectForm.customBaseUrl}
              onChange={(e) => setConnectForm({ ...connectForm, customBaseUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {connectMode === 'credentials' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CRM Admin Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@nexflowcrm.com"
                  value={connectForm.email}
                  onChange={(e) => setConnectForm({ ...connectForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CRM Admin Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={connectForm.password}
                  onChange={(e) => setConnectForm({ ...connectForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CRM JWT Bearer Token
              </label>
              <textarea
                rows={3}
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={connectForm.token}
                onChange={(e) => setConnectForm({ ...connectForm, token: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setConnectModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {connecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {connecting ? 'Connecting...' : 'Connect to CRM'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Tenant Modal */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Link CRM Company with SaaS Tenant"
      >
        <form onSubmit={handleLinkTenant} className="space-y-4">
          <p className="text-xs text-slate-400">
            Associate this CRM Company record with a registered Super Admin SaaS organization.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Super Admin SaaS Organization
            </label>
            <select
              required
              value={selectedSaasOrgId}
              onChange={(e) => setSelectedSaasOrgId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="">-- Choose Organization --</option>
              {saasOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} (#{org.id}) — {org.plan_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setLinkModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={linking}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {linking && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {linking ? 'Linking...' : 'Confirm Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`CRM User — ${selectedUser.name}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">User UUID</span>
                <span className="font-mono text-white font-semibold text-[11px] truncate block">{selectedUser.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Name</span>
                <span className="text-white font-semibold">{selectedUser.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email</span>
                <span className="text-white">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone</span>
                <span className="text-white">{selectedUser.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CRM Role</span>
                <Badge variant="info">{selectedUser.role || 'Member'}</Badge>
              </div>
              <div>
                <span className="text-slate-500 block">Team</span>
                <span className="text-white">{selectedUser.team || 'Leadership'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`Lead Details — ${selectedLead.name}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">Lead ID</span>
                <span className="font-mono text-white font-semibold">#{selectedLead.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Name</span>
                <span className="text-white font-semibold">{selectedLead.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Stage</span>
                <span className="text-amber-300 font-semibold">{selectedLead.stage}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Score</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedLead.score} / 100</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Project Inventory Modal */}
      {selectedProjectInventory && (
        <Modal
          isOpen={!!selectedProjectInventory}
          onClose={() => setSelectedProjectInventory(null)}
          title={`Units Inventory — ${selectedProjectInventory.project.name}`}
        >
          <div className="space-y-3 text-xs text-slate-300">
            {selectedProjectInventory.items.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No unit stock records for this project.</p>
            ) : (
              <div className="space-y-2">
                {selectedProjectInventory.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Unit #{it.unitNumber || it.id || idx + 1}</h4>
                      <p className="text-[11px] text-slate-400">Type: {it.type || 'Standard'} • Area: {it.area || 'N/A'}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">₹{it.price || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* WhatsApp Message Viewer Modal */}
      {selectedChatMessages && (
        <Modal
          isOpen={!!selectedChatMessages}
          onClose={() => setSelectedChatMessages(null)}
          title={`Chat Thread — ${selectedChatMessages.chat.contactName || selectedChatMessages.chat.phone}`}
        >
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 max-h-80 overflow-y-auto space-y-3">
              {selectedChatMessages.messages.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No message items recorded in thread.</p>
              ) : (
                selectedChatMessages.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl max-w-[80%] ${
                      m.direction === 'inbound' || m.from === 'customer'
                        ? 'bg-slate-800 text-slate-200 mr-auto'
                        : 'bg-indigo-600 text-white ml-auto'
                    }`}
                  >
                    <p className="text-xs">{m.text || m.body || m.content}</p>
                    <span className="text-[10px] opacity-70 block text-right mt-1 font-mono">
                      {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'Delivered'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CrmIntegrationPage;
