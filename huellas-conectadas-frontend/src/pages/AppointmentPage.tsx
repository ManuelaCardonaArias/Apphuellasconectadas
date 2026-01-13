import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../styles/style_appointment.css';
import { api, ENDPOINTS } from '../services/api'; // [MEJORA 1] Uso de servicio centralizado
import { useAuth } from '../context/AuthContext'; // [MEJORA 4] Contexto de auth

// --- COMPONENTES UI ---

// 1. Spinner pequeño para botones (Acciones)
const Spinner = () => (
    <div className="spinner-mini" style={{
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// 2. Icono de Huella para carga de página
const PawIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        fill="currentColor"
        className={className}
    >
        <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z" />
    </svg>
);

// PROPS OPCIONALS PER MODE MODAL
interface AppointmentPageProps {
    dogIdProp?: string;
    onClose?: () => void;
    onBack?: () => void; // Per tornar al detall del gos dins del modal
}

// Helper para redondear la hora actual al próximo intervalo de 30 minutos
const getNextHalfHour = (date: Date): string => {
    const ms = date.getTime();
    const minutes = date.getMinutes();
    const msSinceLastInterval = (minutes % 30) * 60000;
    
    // Calcula la hora que está 30 minutos después del último intervalo
    const nextIntervalMs = ms + (30 * 60000) - msSinceLastInterval;
    const nextDate = new Date(nextIntervalMs);

    // Formatea a HH:MM (slice(0, 5) toma HH:MM)
    return nextDate.toTimeString().slice(0, 5);
};


const AppointmentPage: React.FC<AppointmentPageProps> = ({ dogIdProp, onClose, onBack }) => {
    const { dogId: paramId } = useParams<{ dogId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth(); // [MEJORA 4] Verificar autenticación desde el contexto

    // Determinar ID i mode
    const dogId = dogIdProp || paramId;
    const isModal = !!dogIdProp;

    const [dogName, setDogName] = useState<string>('');
    const [isDogLoading, setIsDogLoading] = useState<boolean>(true);

    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // [MEJORA 1] Carga de mascota usando api service
    useEffect(() => {
        const fetchDogName = async () => {
            if (!dogId) return;

            try {
                // Usamos el endpoint de detalle que ya existe
                const data = await api.get<any>(`/api/mascotas/${dogId}`);
                setDogName(data.nombre);
            } catch (error) {
                console.error("Error cargando mascota:", error);
                setDogName('Mascota Desconocida');
            } finally {
                // Pequeño delay estético para que se vea la animación si la carga es muy rápida
                setTimeout(() => setIsDogLoading(false), 500);
            }
        };

        fetchDogName();
    }, [dogId]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        // [MEJORA 4] Validación de sesión robusta
        if (!isAuthenticated) {
            setMessage({ type: 'error', text: 'Debes iniciar sesión para reservar una cita.' });
            setIsLoading(false);
            return;
        }

        // Validación de horario (min y max)
        if (time < "10:00" || time > "18:00") {
            setMessage({ type: 'error', text: 'El horario de visitas es de 10:00h a 18:00h.' });
            setIsLoading(false);
            return;
        }
        
        // 🚫 VALIDACIÓN DE INTERVALOS ESTRICTA: Solo :00 o :30
        const selectedMinutes = parseInt(time.slice(3, 5), 10);
        if (selectedMinutes % 30 !== 0) {
             setMessage({
                type: 'error',
                text: 'La hora seleccionada debe ser en intervalos de 30 minutos (ej: 10:00, 10:30, no 10:15).'
            });
            setIsLoading(false);
            return;
        }


        // 🚫 Validación hora pasada hoy
        const now = new Date();
        const selectedDateTime = new Date(`${date}T${time}`);

        if (date === today && selectedDateTime <= now) {
            setMessage({
                type: 'error',
                text: 'No puedes reservar una hora que ya ha pasado hoy.'
            });
            setIsLoading(false);
            return;
        }
        
        try {
            const dataToSend = {
                mascotaId: parseInt(dogId || '0'),
                fecha: date,
                hora: time
            };

            // [MEJORA 1] Envío usando api service (maneja headers y token auto)
            await api.post(ENDPOINTS.CITAS, dataToSend); // Asumiendo que ENDPOINTS.CITAS es '/api/citas'

            setMessage({ type: 'success', text: `¡Cita solicitada con éxito!` });

            // Si estem en modal, tanquem després de 2 segundos
            if (isModal && onClose) {
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setTimeout(() => {
                    navigate('/mascotas');
                }, 3000);
            }

        } catch (error: any) {
            console.error("Error envío cita:", error);
            // Manejo de errores específicos (ej: conflicto de cita existente)
            const errorMsg = error.message || 'Fallo de conexión';
            setMessage({ type: 'error', text: `Error: ${errorMsg}` });
        } finally {
            setIsLoading(false);
        }
    };

    // Render de carga inicial con Animación de Huellas
    if (isDogLoading) {
        return (
            <div className={`main-content appointment-container ${isModal ? 'modal-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>

                <div className="paw-prints-loader">
                    {[...Array(5)].map((_, i) => <PawIcon key={i} className="loading-paw" />)}
                </div>

                <p className="loading-text">Preparando tu visita...</p>

                <style>{`
                    .paw-prints-loader { display: flex; gap: 12px; justify-content: center; align-items: center; margin-bottom: 20px; }
                    .loading-paw { width: 32px; height: 32px; color: var(--color-primary, #d35400); opacity: 0; animation: pawFadeIn 1.5s infinite; }
                    .loading-paw:nth-child(1) { animation-delay: 0s; }
                    .loading-paw:nth-child(2) { animation-delay: 0.3s; }
                    .loading-paw:nth-child(3) { animation-delay: 0.6s; }
                    .loading-paw:nth-child(4) { animation-delay: 0.9s; }
                    .loading-paw:nth-child(5) { animation-delay: 1.2s; }
                    
                    @keyframes pawFadeIn {
                        0% { opacity: 0; transform: translateY(0) scale(0.8); }
                        25% { opacity: 1; transform: translateY(-5px) scale(1); }
                        50% { opacity: 0; transform: translateY(0) scale(0.8); }
                        100% { opacity: 0; }
                    }
                    .loading-text { color: #666; font-size: 1.1rem; font-weight: 500; animation: pulseText 2s infinite; }
                    @keyframes pulseText { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                `}</style>
            </div>
        );
    }

    const now = new Date();
    const nowTime = now.toTimeString().slice(0, 5);
    const isToday = date === today;
    const isOutOfSchedule = isToday && nowTime >= "18:00";
    
    // Calculamos la hora mínima para HOY: próxima media hora redondeada hacia arriba
    const minTimeToday = getNextHalfHour(now);

    return (
        <main className={`main-content appointment-container ${isModal ? 'modal-mode' : ''}`}>

            <div className="form-card form-appointment">
                <h2>Reservar Cita</h2>
                <p className="subtitle">Visitar a <strong className="text-primary">{dogName}</strong></p>

                {message && (
                    <div className={`form-message ${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-content-grid">
                        <div className="form-group">
                            <label htmlFor="appointmentDate">Fecha</label>
                            <input
                                id="appointmentDate"
                                type="date"
                                min={today}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="appointmentTime">Hora (10:00 - 18:00)</label>
                            {isOutOfSchedule && (
                                <p className="note error-message">
                                    El horario de visitas de hoy ya ha finalizado. Selecciona otra fecha.
                                </p>
                            )}
                            <input
                                id="appointmentTime"
                                type="time"
                                // Si es hoy, la hora mínima es la próxima media hora, si no, es 10:00
                                min={
                                    isToday && !isOutOfSchedule
                                        ? minTimeToday
                                        : "10:00"
                                }
                                max="18:00"
                                // ESTO HACE QUE SOLO SE SELECCIONE EN INTERVALOS DE 30 MINUTOS
                                step="1800"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                                disabled={isOutOfSchedule}
                            />
                        </div>
                    </div>

                    <p className="note">Duración aprox: 30 min. Pendiente de confirmación por la protectora.</p>

                    <button type="submit" className="button-submit button-appointment" disabled={isLoading || !date || !time}>
                        {isLoading ? <><Spinner /> Solicitando...</> : 'Confirmar Cita'}
                    </button>

                    <div className="back-link-wrapper">
                        {isModal && onBack ? (
                            <button type="button" onClick={onBack} className="text-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                &larr; Volver a Detalles
                            </button>
                        ) : (
                            <Link to={`/mascotas/${dogId}`} className="text-link">
                                &larr; Volver al Perfil
                            </Link>
                        )}
                    </div>
                </form>
            </div>
        </main>
    );
};

export default AppointmentPage;