import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/style_register.css';
import { api, ENDPOINTS } from '../services/api';

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
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', 
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// Tipos para todas las datos del formulario
interface FormData {
    name: string; surname: string; dni: string; birthDate: string; zipCode: string; location: string;
    phone: string; email: string; password: string; confirmPassword: string; housingType: string;
    otherPets: string; userRole: 'adoptant' | 'protectora' | '';
}

// Interfaz para los mensajes de estado
interface Message {
    type: 'error' | 'success';
    text: string;
}

// ==================================================================
// Componentes Secundarios
// ==================================================================

const RoleSelection = React.memo(({ handleRoleSelect }: { handleRoleSelect: (role: 'adoptant' | 'protectora' | '') => void }) => (
    <div className="role-selection-container">
        <h2 className="role-selection-title">¿Cómo quieres registrarte?</h2>
        <p className="role-selection-text">Esto determinará el tipo de información que te solicitaremos.</p>
        
        <div className="role-selection-buttons">
            <button onClick={() => handleRoleSelect('adoptant')} className="role-button adoptant-button">
                <div className="role-icon">🐾</div>
                <div className="role-title">Soy un Adoptante</div>
                <div className="role-description">Quiero buscar y adoptar una mascota.</div>
            </button>

            <button onClick={() => handleRoleSelect('protectora')} className="role-button protectora-button">
                <div className="role-icon">🏠</div>
                <div className="role-title">Soy una Protectora</div>
                <div className="role-description">Quiero publicar animales en adopción.</div>
            </button>
        </div>
    </div>
));

interface RegistrationFormProps {
    formData: FormData;
    message: Message | null;
    isLoading: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    handleRoleSelect: (role: 'adoptant' | 'protectora' | '') => void;
}

const RegistrationForm = React.memo(({ 
    formData, message, isLoading, handleChange, handleSubmit, handleRoleSelect 
}: RegistrationFormProps) => {
    const userRole = formData.userRole;
    
    // [MEJORA 1] Estados locales para visibilidad de contraseña
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // [MEJORA 2] Validación en tiempo real
    const passwordError = useMemo(() => {
        if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
            return "Las contraseñas no coinciden";
        }
        if (formData.password && formData.password.length < 6) {
            return "Mínimo 6 caracteres";
        }
        return null;
    }, [formData.password, formData.confirmPassword]);

    const infoMessage = useMemo(() => (
        userRole === 'protectora' && (
            <div className="form-message info-message">
                ⚠️ *Nota: Como Protectora, se solicitarán datos legales adicionales una vez su solicitud sea aprobada.*
            </div>
        )
    ), [userRole]);

    return (
        <form onSubmit={handleSubmit}> 
            {message && (
                <div className={`form-message ${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                    {message.text}
                </div>
            )}
            
            {infoMessage}

            {/* GRUPO 1: Identificación y Contacto Principal */}
            <div className="form-section-title">Datos Personales</div>
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="registerName">{userRole === 'adoptant' ? 'Nombre' : 'Nombre de la Protectora'}</label>
                    <input id="registerName" type="text" name="name" placeholder={userRole === 'adoptant' ? 'Tu nombre' : 'Ej: Asociación Peluts'} value={formData.name} onChange={handleChange} required autoComplete="organization" />
                </div>
                
                {userRole === 'adoptant' ? (
                    <>
                        <div className="form-group"><label htmlFor="registerSurname">Apellidos</label><input id="registerSurname" type="text" name="surname" placeholder="Tus apellidos" value={formData.surname} onChange={handleChange} required autoComplete="family-name" /></div>
                        <div className="form-group"><label htmlFor="registerDni">DNI/NIE</label><input id="registerDni" type="text" name="dni" placeholder="Ej: 12345678X" value={formData.dni} onChange={handleChange} required maxLength={10} autoComplete="off" /></div>
                        <div className="form-group"><label htmlFor="registerBirthDate">Fecha de Nacimiento</label><input id="registerBirthDate" type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required autoComplete="bday" /></div>
                    </>
                ) : (
                    <>
                        <div className="form-group"><label htmlFor="registerLocation">Localidad</label><input id="registerLocation" type="text" name="location" placeholder="Ej: Barcelona" value={formData.location} onChange={handleChange} required autoComplete="address-level2" /></div>
                        <div className="form-group">
                            <label htmlFor="registerPhone">Teléfono (Incluir código de país)</label>
                            <input 
                                id="registerPhone" 
                                type="text" 
                                name="phone" 
                                maxLength={15} 
                                placeholder="Ej: +34 600123456" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                required 
                                autoComplete="tel" 
                            />
                        </div>
                    </>
                )}
            </div>

            {/* GRUPO 2: Adoptante Extra Info */}
            {userRole === 'adoptant' && (
                <>
                    <div className="form-section-title">Dirección y Vivienda</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="registerZipCode">Código Postal</label>
                            <input id="registerZipCode" type="text" name="zipCode" maxLength={5} placeholder="Ej: 43200" value={formData.zipCode} onChange={handleChange} required autoComplete="postal-code" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="registerLocation">Localidad</label>
                            <input id="registerLocation" type="text" name="location" placeholder="Ej: Barcelona" value={formData.location} onChange={handleChange} required autoComplete="address-level2" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="registerPhone">Teléfono (Incluir código de país)</label>
                            <input 
                                id="registerPhone" 
                                type="text" 
                                name="phone" 
                                maxLength={15} 
                                placeholder="Ej: +34 600123456" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                required 
                                autoComplete="tel" 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="housingType">Tipo de Vivienda</label>
                            <select id="housingType" name="housingType" value={formData.housingType} onChange={handleChange} required>
                                <option value="">Selecciona...</option>
                                <option value="Piso/Apartamento">Piso / Apartamento</option>
                                <option value="Casa con jardín">Casa con jardín</option>
                                <option value="Chalet">Chalet</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                    </div>
                </>
            )}

            {/* GRUPO 3: Email y Mascotes */}
            <div className="form-section-title">Cuenta de Usuario</div>
            <div className="form-row">
                {userRole === 'adoptant' && (
                    <div className="form-group">
                        <label htmlFor="otherPets">¿Tienes otros animales?</label>
                        <select id="otherPets" name="otherPets" value={formData.otherPets} onChange={handleChange} required>
                            <option value="">Selecciona...</option>
                            <option value="No">No</option>
                            <option value="Perros">Sí, Perros</option>
                            <option value="Gatos">Sí, Gatos</option>
                            <option value="Otros">Sí, Otros</option>
                        </select>
                    </div>
                )}
                <div className={`form-group ${userRole === 'protectora' ? 'full-width' : ''}`}>
                    <label htmlFor="registerEmail">Correo Electrónico</label>
                    <input id="registerEmail" type="email" name="email" placeholder="correo@ejemplo.es" value={formData.email} onChange={handleChange} required autoComplete="email" />
                </div>
            </div>
            
            {/* GRUPO 4: Contraseña con Toggle */}
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="registerPassword">Contraseña (Mín. 6 caracteres)</label>
                    <div className="password-input-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <input 
                            id="registerPassword" 
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            minLength={6} 
                            placeholder="Contraseña segura" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            autoComplete="new-password"
                            style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="password-toggle-btn"
                            style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', zIndex: 2 }}
                            tabIndex={-1}
                        >
                            <EyeIcon visible={showPassword} />
                        </button>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirma Contraseña</label>
                    <div className="password-input-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <input 
                            id="confirmPassword" 
                            type={showConfirmPassword ? "text" : "password"} 
                            name="confirmPassword" 
                            placeholder="Repite la contraseña" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                            autoComplete="new-password"
                            className={passwordError ? 'input-error' : ''}
                            style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="password-toggle-btn"
                            style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', zIndex: 2 }}
                            tabIndex={-1}
                        >
                            <EyeIcon visible={showConfirmPassword} />
                        </button>
                    </div>
                    {passwordError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{passwordError}</span>}
                </div>
            </div>

            <button type="submit" className="button-submit" disabled={isLoading || !!passwordError}>
                {isLoading ? <><Spinner /> Creando Cuenta...</> : 'Crear Cuenta'}
            </button>
            
            <p className="form-footer">
                ¿Ya tienes cuenta? <Link to="/login" className="text-link">Inicia sesión aquí</Link>
            </p>
            
            <div className="form-footer mt-5">
                <button type="button" onClick={() => handleRoleSelect('')} className="back-link">
                    &larr; Cambiar tipo de registro
                </button>
            </div>
        </form>
    );
});

// ==================================================================
// COMPONENTE PRINCIPAL
// ==================================================================

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState<FormData>({
        name: '', surname: '', dni: '', birthDate: '', zipCode: '', location: '', phone: '',
        email: '', password: '', confirmPassword: '', housingType: '', otherPets: '', userRole: ''
    });
    const [message, setMessage] = useState<Message | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleRoleSelect = useCallback((role: 'adoptant' | 'protectora' | '') => { 
        setFormData(prev => ({ ...prev, userRole: role }));
        setMessage(null);
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Error: Las contraseñas no coinciden.' });
            setIsLoading(false);
            return;
        }

        const phoneClean = formData.phone.trim();
        
        // VALIDACIÓN DE CÓDIGO DE PAÍS: Requiere empezar por '+'
        if (!phoneClean.startsWith('+')) {
            setMessage({ type: 'error', text: 'El número de teléfono debe comenzar con el código de país (ej: +34, +52, +1).' });
            setIsLoading(false);
            return;
        }

        // Validación de longitud: Eliminamos espacios y el '+' para contar dígitos. 
        // Se requiere un mínimo de 10 dígitos (ej. +1 555-555-5555 tiene 11)
        const digitsOnly = phoneClean.replace(/\D/g, ''); 
        
        if (digitsOnly.length < 10) {
             setMessage({ type: 'error', text: 'El número de teléfono parece incompleto. Debe incluir el código de país y el número completo (mínimo 10 dígitos).' });
             setIsLoading(false);
             return;
        }
        
        try {
            const { 
                userRole, name, surname, dni, birthDate, zipCode, location, phone, email, password,
                otherPets, 
            } = formData;

            const roles = userRole === 'adoptant' ? ['ROLE_USER'] : ['ROLE_PROTECTORA'];
            const fechaRegistro = new Date().toISOString().split('T')[0];

            let finalDataToSend: Record<string, any> = {
                email, password, roles, telefono: phone, fecha_registro: fechaRegistro,
                nombre: name,
                direccion: `${location}, CP ${zipCode}`,
                identificacion: dni,
            };

            if (userRole === 'adoptant') {
                const tieneMascotas = otherPets !== 'No' && otherPets !== '';
                finalDataToSend = {
                    ...finalDataToSend,
                    apellido: surname,
                    fecha_nacimiento: birthDate,
                    tipo_vivienda: formData.housingType,
                    tiene_mascotas: tieneMascotas,
                    descripcion_protectora: null,
                };
            }
            
            if (userRole === 'protectora') {
                finalDataToSend = {
                    ...finalDataToSend,
                    apellido: null,
                    fecha_nacimiento: null,
                    tipo_vivienda: null,
                    tiene_mascotas: null,
                    descripcion_protectora: "Pendiente de validación de registro legal.", 
                }
            }
            
            // 1. Usamos el servicio api.post
            await api.post(ENDPOINTS.REGISTER, finalDataToSend);
            
            setMessage({ type: 'success', text: '¡Registro completado! Redirigiendo a Iniciar Sesión...' });
            
            setTimeout(() => {
                navigate('/login');
            }, 3000); 

        } catch (error: any) {
            console.error("Error al guardar el registro:", error);
            setMessage({ type: 'error', text: error.message || 'Error de conexión' });
        } finally {
            setIsLoading(false);
        }
    };

    const title = useMemo(() => {
        if (formData.userRole === 'adoptant') return 'Crea tu Cuenta de Adoptante';
        if (formData.userRole === 'protectora') return 'Registro de Protectora/Refugio';
        return 'Selecciona tu Rol';
    }, [formData.userRole]);

    return (
        <div className="register-content">
            <div className="register-card">
                <h2>{title}</h2>
                <p className="register-instruction">
                    {formData.userRole === 'adoptant' && 'Completa todos los datos para registrarte como posible adoptante.'}
                    {formData.userRole === 'protectora' && 'Completa los datos de contacto y acceso para iniciar el proceso de registro legal.'}
                    {formData.userRole === '' && 'Completa los datos para crear tu cuenta y seleccionar tu rol.'}
                </p>

                {formData.userRole === '' ? 
                    <RoleSelection handleRoleSelect={handleRoleSelect} /> 
                    : 
                    <RegistrationForm 
                        formData={formData}
                        message={message}
                        isLoading={isLoading}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        handleRoleSelect={handleRoleSelect}
                    />
                }
            </div>
        </div>
    );
};

export default RegisterPage;