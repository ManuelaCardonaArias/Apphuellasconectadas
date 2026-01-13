import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/style_login.css'; 
import { api } from '../services/api'; 

const ResetPasswordConfirmPage: React.FC = () => {
    // Capturamos el token de la URL (ej: /reset-password/abcd123...)
    const { token } = useParams<{ token: string }>(); 
    const navigate = useNavigate();

    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        setIsLoading(true);

        try {
            // Llamada al endpoint definido en el backend
            await api.post<any>(`/api/reset-password/${token}`, { password });
            
            setMessage({ 
                type: 'success', 
                text: '¡Contraseña actualizada! Redirigiendo al login...' 
            });
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error: any) {
            console.error("Error al restablecer:", error);
            
            // --- CAMBIO AQUÍ ---
            // Definimos un mensaje por defecto
            let errorMsg = 'Hubo un error al actualizar la contraseña.';

            // Intentamos extraer el mensaje específico que envía Symfony (error 400)
            if (error.response && error.response.data && error.response.data.message) {
                errorMsg = error.response.data.message;
            } 
            // Si no hay respuesta del servidor (error de red), a veces axios deja el mensaje en error.message
            else if (!error.response && error.message) {
                errorMsg = error.message;
            }
            
            setMessage({ type: 'error', text: errorMsg });
            // -------------------

        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-content">
            <div className="login-card"> 
                <h2>Nueva Contraseña</h2>
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Introduce tu nueva contraseña.
                </p>
                
                {message && (
                    <div className={`login-message ${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="login-group">
                        <label htmlFor="newPassword">Nueva Contraseña</label>
                        <input 
                            id="newPassword" 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            autoComplete="new-password"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="login-group">
                        <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                        <input 
                            id="confirmPassword" 
                            type="password" 
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            autoComplete="new-password"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <button type="submit" className="button-submit" disabled={isLoading}>
                        {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </main>
    );
};

export default ResetPasswordConfirmPage;