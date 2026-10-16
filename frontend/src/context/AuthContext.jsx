import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('saas_super_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('saas_super_admin_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('saas_super_admin_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('saas_super_admin_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to refresh Super Admin profile:', err);
      if (err.status === 401 || err.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('saas_super_admin_token', newToken);
      localStorage.setItem('saas_super_admin_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Super Admin login failed');
  };

  const logout = () => {
    localStorage.removeItem('saas_super_admin_token');
    localStorage.removeItem('saas_super_admin_user');
    setToken(null);
    setUser(null);
    window.location.href = '/super-admin/login';
  };

  /**
   * Check if the authenticated user has a specific granular permission
   */
  const hasPermission = useCallback((permissionCode) => {
    if (!user) return false;
    // Super Admin has unrestricted access to everything
    if (user.isSuperAdmin) return true;
    if (user.role_name === 'SUPER_ADMIN' || user.role === 'super_admin') return true;
    if (Array.isArray(user.roles) && user.roles.some(r => r.slug === 'super_admin')) return true;

    if (Array.isArray(user.permissions)) {
      return user.permissions.includes('*') || user.permissions.includes(permissionCode);
    }
    return false;
  }, [user]);

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback((permissionCodes = []) => {
    if (!user) return false;
    if (user.isSuperAdmin || user.role_name === 'SUPER_ADMIN' || user.role === 'super_admin') return true;
    if (Array.isArray(user.roles) && user.roles.some(r => r.slug === 'super_admin')) return true;
    return permissionCodes.some(code => hasPermission(code));
  }, [user, hasPermission]);

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = useCallback((permissionCodes = []) => {
    if (!user) return false;
    if (user.isSuperAdmin || user.role_name === 'SUPER_ADMIN' || user.role === 'super_admin') return true;
    if (Array.isArray(user.roles) && user.roles.some(r => r.slug === 'super_admin')) return true;
    return permissionCodes.every(code => hasPermission(code));
  }, [user, hasPermission]);

  /**
   * Check if user has a specific role by slug
   */
  const hasRole = useCallback((roleSlug) => {
    if (!user) return false;
    if (user.role_name === roleSlug || user.role === roleSlug) return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(r => r.slug === roleSlug);
    }
    return false;
  }, [user]);

  const isSuperAdmin = !!(
    user?.isSuperAdmin === true ||
    user?.role_name === 'SUPER_ADMIN' ||
    user?.role === 'super_admin' ||
    (Array.isArray(user?.roles) && user.roles.some(r => r.slug === 'super_admin'))
  );

  const isFinanceRole = !!(
    user?.role_name === 'FINANCE_ROLE' ||
    user?.role_name === 'FINANCE' ||
    user?.role === 'finance_role' ||
    user?.role === 'finance_admin' ||
    (Array.isArray(user?.roles) && user.roles.some(r => r.slug === 'finance_role' || r.slug === 'finance_admin'))
  );

  const isSupportRole = !!(
    user?.role_name === 'SUPPORT_ROLE' ||
    user?.role_name === 'SUPPORT' ||
    user?.role === 'support_role' ||
    user?.role === 'support_admin' ||
    (Array.isArray(user?.roles) && user.roles.some(r => r.slug === 'support_role' || r.slug === 'support_admin'))
  );

  const isSalesRole = !!(
    user?.role_name === 'SALES_ROLE' ||
    user?.role_name === 'SALES' ||
    user?.role === 'sales_role' ||
    user?.role === 'sales_admin' ||
    (Array.isArray(user?.roles) && user.roles.some(r => r.slug === 'sales_role' || r.slug === 'sales_admin'))
  );

  const isPlatformUser = !!(
    isSuperAdmin ||
    isFinanceRole ||
    isSupportRole ||
    isSalesRole ||
    user?.isPlatformUser === true ||
    !user?.organizationId
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isSuperAdmin,
        isFinanceRole,
        isSupportRole,
        isSalesRole,
        isPlatformUser,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
