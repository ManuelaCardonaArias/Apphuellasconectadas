// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
    email: string;
    role: 'ROLE_USER' | 'ROLE_PROTECTORA' | string;
    name?: string;
    id?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData: any) => void;
    logout: () => void;
    isProtectora: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
    return context;
};

const decodeJWT = (token: string): any => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch { return null; }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                try {
                    const decoded = decodeJWT(token);
                    if (decoded.exp && decoded.exp * 1000 < Date.now()) throw new Error('Token expirado');

                    const storedName = localStorage.getItem('user_name');
                    const storedRole = localStorage.getItem('user_role');
                    
                    setUser({
                        email: decoded.sub || '',
                        role: storedRole || (decoded.roles && decoded.roles.includes('ROLE_PROTECTORA') ? 'ROLE_PROTECTORA' : 'ROLE_USER'),
                        name: storedName || decoded.sub,
                        id: decoded.id
                    });
                } catch (error) {
                    logout();
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = (token: string, userData: any) => {
        localStorage.setItem('jwt_token', token);
        const decoded = decodeJWT(token);
        const rolesArray = decoded.roles || [];
        let determinedRole = 'ROLE_USER';
        if (rolesArray.includes('ROLE_PROTECTORA')) determinedRole = 'ROLE_PROTECTORA';
        
        localStorage.setItem('user_role', determinedRole);
        localStorage.setItem('user_name', userData.username || decoded.sub);

        setUser({
            email: decoded.sub,
            role: determinedRole,
            name: userData.username || decoded.sub,
            id: decoded.id
        });
    };

    const logout = () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_id');
        setUser(null);
    };

    const isProtectora = user?.role === 'ROLE_PROTECTORA';

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, isProtectora }}>
            {children}
        </AuthContext.Provider>
    );
};