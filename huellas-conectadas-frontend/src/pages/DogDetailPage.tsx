import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppointmentPage from './AppointmentPage'; // Asegúrate de que este archivo exista
import AddPetPage from './AddPetPage'; // Asegúrate de que este archivo exista
import '../styles/style_dog_detail.css';
import { api, ENDPOINTS } from '../services/api'; // Servicio centralizado
import { useAuth } from '../context/AuthContext'; // Contexto de autenticación

// Componente simple para el icono de la huella
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

// Helpers
const normalizeStatus = (status: string | undefined): string => {
    if (!status) return '';
    return status.toString().toLowerCase().trim();
};

const getStatusClass = (status: string | undefined) => {
    const s = normalizeStatus(status);
    if (s === '' || s.includes('disponible')) return 'status-Disponible';
    if (s.includes('reservado')) return 'status-Reservado';
    if (s.includes('adoptado')) return 'status-Adoptado';
    return '';
};

// Interfaces
interface Protectora {
    id: number;
    nombre: string;
    email: string;
    direccion?: string;
    telefono?: string;
    descripcion_protectora?: string;
}

interface Pet {
    id: number;
    nombre: string;
    raza: string;
    edad: number;
    tamano: string;
    especie: string;
    descripcion: string;
    imagenes: string[];
    temperamento: string;
    estadoMascota?: string;
    estado?: string;
    protectora?: Protectora;
}

interface UserAppointment {
    id: number;
    estado: string; 
    mascota: {
        id: number;
        nombre: string;
    };
    queueOrder?: number;
}

interface DogDetailPageProps {
    dogIdProp?: string;
    onClose?: () => void;
    onStatusChange?: () => void;
}

// Tipo para el estado de la alerta
interface AlertState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
}

const DogDetailPage: React.FC<DogDetailPageProps> = ({ dogIdProp, onClose, onStatusChange }) => {
    const { isProtectora, isAuthenticated } = useAuth();
    const { dogId: paramId } = useParams<{ dogId: string }>();
    const navigate = useNavigate();

    const dogId = dogIdProp || paramId;
    const isModal = !!dogIdProp;

    // ESTADOS
    const [viewMode, setViewMode] = useState<'details' | 'appointment' | 'edit'>('details');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReservationNoticeOpen, setIsReservationNoticeOpen] = useState(false);
    const [isLeaveQueueModalOpen, setIsLeaveQueueModalOpen] = useState(false);

    // --- NUEVO ESTADO: Modal de Alerta Genérico (Más bonito que alert()) ---
    const [alertState, setAlertState] = useState<AlertState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Helper para cerrar alerta
    const closeAlert = () => setAlertState(prev => ({ ...prev, isOpen: false }));
    // Helper para abrir alerta
    const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
        setAlertState({ isOpen: true, title, message, type });
    };


    // Estado Cola y Estado Cita
    const [localQueuePosition, setLocalQueuePosition] = useState<number | null>(null);
    const [queueAppointmentId, setQueueAppointmentId] = useState<number | null>(null);
    const [hasActiveAppointment, setHasActiveAppointment] = useState<boolean>(false);
    
    // [MEJORA 2] Estado de procesamiento para acciones de botones (feedback instantáneo)
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Estado Mascota y Galería
    const [pet, setPet] = useState<Pet | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Función para verificar si el usuario tiene citas (Pendiente, Confirmada o Cola)
    const checkUserStatusForPet = useCallback(async () => {
        if (!dogId || !isAuthenticated) return;

        try {
            const citas = await api.get<UserAppointment[]>(ENDPOINTS.CITAS_USER);
            const petIdInt = parseInt(dogId, 10);

            // 1. Revisar si hay Cola
            const queueEntry = citas.find((cita) =>
                cita.estado === 'queue' && cita.mascota.id === petIdInt
            );

            // 2. Revisar si hay Cita Activa (Pendiente o Confirmada)
            const activeEntry = citas.find((cita) =>
                (cita.estado === 'pending' || cita.estado === 'confirmed' || cita.estado === 'confirmada') && 
                cita.mascota.id === petIdInt
            );

            if (queueEntry) {
                setQueueAppointmentId(queueEntry.id);
                setLocalQueuePosition(queueEntry.queueOrder || 1);
            } else {
                setQueueAppointmentId(null);
                setLocalQueuePosition(null);
            }

            if (activeEntry) {
                setHasActiveAppointment(true);
            } else {
                setHasActiveAppointment(false);
            }

        } catch (err) {
            console.error("Error checking user status for pet:", err);
        }
    }, [dogId, isAuthenticated]);

    // Cargar detalles de la mascota
    const fetchPetDetails = useCallback(async () => {
        if (!dogId) return;
        setIsLoading(true);

        try {
            const endpoint = `/api/mascotas/${dogId}`;

            // [MEJORA 1] Ejecutar promesas en paralelo y esperar a AMBAS antes de quitar el loading
            // Esto evita que primero se pinte el botón "Ponerse en cola" y luego salte a "Ya tienes cita"
            const petPromise = api.get<Pet>(endpoint);
            
            let userStatusPromise: Promise<void> | undefined;
            if (isAuthenticated) {
                userStatusPromise = checkUserStatusForPet();
            }

            const data = await petPromise;
            
            // Esperar explícitamente a que termine la comprobación de usuario
            if (userStatusPromise) {
                await userStatusPromise;
            }

            const mappedPet: Pet = {
                ...data,
                estado: data.estadoMascota || data.estado || 'Disponible'
            };

            setPet(mappedPet);
            setSelectedImageIndex(0); // Resetear galería

            if (onStatusChange) onStatusChange();

        } catch (err: any) {
            console.error("Error fetching pet details:", err);
            // Manejo robusto de errores
            if (err.name === 'SyntaxError' || err.message.includes('Unexpected token') || err.message.includes('not valid JSON')) {
                setError('Error de comunicación con el servidor (Ruta de detalle no válida).');
            } else {
                setError(err.message || 'Error desconocido.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [dogId, onStatusChange, checkUserStatusForPet, isAuthenticated]);

    useEffect(() => {
        fetchPetDetails();
    }, [dogId, fetchPetDetails]);

    // HANDLERS
    const handleEdit = () => {
        if (isModal) setViewMode('edit');
        else if (pet) navigate(`/editar-mascota/${pet.id}`);
    };

    const navigateToAppointment = () => {
        if (isModal) setViewMode('appointment');
        else if (pet) navigate(`/cita/${pet.id}`);
    };

    const handleReservation = () => {
        if (!pet) return;
        
        // Bloqueo preventivo en frontend - AHORA CON MODAL BONITO
        if (hasActiveAppointment) {
            showAlert(
                "Solicitud Activa", 
                "Ya tienes una solicitud de adopción activa para esta mascota. Por favor, revisa la sección de 'Mis Citas' para ver el estado de tu solicitud.", 
                "warning"
            );
            return;
        }

        const normalized = normalizeStatus(pet.estado);

        // Si ya tienes esta mascota reservada → no hacer nada
        if (queueAppointmentId !== null) {
            console.log('Ya tienes esta mascota reservada, no se hace nada.');
            return;
        }

        // Si ya estás en cola → no hacer nada
        if (localQueuePosition !== null) {
            console.log('Ya estás en cola.');
            return;
        }

        // Mascota reservada por otro usuario → mostrar modal de cola
        if (normalized === 'reservado') {
            setIsReservationNoticeOpen(true);
            return;
        }

        // Mascota disponible → ir a cita
        navigateToAppointment();
    };



    const leaveQueue = async () => {
        if (!queueAppointmentId) return;
        setIsProcessing(true); // Activar feedback visual

        try {
            await api.delete(`${ENDPOINTS.CITAS}/${queueAppointmentId}`);

            setLocalQueuePosition(null);
            setQueueAppointmentId(null);
            setError(null);
        } catch (err: any) {
            try {
                await api.patch(`${ENDPOINTS.CITAS}/${queueAppointmentId}/estado`, { estado: 'removed' });
                setLocalQueuePosition(null);
                setQueueAppointmentId(null);
                setError(null);
            } catch (e) {
                console.error("Error al salir de la cola:", err);
                setError('Error al salir de la cola. Inténtalo de nuevo.');
            }
        } finally {
            setIsReservationNoticeOpen(false);
            setIsProcessing(false);
        }
    };

    const confirmReservationOverride = async () => {
        if (!pet || !dogId) return;

        setIsReservationNoticeOpen(false);
        setIsProcessing(true); // Activar feedback visual

        // Si el usuario ya tiene esta mascota reservada, no hace nada
        if (queueAppointmentId !== null) {
            console.log('Ya tienes esta mascota reservada, no se hace nada.');
            return;
        }

        try {
            const result = await api.post<any>(ENDPOINTS.QUEUE, { mascotaId: parseInt(dogId, 10) });
            setQueueAppointmentId(result.id);
            setLocalQueuePosition(result.queueOrder || 1);
            setError(null);
        } catch (err: any) {
            console.error("Error al unirse a la cola:", err);

            if (err.status === 409) {
                // Ya estás en la cola
                setError('Ya estás en la cola de espera para esta mascota.');
                checkUserStatusForPet();
            } else {
                setError(err.message || 'Error al unirse a la cola.');
            }

            setLocalQueuePosition(null);
            setQueueAppointmentId(null);
        } finally {
            setIsProcessing(false);
        }
    };


    const handleEditSuccess = () => {
        setViewMode('details');
        fetchPetDetails();
    };

    const confirmDelete = async () => {
        if (!pet) return;
        setIsDeleteModalOpen(false);

        try {
            await api.delete(`/api/mascotas/${pet.id}`);

            if (isModal && onClose) {
                onClose();
                if (onStatusChange) onStatusChange();
                window.location.reload();
            } else {
                navigate('/mascotas');
            }
        } catch (err: any) {
            console.error('Error eliminando.', err);
            // alert(`Hubo un error al eliminar la mascota: ${err.message}`);
            showAlert("Error al eliminar", ` ${err.message}`, "error");
        }
    };

    // [MEJORA 3] Cálculo memorizado del estado del botón para mejor rendimiento y limpieza
    const { buttonText, isButtonDisabled } = useMemo(() => {
        let text = 'Solicitar Cita de Adopción';
        let disabled = false;

        if (!pet) return { buttonText: text, isButtonDisabled: true };

        const normalized = normalizeStatus(pet.estado);
        const isAdopted = normalized === 'adoptado';

        // Lógica de texto y bloqueo
        if (isProcessing) {
            text = 'Procesando...';
            disabled = true;
        } else if (isAdopted) {
            text = `Adoptado (¡Felicidades!)`;
            disabled = true;
        } else if (hasActiveAppointment) {
            text = `Ya tienes una cita activa`;
            disabled = true; 
        } else if (normalized === 'reservado' && localQueuePosition !== null) {
            text = `Ya estás en cola`;
            disabled = true;
        } else if (normalized === 'reservado') {
            text = `Ponerse en Cola`;
        }
        
        return { buttonText: text, isButtonDisabled: disabled };
    }, [pet, hasActiveAppointment, localQueuePosition, isProcessing]);


    // --- RENDERIZADO CONDICIONAL ---

    if (viewMode === 'appointment' && dogId) {
        return (
            <AppointmentPage
                dogIdProp={dogId}
                onClose={onClose}
                onBack={() => {
                    setViewMode('details');
                    fetchPetDetails(); 
                }}
            />
        );
    }

    if (viewMode === 'edit' && dogId) {
        return (
            <AddPetPage
                dogIdProp={dogId}
                onClose={onClose}
                onSuccess={handleEditSuccess}
                onBack={() => setViewMode('details')}
            />
        );
    }

    if (isLoading) return (
        <div className={`detail-container loading ${isModal ? 'modal-mode' : ''}`}>
            <div className="loading-container">
                <div className="paw-prints-loader">
                    {[...Array(5)].map((_, i) => <PawIcon key={i} className="loading-paw" />)}
                </div>
                <p className="loading-text">Cargando detalles...</p>
            </div>
        </div>
    );

    if (error || !pet) return (
        <div className={`detail-container not-found ${isModal ? 'modal-mode' : ''}`}>
            <h1>No se pudo cargar la información</h1>
            <p>{error}</p>
            {isModal ? (
                <button onClick={onClose} className="cta-button-detail primary-cta-detail">Cerrar</button>
            ) : (
                <Link to="/mascotas" className="cta-button-detail primary-cta-detail">Volver</Link>
            )}
        </div>
    );

    const rawStatus = pet.estado || 'Disponible';
    const displayStatus = rawStatus;

    const canEdit = isProtectora;

    const handleLeaveQueueClick = () => {
        setIsLeaveQueueModalOpen(true);
    };

    const confirmLeaveQueue = async () => {
        await leaveQueue();
        setIsLeaveQueueModalOpen(false);
    };

    const hasMultipleImages = pet.imagenes && pet.imagenes.length > 1;
    const currentImageSrc = pet.imagenes && pet.imagenes[selectedImageIndex]
        ? pet.imagenes[selectedImageIndex]
        : "https://placehold.co/800x600/ccc/555?text=NO+IMATGE";

    return (
        <main className={`main-content detail-container ${isModal ? 'modal-mode' : ''}`}>

            {/* MODAL DE ELIMINACIÓN */}
            {isDeleteModalOpen && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal-card">
                        <div className="delete-icon-wrapper"><span>⚠️</span></div>
                        <h3 className="delete-modal-title">¿Eliminar mascota?</h3>
                        <p className="delete-modal-text">
                            Estás a punto de eliminar a <strong>{pet.nombre}</strong> de forma permanente.
                        </p>
                        <div className="delete-modal-actions">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="btn-cancel">Cancelar</button>
                            <button onClick={confirmDelete} className="btn-confirm-delete">Sí, Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AVISO DE RESERVA */}
            {isReservationNoticeOpen && (
                <div className="delete-modal-overlay" onClick={() => setIsReservationNoticeOpen(false)}>
                    <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-icon-wrapper" style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
                            <span role="img" aria-label="Aviso">🔔</span>
                        </div>
                        <h3 className="delete-modal-title" style={{ color: '#D97706' }}>Aviso: Mascota Reservada</h3>
                        <p className="delete-modal-text">
                            <strong>{pet.nombre}</strong> ya tiene una reserva pendiente.
                            ¿Deseas **ponerte en cola** para esta mascota?
                        </p>
                        <div className="delete-modal-actions">
                            <button onClick={() => setIsReservationNoticeOpen(false)} className="btn-cancel">Cancelar</button>
                            <button 
                                onClick={confirmReservationOverride} 
                                className="cta-button-detail primary-cta-detail" 
                                style={{ flex: 1, backgroundColor: '#10B981', opacity: isProcessing ? 0.7 : 1 }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Procesando...' : 'Sí, Ponerse en Cola'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SALIR DE LA COLA */}
            {isLeaveQueueModalOpen && (
                <div className="delete-modal-overlay" onClick={() => setIsLeaveQueueModalOpen(false)}>
                    <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-icon-wrapper" style={{ backgroundColor: '#FEF3C7', borderColor: '#FBBF24' }}>
                            <span role="img" aria-label="Aviso">⚠️</span>
                        </div>
                        <h3 className="delete-modal-title" style={{ color: '#B45309' }}>Salir de la Cola</h3>
                        <p className="delete-modal-text">
                            ¿Estás seguro que quieres salir de la cola de espera para <strong>{pet?.nombre}</strong>?
                        </p>
                        <div className="delete-modal-actions">
                            <button
                                onClick={() => setIsLeaveQueueModalOpen(false)}
                                className="btn-cancel"
                                disabled={isProcessing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmLeaveQueue}
                                className="cta-button-detail primary-cta-detail"
                                style={{ flex: 1, backgroundColor: '#EF4444', opacity: isProcessing ? 0.7 : 1 }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Saliendo...' : 'Sí, Salir de la Cola'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ALERTA/NOTIFICACIÓN (Reemplazo bonito de alert()) */}
            {alertState.isOpen && (
                <div className="delete-modal-overlay" onClick={closeAlert}>
                    <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className={`delete-icon-wrapper icon-${alertState.type}`}>
                            {alertState.type === 'warning' && <span role="img" aria-label="Advertencia">⚠️</span>}
                            {alertState.type === 'error' && <span role="img" aria-label="Error">🚫</span>}
                            {alertState.type === 'success' && <span role="img" aria-label="Éxito">✅</span>}
                            {alertState.type === 'info' && <span role="img" aria-label="Información">ℹ️</span>}
                        </div>
                        <h3 className={`delete-modal-title text-${alertState.type}`}>
                            {alertState.title}
                        </h3>
                        <p className="delete-modal-text">
                            {alertState.message}
                        </p>
                        <div className="delete-modal-actions" style={{ justifyContent: 'center' }}>
                            <button 
                                onClick={closeAlert} 
                                className="cta-button-detail primary-cta-detail"
                                style={{ minWidth: '120px' }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModal && <button className="modal-close-x" onClick={onClose} title="Cerrar">×</button>}

            <div className="dog-content-grid">

                <div className="image-section">
                    <div className="sticky-wrapper">
                        <img
                            src={currentImageSrc}
                            alt={`${pet.nombre}`}
                            className="dog-detail-image"
                            style={{ transition: 'opacity 0.3s ease-in-out' }}
                        />

                        {/* GALERÍA DE MINIATURAS */}
                        {hasMultipleImages && (
                            <div className="thumbnails-container" style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {pet.imagenes.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Miniatura ${idx + 1}`}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        style={{
                                            width: '60px',
                                            height: '60px',
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: selectedImageIndex === idx ? '2px solid var(--color-primary)' : '1px solid transparent',
                                            opacity: selectedImageIndex === idx ? 1 : 0.6
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="detail-header-side">
                            <h1>
                                {pet.nombre}
                                <span className={`dog-status ${getStatusClass(pet.estado)}`}>{displayStatus}</span>
                            </h1>
                            <p className="dog-specs-detail">{pet.especie} | {pet.raza} | {pet.edad} Años | {pet.tamano}</p>

                            {!isProtectora && (
                                <div className="cta-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        onClick={handleReservation}
                                        className="cta-button-detail primary-cta-detail reservation-button"
                                        disabled={isButtonDisabled}
                                    >
                                        {buttonText}
                                    </button>

                                    {/* [MEJORA 2] UX: Feedback visual y acción de remedio si ya tiene cita */}
                                    {hasActiveAppointment && (
                                        <div style={{ textAlign: 'center', marginTop: '-5px' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: '0 0 5px 0' }}>
                                                No puedes realizar otra solicitud mientras tengas una activa.
                                            </p>
                                            <Link 
                                                to="/edit-profile" 
                                                // [CORRECCIÓN] Forzar scroll al top y limpiar
                                                onClick={() => {
                                                    window.scrollTo(0, 0); 
                                                    if (isModal && onClose) onClose(); 
                                                }}
                                                className="secondary-link" 
                                                style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                Ver y gestionar mis citas
                                            </Link>
                                        </div>
                                    )}

                                    {normalizeStatus(pet.estado) === 'reservado' && localQueuePosition !== null && (
                                        <div className="queue-management" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                                            <p className="queue-position-info" style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-dark)', fontWeight: 'bold' }}>
                                                Estás en lista de espera. Posición actual: <strong>#{localQueuePosition}</strong>
                                            </p>
                                            <button
                                                onClick={handleLeaveQueueClick}
                                                className="cta-button-detail secondary-cta leave-queue-button"
                                            >
                                                Salir de la cola
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isModal ? (
                                <button onClick={onClose} className="back-link">Cerrar Detalles</button>
                            ) : (
                                <Link to="/mascotas" className="back-link">Volver al listado</Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-section">
                    <h3>Sobre {pet.nombre}</h3>
                    <p className="description-text">{pet.descripcion}</p>

                    <div className="data-box" style={{ marginBottom: '20px' }}>
                        <h4>Temperamento</h4>
                        <div className="temperament-tags">
                            {pet.temperamento?.split(',').map(t => (
                                <span key={t.trim()} className="tag">{t.trim()}</span>
                            ))}
                        </div>
                    </div>

                    {canEdit && (
                        <div className="admin-actions">
                            <h4>Administración</h4>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={handleEdit} className="cta-button-detail secondary-cta flex-1">Editar</button>
                                <button onClick={() => setIsDeleteModalOpen(true)} className="cta-button-detail danger-cta flex-1">Eliminar</button>
                            </div>
                        </div>
                    )}

                    {pet.protectora && (
                        <div className="data-box-protectora">
                            <h4>Protectora: {pet.protectora.nombre}</h4>
                            {pet.protectora.descripcion_protectora && (
                                <p className="mb-2 italic">"{pet.protectora.descripcion_protectora}"</p>
                            )}
                            {pet.protectora.direccion && <p className="mb-2"><strong>Dirección:</strong> {pet.protectora.direccion}</p>}
                            {pet.protectora.telefono && <p className="mb-2"><strong>Teléfono:</strong> <a href={`tel:${pet.protectora.telefono}`}>{pet.protectora.telefono}</a></p>}
                            <p><strong className="mb-2">Email:</strong> <a href={`mailto:${pet.protectora.email}`}>{pet.protectora.email}</a></p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default DogDetailPage;