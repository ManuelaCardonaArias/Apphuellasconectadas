import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/style_login.css'; // Reutilizamos tus estilos existentes
import { api } from '../services/api'; // Asumiendo que api es tu instancia de axios

const RecoveryPasswordPage: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        try {
            // Nota: Asegúrate de que esta URL coincida con la ruta definida en Symfony
            // CORRECCIÓN: Añadimos <any> para evitar el error "Object is of type 'unknown'"
            const response = await api.post<any>('/api/reset-password-request', { email });
            
            setMessage({ 
                type: 'success', 
                text: 'Se han enviado las instrucciones a tu correo electrónico.' 
            });
            
            // Opcional: Limpiar el campo
            setEmail('');
            
            // SOLO PARA DEBUG (Ver consola para ver el token sin configurar servidor de correo)
            // CORRECCIÓN: Usamos response.debug_token directamente (igual que en LoginPage), asumiendo que api.post devuelve la data
            if(response.debug_token) {
                console.log("DEBUG TOKEN (Úsalo para la fase 2):", response.debug_token);
            } else if (response.data && response.data.debug_token) {
                 // Fallback por si tu api devuelve el objeto axios completo
                 console.log("DEBUG TOKEN (Úsalo para la fase 2):", response.data.debug_token);
            }

        } catch (error: any) {
            console.error("Error en recuperación:", error);
            // Incluso si falla, a veces es mejor mostrar un mensaje genérico por seguridad,
            // pero aquí mostramos el error para desarrollo.
            setMessage({ 
                type: 'error', 
                text: 'Hubo un problema al procesar tu solicitud. Inténtalo más tarde.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-content">
            <div className="login-card"> 
                <h2>Recuperar Contraseña</h2>
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                
                {message && (
                    <div className={`login-message ${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="login-group">
                        <label htmlFor="recoveryEmail">Correo Electrónico</label>
                        <input 
                            id="recoveryEmail" 
                            type="email" 
                            placeholder="nombre@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            autoComplete="email" 
                            disabled={isLoading}
                        />
                    </div>
                    
                    <button type="submit" className="button-submit" disabled={isLoading}>
                        {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                    
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                        <Link to="/login" className="text-link">
                            &larr; Volver al Login
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default RecoveryPasswordPage;