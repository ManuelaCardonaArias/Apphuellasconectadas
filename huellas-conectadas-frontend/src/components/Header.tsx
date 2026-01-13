import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoImg from '../img/logo.jpeg';
import '../styles/style_general.css';
import { api, ENDPOINTS } from '../services/api';
import { useAuth } from '../context/AuthContext';


// --- ICONOS SVG ---
const SunIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);
const MoonIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);
const BellIcon = ({ size = 24, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);
const TrashIcon = ({ size = 16 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

// --- INTERFACES ---
interface Notification {
    id: string; // ID único compuesto
    citaId: number;
    message: string;
    type: 'cita_cambio' | 'mascota_nueva' | 'solicitud_pendiente';
    link: string;
    timestamp: Date;
}

interface ApiAppointment {
    id: number;
    estado: string;
    fecha_hora?: string;
    mascota?: { nombre: string };
    adoptante?: { nombre: string };
    protectora?: { nombre: string };
}

// --- HELPER FUNCTIONS ---

const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'hace un momento';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? 'ayer' : `hace ${days} días`;
    
    return 'hace +1 semana';
};

const mapCitaToNotificationData = (cita: ApiAppointment, protectoraMode: boolean) => {
    const petName = cita.mascota?.nombre || 'Mascota';
    const status = cita.estado || 'pending';
    let message = '';
    let type: Notification['type'] = 'cita_cambio';
    const link = '/edit-profile?tab=appointments';

    if (protectoraMode) {
        const adopterName = cita.adoptante?.nombre || 'Usuario';
        switch (status) {
            case 'pending': message = `Nueva solicitud de ${adopterName} para ${petName}.`; type = 'solicitud_pendiente'; break;
            case 'queue': message = `${adopterName} se unió a la cola para ${petName}.`; type = 'solicitud_pendiente'; break;
            case 'confirmed': message = `Cita confirmada con ${adopterName} para ${petName}.`; break;
            case 'rejected': message = `Solicitud de ${adopterName} rechazada.`; break;
            default: message = `Actualización: ${petName} (${status})`;
        }
    } else {
        switch (status) {
            case 'confirmed': message = `¡Cita confirmada para ${petName}!`; break;
            case 'rejected': message = `Solicitud rechazada para ${petName}.`; break;
            case 'queue': message = `Estás en la cola para ${petName}.`; break;
            case 'pending': message = `Solicitud enviada para ${petName}.`; break;
            case 'cancelled': message = `Cita cancelada para ${petName}.`; break;
            default: message = `Estado cita ${petName}: ${status}`;
        }
    }

    return { message, type, link };
};

// --- CUSTOM HOOK: LOGICA DE NOTIFICACIONES ---
const useNotifications = (isAuthenticated: boolean, isProtectora: boolean) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // 1. Estado para guardar CUANDO vimos la notificación por primera vez (Para arreglar el tiempo)
    const [timestamps, setTimestamps] = useState<Record<string, number>>(() => {
        try {
            return JSON.parse(localStorage.getItem('notificationTimestamps') || '{}');
        } catch { return {}; }
    });

    // 2. Estado de Leídos
    const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('viewedNotifications');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    // 3. Estado de Borrados
    const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('deletedNotifications');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    // Persistencia en LocalStorage
    useEffect(() => { localStorage.setItem('notificationTimestamps', JSON.stringify(timestamps)); }, [timestamps]);
    useEffect(() => { localStorage.setItem('viewedNotifications', JSON.stringify(Array.from(viewedIds))); }, [viewedIds]);
    useEffect(() => { localStorage.setItem('deletedNotifications', JSON.stringify(Array.from(deletedIds))); }, [deletedIds]);

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        const url = isProtectora ? ENDPOINTS.CITAS_SHELTER : ENDPOINTS.CITAS_USER;

        try {
            const citas = await api.get<ApiAppointment[]>(url);
            
            let timestampsUpdated = false;
            const currentTimestamps = { ...timestamps };

            const rawNotifications = citas.map(c => {
                const status = c.estado || 'pending';
                // ID único: Si el estado cambia, se considera una notificación nueva
                const notifId = `cita-${c.id}-${status}`;
                
                // Si es la primera vez que vemos este ID específico, guardamos la fecha de AHORA
                if (!currentTimestamps[notifId]) {
                    currentTimestamps[notifId] = Date.now();
                    timestampsUpdated = true;
                }

                const { message, type, link } = mapCitaToNotificationData(c, isProtectora);
                
                return {
                    id: notifId,
                    citaId: c.id,
                    message,
                    type,
                    link,
                    // Usamos la fecha guardada (primera detección)
                    timestamp: new Date(currentTimestamps[notifId]), 
                };
            });

            if (timestampsUpdated) {
                setTimestamps(currentTimestamps);
            }

            // Filtrado:
            // 1. No borradas manualmente
            // 2. No más antiguas de 7 días (para limpieza automática)
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            const validNotifications = rawNotifications
                .filter(n => !deletedIds.has(n.id))
                .filter(n => n.timestamp.getTime() > oneWeekAgo)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setNotifications(validNotifications);

        } catch (error) {
            console.error("Error polling notifications:", error);
        }
    }, [isAuthenticated, isProtectora, deletedIds, timestamps]);

    useEffect(() => {
        fetchNotifications();
        
        // Intervalo 1: Fetch de datos (cada 30s)
        const dataInterval = setInterval(fetchNotifications, 30000); 
        
        // Intervalo 2: Actualizar UI "hace X min" (cada 60s) sin llamar a la API
        const uiInterval = setInterval(() => {
            setNotifications(prev => [...prev]); // Force re-render
        }, 60000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(uiInterval);
        };
    }, [fetchNotifications]);

    const markAsRead = (id: string) => setViewedIds(prev => new Set(prev).add(id));
    
    const markAllAsRead = () => {
        const allIds = notifications.map(n => n.id);
        setViewedIds(prev => {
            const newSet = new Set(prev);
            allIds.forEach(id => newSet.add(id));
            return newSet;
        });
    };

    const clearAllNotifications = () => {
        const allIds = notifications.map(n => n.id);
        setDeletedIds(prev => {
            const newSet = new Set(prev);
            allIds.forEach(id => newSet.add(id));
            return newSet;
        });
        setNotifications([]); // Limpieza visual inmediata
    };

    return { notifications, viewedIds, markAsRead, markAllAsRead, clearAllNotifications };
};

// --- COMPONENTE PRINCIPAL ---
const Header: React.FC = () => {
    const { user, isAuthenticated, logout, isProtectora } = useAuth();
    const navigate = useNavigate();
    
    const displayUserName = user?.name || 'Usuario'; 
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false); 
    
    const dropdownRef = useRef<HTMLLIElement>(null);
    const notificationRef = useRef<HTMLLIElement>(null); 
    
    // Usamos el Custom Hook
    const { notifications, viewedIds, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications(isAuthenticated, !!isProtectora);

    // Contador de no leídas
    const unreadCount = useMemo(() => notifications.filter(n => !viewedIds.has(n.id)).length, [notifications, viewedIds]);

    // Tema
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    // Handlers
    const toggleNotificationDropdown = () => {
        setIsNotificationDropdownOpen(prev => !prev);
        if (isDropdownOpen) setIsDropdownOpen(false);
    };
    
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
        if (isNotificationDropdownOpen) setIsNotificationDropdownOpen(false);
    };

    const handleLogout = () => {
        logout(); 
        setIsDropdownOpen(false);
        navigate('/login');
    };

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setIsNotificationDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'cita_cambio': return '📅';
            case 'mascota_nueva': return '🐾';
            case 'solicitud_pendiente': return '📩';
            default: return '🔔';
        }
    };

    return (
        <header>
            <nav className="header-nav-grid">
                <ul className="nav-logo">
                    <li>
                        <Link to="/" aria-label="Ir al inicio">
                            <img src={logoImg} alt="Huellas Conectadas Logo" id="logo" />
                        </Link>
                    </li>
                </ul>
                
                <ul className="main-nav-links">
                    <li><NavLink to="/mascotas" className={({ isActive }) => isActive ? "enllac active-link" : "enllac"}>Mascotas</NavLink></li>
                    <li><NavLink to="/donaciones" className={({ isActive }) => isActive ? "enllac active-link" : "enllac"}>Donaciones</NavLink></li>
                    <li><NavLink to="/sobrenosotros" className={({ isActive }) => isActive ? "enllac active-link" : "enllac"}>Sobre Nosotros</NavLink></li>
                </ul>

                <ul className="nav-utils separat">
                    {/* Botón Tema */}
                    <li>
                        <button onClick={toggleTheme} className="theme-toggle-button" aria-label="Alternar tema">
                            <div className="icon-transition-container">
                                {isDarkMode ? <SunIcon size={24} /> : <MoonIcon size={24} />}
                            </div>
                        </button>
                    </li>

                    {/* Notificaciones */}
                    {isAuthenticated && (
                        <li className="notification-dropdown-container" ref={notificationRef}>
                            <button
                                onClick={toggleNotificationDropdown}
                                className={`notification-indicator-button ${unreadCount > 0 ? 'has-unread' : ''}`}
                                title="Notificaciones"
                                aria-haspopup="true"
                                aria-expanded={isNotificationDropdownOpen}
                            >
                                <BellIcon size={24} className={unreadCount > 0 ? "bell-shake" : ""} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {isNotificationDropdownOpen && (
                                <div className="notification-dropdown-menu">
                                    <div className="notification-dropdown-header">
                                        <h4>Notificaciones ({unreadCount})</h4>
                                        <div className="notification-actions">
                                            <button 
                                                onClick={markAllAsRead} 
                                                className="header-action-btn" 
                                                title="Marcar todas como leídas"
                                                disabled={unreadCount === 0}
                                            >
                                                ✓ Leídas
                                            </button>
                                            <button 
                                                onClick={clearAllNotifications} 
                                                className="header-action-btn delete-btn" 
                                                title="Borrar todas"
                                                disabled={notifications.length === 0}
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="notification-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => {
                                                const isUnread = !viewedIds.has(n.id);
                                                return (
                                                    <Link
                                                        key={n.id}
                                                        to={n.link}
                                                        className={`notification-item ${isUnread ? 'unread' : 'read'}`}
                                                        onClick={() => { 
                                                            markAsRead(n.id); 
                                                            setIsNotificationDropdownOpen(false); 
                                                        }}
                                                    >
                                                        <span className={`notification-icon ${n.type}`}>{getNotificationIcon(n.type)}</span>
                                                        <div className="notification-content">
                                                            <p className="notification-message">{n.message}</p>
                                                            <small className="notification-time">{formatTimeAgo(n.timestamp)}</small>
                                                        </div>
                                                        {isUnread && <span className="unread-dot"></span>}
                                                    </Link>
                                                );
                                            })
                                        ) : (
                                            <div className="no-notifications">
                                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '5px' }}>🔕</span>
                                                <p>Sin novedades recientes</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Link to="/edit-profile?tab=appointments" className="view-all-link" onClick={() => setIsNotificationDropdownOpen(false)}>
                                        Ver panel de {isProtectora ? 'Solicitudes' : 'Citas'}
                                    </Link>
                                </div>
                            )}
                        </li>
                    )}
                    
                    {/* Perfil Usuario */}
                    {isAuthenticated ? (
                        <li className="profile-dropdown-container" ref={dropdownRef}> 
                            <button 
                                className="profile-indicator-button" 
                                onClick={toggleDropdown}
                                title={displayUserName}
                            >
                                <div className="profile-indicator-avatar">
                                    {displayUserName.charAt(0).toUpperCase()}
                                </div>
                            </button>

                            {isDropdownOpen && (
                                <div className="profile-dropdown-menu">
                                    <div className="profile-dropdown-header">
                                        <div className="profile-dropdown-avatar">{displayUserName.charAt(0).toUpperCase()}</div>
                                        <div className="profile-text-group">
                                            <p className="user-name">{displayUserName}</p>
                                            {user?.email && <p className="user-email-truncate">{user.email}</p>}
                                        </div>
                                    </div>
                                    
                                    <Link to="/edit-profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        Ver Perfil
                                    </Link>

                                    <div className="dropdown-separator" />

                                    <button className="dropdown-item logout-button" onClick={handleLogout}>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </li>
                    ) : (
                        <li>
                            <Link className="cta-button primary-cta small-btn" to="/login">
                                Iniciar Sesión
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
            <style>{`
                @keyframes bellShake {
                    0% { transform: rotate(0); }
                    15% { transform: rotate(5deg); }
                    30% { transform: rotate(-5deg); }
                    45% { transform: rotate(4deg); }
                    60% { transform: rotate(-4deg); }
                    75% { transform: rotate(2deg); }
                    85% { transform: rotate(-2deg); }
                    100% { transform: rotate(0); }
                }
                .bell-shake { animation: bellShake 2s infinite; transform-origin: top center; }
                .user-email-truncate { font-size: 0.8rem; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
                .profile-text-group { display: flex; flex-direction: column; overflow: hidden; }
                
                /* Estilos extra para Header Actions */
                .notification-dropdown-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid var(--border-color, #eee); }
                .notification-actions { display: flex; gap: 5px; }
                .header-action-btn { background: none; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; color: var(--primary-color, #007bff); padding: 4px 8px; border-radius: 4px; transition: all 0.2s; }
                .header-action-btn:hover { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); }
                .header-action-btn.delete-btn { color: #dc3545; }
                .header-action-btn.delete-btn:hover { background: #fff5f5; border-color: #dc3545; }
                .header-action-btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
                .unread-dot { width: 8px; height: 8px; background-color: #007bff; border-radius: 50%; margin-left: auto; flex-shrink: 0;}
            `}</style>
        </header>
    );
};

export default Header;