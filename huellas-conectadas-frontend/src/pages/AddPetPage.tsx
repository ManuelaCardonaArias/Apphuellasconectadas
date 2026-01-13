import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import '../styles/style_add_pet.css';
import { api, ENDPOINTS } from '../services/api';

// --- LISTAS DE RAZAS (Definidas en el mismo archivo) ---
const DOG_BREEDS = [
    "Mestizo", "Labrador Retriever", "Pastor Alemán", "Golden Retriever", "Bulldog Francés",
    "Beagle", "Poodle (Caniche)", "Rottweiler", "Yorkshire Terrier", "Boxer",
    "Dachshund (Teckel)", "Husky Siberiano", "Gran Danés", "Doberman", "Chihuahua",
    "Shih Tzu", "Border Collie", "Pug (Carlino)", "Cocker Spaniel", "Pastor Belga",
    "Bichón Maltés", "Schnauzer", "Jack Russell Terrier", "Bull Terrier", "Galgo",
    "Podenco", "Mastín", "Otra"
].sort();

const CAT_BREEDS = [
    "Mestizo (Común Europeo)", "Siamés", "Persa", "Maine Coon", "Ragdoll",
    "Bengalí", "Sphynx (Esfinge)", "Abisinio", "Bosque de Noruega",
    "Británico de Pelo Corto", "Azul Ruso", "Himalayo", "Siberiano", "Manx",
    "Angora Turco", "Exótico de Pelo Corto", "Birma (Sagrado de Birmania)", "Otra"
].sort();

// --- COMPONENTES UI (Inline) ---
const Spinner = () => (
    <div className="spinner-mini" style={{
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', 
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '8px', color: 'var(--color-primary)'}}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

// --- TIPOS ---
interface PetFormData {
    nombre: string;
    especie: 'Perro' | 'Gato' | '';
    raza: string;
    edad: number | '';
    tamano: 'Pequeño' | 'Mediano' | 'Grande' | '';
    temperamento: string;
    estadoMascota: 'Disponible' | 'Reservado' |  '';
    descripcion: string;
}

const INITIAL_FORM_DATA: PetFormData = {
    nombre: '',
    especie: '',
    raza: '',
    edad: '',
    tamano: '',
    temperamento: '',
    estadoMascota: 'Disponible',
    descripcion: '',
};

interface AddPetPageProps {
    dogIdProp?: string;
    onClose?: () => void;
    onSuccess?: () => void;
    onBack?: () => void;
}

const AddPetPage: React.FC<AddPetPageProps> = ({ dogIdProp, onClose, onSuccess, onBack }) => {
    const navigate = useNavigate();
    const { dogId: paramId } = useParams<{ dogId: string }>();
    const dogId = dogIdProp || paramId;
    const isEditing = !!dogId;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<PetFormData>(INITIAL_FORM_DATA);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Estado para Drag & Drop

    // Lógica dinámica de razas basada en la especie seleccionada
    const availableBreeds = useMemo(() => {
        if (formData.especie === 'Perro') return DOG_BREEDS;
        if (formData.especie === 'Gato') return CAT_BREEDS;
        return [];
    }, [formData.especie]);

    // Limpieza de memoria para object URLs
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Carga de datos para edición
    useEffect(() => {
        if (isEditing && dogId) {
            setIsLoading(true);
            api.get<any>(`/api/mascotas/${dogId}`).then(data => {
                setFormData({
                    nombre: data.nombre,
                    especie: data.especie,
                    raza: data.raza,
                    edad: data.edad,
                    tamano: data.tamano,
                    temperamento: data.temperamento || '',
                    estadoMascota: data.estadoMascota || 'Disponible',
                    descripcion: data.descripcion,
                });
                if (data.imagenes && data.imagenes.length > 0) {
                    setPreviewUrl(data.imagenes[0]);
                }
            }).catch(e => {
                console.error(e);
                setMessage({ type: 'error', text: 'Error al cargar los datos de la mascota.' });
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [isEditing, dogId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'edad') {
            const numVal = parseInt(value, 10);
            if (value !== '' && (numVal < 0 || isNaN(numVal))) return; 
            setFormData(prev => ({ ...prev, [name]: value === '' ? '' : numVal }));
        } 
        else if (name === 'especie') {
            setFormData(prev => ({ 
                ...prev, 
                especie: value as PetFormData['especie'],
                raza: ''
            }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // --- Lógica unificada para procesar archivos (Click o Drop) ---
    const processFile = (file: File) => {
        // Validación básica de tamaño (ej: 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'La imagen es demasiado grande (Máx. 5MB).' });
            return;
        }

        // Validación de tipo imagen
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'El archivo debe ser una imagen válida (JPG, PNG).' });
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMessage(null); // Limpiar errores previos
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    // --- Handlers de Drag & Drop ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleRemoveImage = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        const data = new FormData();
        Object.entries(formData).forEach(([key, val]) => data.append(key, String(val)));
        if (selectedFile) data.append('imagen', selectedFile);

        try {
            const endpoint = isEditing ? `/api/mascotas/${dogId}` : ENDPOINTS.ADD_PET;
            const method = isEditing ? 'PATCH' : 'POST';

            await api.upload(endpoint, data, method);
            
            const action = isEditing ? 'actualizada' : 'registrada';
            setMessage({ type: 'success', text: `¡Mascota ${action} correctamente!` });
            
            setTimeout(() => {
                if (onSuccess) onSuccess();
                else if (onClose) onClose();
                else if (onBack) onBack();
                else navigate('/mascotas');
            }, 1500);

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error al guardar.' });
        } finally {
            setIsLoading(false);
        }
    };

    const formTitle = isEditing ? 'Editar Mascota' : 'Añadir Nueva Mascota';
    const submitText = isEditing ? 'Guardar Cambios' : 'Registrar Mascota';

    return (
        <main className={`add-content ${!!(onClose || onBack) ? 'modal-mode' : ''}`}>
            {!!(onClose || onBack) && !onBack && (
                <button className="modal-close-x" onClick={onClose} title="Cerrar">×</button>
            )}

            <div className="add-container">
                <h2 className="add-title">{formTitle}</h2>
                <p className="add-subtitle">Completa la ficha para publicar una nueva adopción.</p>
                
                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    {/* FILA 1: Nombre y Especie */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="nombre">Nombre</label>
                            <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Max" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="especie">Especie</label>
                            <select id="especie" name="especie" value={formData.especie} onChange={handleChange} required>
                                <option value="">Seleccione...</option>
                                <option value="Perro">Perro</option>
                                <option value="Gato">Gato</option>
                            </select>
                        </div>
                    </div>

                    {/* FILA 2: Raza (Selector Dinámico), Edad, Tamaño */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="raza">Raza</label>
                            {availableBreeds.length > 0 ? (
                                <select 
                                    id="raza" 
                                    name="raza" 
                                    value={formData.raza} 
                                    onChange={handleChange} 
                                    required 
                                >
                                    <option value="">Seleccione...</option>
                                    {availableBreeds.map(breed => (
                                        <option key={breed} value={breed}>{breed}</option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    id="raza" 
                                    name="raza" 
                                    value={formData.raza} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder={formData.especie ? "Escribe la raza" : "Selecciona especie primero"}
                                    disabled={!formData.especie}
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="edad">Edad (años)</label>
                            <input type="number" id="edad" name="edad" value={formData.edad} onChange={handleChange} min="0" max="30" required placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="tamano">Tamaño</label>
                            <select id="tamano" name="tamano" value={formData.tamano} onChange={handleChange} required>
                                <option value="">Seleccione...</option>
                                <option value="Pequeño">Pequeño (&lt;10kg)</option>
                                <option value="Mediano">Mediano (10-25kg)</option>
                                <option value="Grande">Grande (&gt;25kg)</option>
                            </select>
                        </div>
                    </div>

                    {/* FILA 3: Temperamento y Estado */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="temperamento">Temperamento</label>
                            <input type="text" id="temperamento" name="temperamento" value={formData.temperamento} onChange={handleChange} placeholder="Ej: Juguetón, Leal, Tranquilo" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="estadoMascota">Estado</label>
                            <select id="estadoMascota" name="estadoMascota" value={formData.estadoMascota} onChange={handleChange} required>
                                <option value="Disponible">Disponible</option>
                                <option value="Reservado">Reservado</option>
                            </select>
                        </div>
                    </div>

                    {/* IMAGEN MEJORADA CON DRAG & DROP */}
                    <div className="form-row">
                        <div className="form-group full-width">
                            <label htmlFor="imagen">Fotografía</label>
                            
                            <input 
                                type="file" 
                                id="imagen" 
                                name="imagen" 
                                accept="image/*"
                                onChange={handleFileChange} 
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                required={!isEditing && !previewUrl}
                            />

                            {!previewUrl ? (
                                <div 
                                    className="upload-placeholder"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--color-separator)',
                                        backgroundColor: isDragging ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0,0,0,0.02)',
                                        borderRadius: '8px',
                                        padding: '30px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                                    }}
                                >
                                    <UploadIcon />
                                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-medium)' }}>
                                        {isDragging ? '¡Suéltala aquí!' : 'Haz clic o arrastra una foto aquí'}
                                    </p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#999' }}>JPG, PNG (Max 5MB)</p>
                                </div>
                            ) : (
                                <div className="preview-container" style={{ position: 'relative', marginTop: '10px' }}>
                                    <img 
                                        src={previewUrl} 
                                        alt="Vista previa" 
                                        style={{ 
                                            width: '100%', 
                                            height: '250px', 
                                            objectFit: 'cover', 
                                            borderRadius: '8px', 
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
                                        }} 
                                    />
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                                            }}
                                        >
                                            Cambiar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            style={{
                                                background: 'rgba(255, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                            }}
                                            title="Eliminar foto"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full-width">
                            <label htmlFor="descripcion">Descripción detallada</label>
                            <textarea 
                                id="descripcion" 
                                name="descripcion" 
                                value={formData.descripcion} 
                                onChange={handleChange} 
                                rows={4} 
                                required 
                                placeholder="Cuenta la historia de la mascota, sus necesidades especiales, etc."
                            ></textarea>
                        </div>
                    </div>

                    <button type="submit" className="button-submit" disabled={isLoading}>
                        {isLoading ? <><Spinner /> Guardando...</> : submitText}
                    </button>
                    
                    {!!(onClose || onBack) && (
                        <button type="button" onClick={onBack || onClose} className="back-link-btn">
                            &larr; Cancelar y Volver
                        </button>
                    )}
                    
                    {!onClose && !onBack && (
                        <Link to="/mascotas" className="back-link-btn" style={{textAlign:'center', display: 'block', marginTop: '15px'}}>
                            Cancelar y Volver al Listado
                        </Link>
                    )}
                </form>
            </div>
        </main>
    );
};

export default AddPetPage;