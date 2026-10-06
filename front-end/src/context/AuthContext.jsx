import { useEffect, useState } from 'react';
import api, { setCsrfToken } from '../api/api';
import { AuthContext } from './auth-context';

const readStoredUser = () => {
  try {
    localStorage.removeItem('token');
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error('Failed to restore the saved user profile:', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const csrfResponse = await api.get('/api/auth/csrf');
        setCsrfToken(csrfResponse.data.csrf_token);
        const response = await api.get('/api/auth/me');
        if (!cancelled) {
          setUser({
            id: response.data.user_id,
            username: response.data.username,
            role: response.data.role,
            full_name: response.data.full_name,
          });
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Unable to restore the authenticated session:', error);
        }
        localStorage.removeItem('user');
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/token', { username, password });
      setCsrfToken(response.data.csrf_token);
      const userObj = {
        id: response.data.user_id,
        role: response.data.role,
        full_name: response.data.full_name,
        username,
      };

      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.removeItem('token');
      setUser(userObj);
      return { success: true, role: response.data.role };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Invalid username or password',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Server logout failed:', error);
    } finally {
      setCsrfToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
