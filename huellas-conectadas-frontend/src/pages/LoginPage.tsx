import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/style_login.css';
import { api, ENDPOINTS } from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- ICONOS SVG (Inline) ---
const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
        {visible ? (
            <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </>
        ) : (
            <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </>
        )}
    </svg>
);

const Spinner = () => (
    <div className="spinner-mini" style={{
        width: '16px', 
        height: '16px', 
        border: '2px solid rgba(255,255,255,0.3)', 
        borderTopColor: '#fff', 
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '8px',
        display: 'inline-block',
        verticalAlign: 'middle'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// --- INTERFAZ RESPUESTA LOGIN ---
interface LoginResponse {
    token: string;
    user?: {
        username: string;
        roles?: string[];
        // otros campos si el backend los devuelve
    };
}

const LoginPage: React.FC = () => {
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false); // [MEJORA 1] Estado visibilidad
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // [MEJORA 4] Limpiar cualquier estado residual al montar el componente
    useEffect(() => {
        // Opcional: Si quieres forzar logout al visitar /login
        // logout(); 
    }, []);

    const validateForm = (): boolean => {
        if (!email.includes('@') || !email.includes('.')) {
            setMessage({ type: 'error', text: 'Por favor, introduce un correo válido.' });
            return false;
        }
        if (password.length < 1) {
            setMessage({ type: 'error', text: 'La contraseña no puede estar vacía.' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setMessage(null);

        // [MEJORA 3] Validación previa
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const dataToSend = { email, password };

            // Usamos api.post con tipo explícito
            const result = await api.post<LoginResponse>(ENDPOINTS.LOGIN, dataToSend); 
            
            if (result.token) { 
                // Usamos el username del resultado o el email como fallback
                const username = result.user?.username || email;
                
                login(result.token, { username }); 
                
                setMessage({ type: 'success', text: `¡Bienvenido! Redirigiendo...` });
                
                setTimeout(() => {
                    navigate('/'); 
                }, 800);
            } else {
                throw new Error('Credenciales inválidas o respuesta inesperada.'); 
            }
        } catch (error: any) {
            console.error("Login error:", error);
            const errorText = error.message === 'Failed to fetch' 
                ? 'No se pudo conectar con el servidor.' 
                : (error.message || 'Usuario o contraseña incorrectos.');
            
            setMessage({ type: 'error', text: errorText });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-content">
            <div className="login-card"> 
                <h2>Accede a tu cuenta</h2>
                
                {message && (
                    <div className={`login-message ${message.type === 'error' ? 'error-message' : 'success-message'}`} role="alert">
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="login-group">
                        <label htmlFor="loginEmail">Correo Electrónico</label>
                        <input 
                            id="loginEmail" 
                            type="email" 
                            placeholder="nombre@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            autoComplete="username" 
                            disabled={isLoading}
                            className={message?.type === 'error' && !email.includes('@') ? 'input-error' : ''}
                        />
                    </div>
                    
                    <div className="login-group">
                        <label htmlFor="loginPassword">Contraseña</label>
                        {/* [CORRECCIÓN] Wrapper relativo con ancho 100% para evitar desbordamiento */}
                        <div className="password-input-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                            <input 
                                id="loginPassword" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                                autoComplete="current-password" 
                                disabled={isLoading}
                                // [CORRECCIÓN] box-sizing y ancho 100% explícito para evitar que el padding rompa el layout
                                style={{ 
                                    paddingRight: '40px', 
                                    width: '100%', 
                                    boxSizing: 'border-box' 
                                }} 
                            />
                            {/* [MEJORA 1] Botón toggle visibilidad */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    // top y transform eliminados porque usamos flex align-items: center en el padre
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    zIndex: 2 // Asegurar que esté por encima
                                }}
                                tabIndex={-1} // Evitar tab focus accidental
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                <EyeIcon visible={showPassword} />
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" className="button-submit" disabled={isLoading}>
                        {/* [MEJORA 2] Spinner visual */}
                        {isLoading ? (
                            <>
                                <Spinner /> Iniciando...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                    
                    <div style={{marginTop: '20px'}}>
                        <p className="form-footer">
                            ¿Olvidaste tu contraseña? <Link to="/recuperar-pass" className="text-link">Recuperar</Link>
                        </p>
                        <p className="form-footer">
                            ¿No tienes cuenta? <Link to="/register" className="text-link">Regístrate gratis</Link>
                        </p>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default LoginPage;