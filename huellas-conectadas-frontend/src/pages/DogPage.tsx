import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import '../styles/style_dogs.css'; // Ruta ajustada
import '../styles/style_general.css'; // Ruta ajustada
import DogDetailPage from './DogDetailPage'; // Ruta ajustada
import AddPetPage from './AddPetPage'; // Ruta ajustada
import { api, ENDPOINTS } from '../services/api'; // Ruta ajustada
import { useAuth } from '../context/AuthContext'; // Ruta ajustada

const apiKey = "AIzaSyC7UnEBDEoM4ZKDw4Y6XuJVjMNVZfjAXX4"; 

interface BackendPet {
    id: number;
    nombre: string;
    raza: string;   
    edad: number;
    tamano: 'Pequeño' | 'Mediano' | 'Grande';
    descripcion: string;
    imagenes: string[];
    especie: 'Perro' | 'Gato';
    estadoMascota: string;
}

interface Pet extends Omit<BackendPet, 'estadoMascota'> {
    estado: 'Disponible' | 'Reservado' | 'Adoptado';
}

// --- CONSTANTES ---
const FILTER_DEFAULTS = {
    AGE: 'Cualquier edad',
    SIZE: 'Cualquier tamaño',
    STATUS: 'Cualquier estado',
    SPECIES: 'Cualquier especie'
} as const;

// --- HOOKS PERSONALIZADOS ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- ICONOS ---
const PawIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className={className}>
        <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"/>
    </svg>
);

const GeminiIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className={className}>
<path 
            d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5z
               M100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3z
               M69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5z
               M421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3z
               M310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"
        />    </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// --- COMPONENTES AUXILIARES ---

// 1. Tarjeta de Mascota en el Chat
const ChatPetCard = ({ pet, onClick }: { pet: Pet, onClick: (id: number) => void }) => (
    <div className="chat-pet-card" onClick={() => onClick(pet.id)}>
        <img src={pet.imagenes[0]} alt={pet.nombre} />
        <div className="chat-pet-info">
            <h4>{pet.nombre}</h4>
            <p>{pet.raza} • {pet.edad} años</p>
        </div>
    </div>
);

// 2. Componente de Chat Inteligente (Gemini Advisor - REAL AI)
interface GeminiAdvisorProps {
    onClose: () => void;
    allPets: Pet[];
    onPetClick: (id: number) => void;
}

interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'gemini';
    attachments?: Pet[]; // Mascotas sugeridas
}

const GeminiAdvisor = ({ onClose, allPets, onPetClick }: GeminiAdvisorProps) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 1, text: "¡Hola! Soy la IA de Huellas Conectadas. 🤖✨ Puedo analizar a todos nuestros animales en tiempo real para encontrar tu compañero ideal. Cuéntame sobre ti, tu hogar o qué buscas.", sender: 'gemini' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);


    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userText = input;
        setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
        setInput('');
        setIsTyping(true);

        try {
            // Validación previa de API Key para UX
            if (!apiKey) {
                 throw new Error("API Key missing");
            }

            // 1. Preparamos el contexto de las mascotas para la IA
            const petsContext = allPets
                .filter(p => p.estado !== 'Adoptado') // Solo disponibles
                .map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    raza: p.raza,
                    edad: p.edad,
                    tamano: p.tamano,
                    descripcion: p.descripcion,
                    especie: p.especie
                }));

            // 2. Construimos el Prompt
            const prompt = `
                Actúa como un asistente experto y empático de un refugio de animales llamado "Huellas Conectadas".
                Tu objetivo es recomendar las mejores mascotas disponibles basándote en la solicitud del usuario.

                DATOS DE MASCOTAS DISPONIBLES (JSON):
                ${JSON.stringify(petsContext)}

                SOLICITUD DEL USUARIO: 
                "${userText}"

                INSTRUCCIONES:
                1. Analiza profundamente la solicitud del usuario (estilo de vida, vivienda, experiencia, familia).
                2. Busca en la lista de mascotas las 1-3 mejores coincidencias. Si el usuario pide algo específico (ej: "gato"), ignora los otros animales (ej: perros), a menos que no haya coincidencias.
                3. Usa tu razonamiento: si alguien vive en un piso pequeño, prefiere animales de energía baja/media o tamaño pequeño/mediano, aunque no lo diga explícitamente.
                4. Responde EXCLUSIVAMENTE con un objeto JSON válido con este formato:
                {
                    "recommendations": [ { "id": 123 } ],
                    "responseMessage": "Texto amigable explicando por qué elegiste a estos animales o pidiendo más detalles si no hay buenas coincidencias."
                }
            `;

            // 3. Llamada a la API de Gemini
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error('API Key error (403)');
                throw new Error(`Error API: ${response.status}`);
            }

            const data = await response.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            // Limpieza del bloque de código JSON que a veces devuelve la IA
            const cleanJson = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedResult = JSON.parse(cleanJson);

            // 4. Procesar resultados
            const recommendedPets = parsedResult.recommendations
                .map((rec: any) => allPets.find(p => p.id === rec.id))
                .filter(Boolean) as Pet[];

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                text: parsedResult.responseMessage, 
                sender: 'gemini',
                attachments: recommendedPets
            }]);

        } catch (error: any) {
            console.error("Error calling Gemini API:", error);
            
            let errorMessage = "Lo siento, tuve un pequeño problema de conexión con mi cerebro digital. 🧠💥 ¿Podrías intentarlo de nuevo?";
            
            // Mensaje específico para falta de API Key
            if (error.message.includes('API Key') || error.message.includes('403')) {
                errorMessage = "⚠️ Falta la API Key. Para que pueda pensar, necesito que configures una API Key válida en el código (línea 12).";
            }

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                text: errorMessage, 
                sender: 'gemini'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="gemini-advisor-modal">
            <div className="advisor-header">
                <div className="advisor-title">
                    <GeminiIcon className="advisor-icon" />
                    <div>
                        <h3>Asistente IA (Real)</h3>
                        <span>Powered by Gemini 2.5</span>
                    </div>
                </div>
                <button onClick={onClose} className="advisor-close"><CloseIcon className="w-6 h-6"/></button>
            </div>

            <div className="advisor-messages">
                {messages.map(msg => (
                    <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                        <div className="message-bubble">
                            {msg.text}
                        </div>
                        {msg.attachments && msg.attachments.length > 0 && (
                            <div className="message-attachments">
                                {msg.attachments.map(pet => (
                                    <ChatPetCard key={pet.id} pet={pet} onClick={onPetClick} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="message-wrapper gemini">
                        <div className="message-bubble typing-bubble">
                            <span>.</span><span>.</span><span>.</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="advisor-input-area" onSubmit={handleSend}>
                <input 
                    type="text" 
                    placeholder="Escribe libremente... (ej: busco un amigo para correr)" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                />
                <button type="submit" disabled={!input.trim() || isTyping}>
                    <SendIcon className="w-5 h-5"/>
                </button>
            </form>
        </div>
    );
};


// 3. Tipado para la Card Principal
interface DogCardProps {
    dog: Pet;
    onClick: (id: number) => void;
}

const DogCard = React.memo(({ dog, onClick }: DogCardProps) => (
    <div 
        className={`dog-card ${dog.estado === 'Adoptado' ? 'dog-card-adopted' : ''}`}
        onClick={() => onClick(dog.id)}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick(dog.id)}
    >
        <div className={`status-badge status-${dog.estado.toLowerCase()}`}>
            {dog.estado}
        </div>
        
        {dog.imagenes[0] ? (
            <img 
                src={dog.imagenes[0]} 
                alt={`Perro ${dog.nombre}`} 
                className="dog-image" 
                loading="lazy" 
                style={dog.estado === 'Adoptado' ? { filter: 'grayscale(100%)' } : {}}
            />
        ) : (
            <img 
                src="https://placehold.co/600x400/CCCCCC/000000?text=Sin+Imagen" 
                alt="Sin imagen disponible" 
                className="dog-image"
                loading="lazy"
            />
        )}

        <div className="card-content">
            <h2>{dog.nombre}</h2>
            <p className="dog-specs">
                {dog.raza} | Edad: {dog.edad} años | Tamaño {dog.tamano}
            </p>
            
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(dog.id);
                }} 
                className="cta-button view-profile-button"
                aria-label={`Ver perfil de ${dog.nombre}`}
            >
                Ver Perfil
            </button>
        </div>
    </div>
));

interface FilterBarProps {
    filters: {
        search: string;
        species: string;
        age: string;
        size: string;
        status: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<any>>;
    totalResults: number;
}

const FilterBar = ({ filters, setFilters, totalResults }: FilterBarProps) => { 
    const handleChange = (field: string, value: string) => {
        setFilters((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="filter-wrapper">
            <div className="filter-bar">
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o raza..."
                    value={filters.search}
                    onChange={(e) => handleChange('search', e.target.value)}
                    className="search-input"
                    aria-label="Buscar mascotas"
                />
                
                <select 
                    value={filters.species} 
                    onChange={(e) => handleChange('species', e.target.value)}
                    aria-label="Filtrar por especie"
                >
                    <option value={FILTER_DEFAULTS.SPECIES}>Especie (Todos)</option>
                    <option value="Perro">🐶 Perros</option>
                    <option value="Gato">🐱 Gatos</option>
                </select>

                <select 
                    value={filters.age} 
                    onChange={(e) => handleChange('age', e.target.value)}
                    aria-label="Filtrar por edad"
                >
                    <option value={FILTER_DEFAULTS.AGE}>Edad (Todas)</option>
                    <option value="Cachorro">Cachorro</option>
                    <option value="Adulto">Adulto</option>
                    <option value="Senior">Senior</option>
                </select>

                <select 
                    value={filters.size} 
                    onChange={(e) => handleChange('size', e.target.value)}
                    aria-label="Filtrar por tamaño"
                >
                    <option value={FILTER_DEFAULTS.SIZE}>Tamaño (Todos)</option>
                    <option value="Pequeño">Pequeño</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Grande">Grande</option>
                </select>

                <select 
                    value={filters.status} 
                    onChange={(e) => handleChange('status', e.target.value)}
                    aria-label="Filtrar por estado"
                >
                    <option value={FILTER_DEFAULTS.STATUS}>Estado (Todos)</option>
                    <option value="Disponible">Disponible</option>
                    <option value="Reservado">Reservado</option>
                    <option value="Adoptado">❤️ Adoptado</option>
                </select>
            </div>
            
            <div className="results-feedback" style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666', marginLeft: '5px' }}>
                Encontramos <strong>{totalResults}</strong> peludos coinciden con tu búsqueda. 🐾
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const DogsPage: React.FC = () => {
    const { isProtectora } = useAuth();
    const [allDogs, setAllDogs] = useState<Pet[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estado para el Chat Advisor
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

    // Estado unificado para filtros
    const [filters, setFilters] = useState({
        search: '',
        age: FILTER_DEFAULTS.AGE,
        size: FILTER_DEFAULTS.SIZE,
        status: FILTER_DEFAULTS.STATUS,
        species: FILTER_DEFAULTS.SPECIES
    });

    const debouncedSearchTerm = useDebounce(filters.search, 300);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

    // --- INTEGRACIÓN DE LA API ---
    const fetchDogs = useCallback(async () => {
        setIsLoading(true);
        if (allDogs.length === 0) setIsInitialLoad(true);
        
        try {
            const data = await api.get(ENDPOINTS.PETS) as BackendPet[];
            
            if (!Array.isArray(data)) throw new Error("Formato de respuesta inválido.");

            const validStates = ['Disponible', 'Reservado', 'Adoptado'];
            
            const dogsWithStatus: Pet[] = data.map((pet) => {
                let estadoFinal: 'Disponible' | 'Reservado' | 'Adoptado' = 'Disponible';
                if (pet.estadoMascota && validStates.includes(pet.estadoMascota)) {
                    estadoFinal = pet.estadoMascota as any;
                }

                return {
                    ...pet,
                    estado: estadoFinal
                };
            });
            
            const sortedDogs = dogsWithStatus.sort((a, b) => b.id - a.id);
            
            setAllDogs(sortedDogs); 
            setError(null);
        } catch (err: any) {
            console.error("Error fetching dogs:", err);
            setError(err.message || 'Error desconocido al cargar las mascotas.');
        } finally {
            setTimeout(() => {
                setIsLoading(false);
                setIsInitialLoad(false);
            }, 500);
        }
    }, [allDogs.length]);

    useEffect(() => {
        fetchDogs();
    }, [fetchDogs]);

    // Lógica de Filtrado (Vista Principal)
    const filteredDogs = useMemo(() => {
        const getAgeCategory = (age: number): string => {
            if (age < 1) return 'Cachorro';
            if (age >= 1 && age <= 7) return 'Adulto';
            return 'Senior';
        };

        return allDogs.filter(dog => {
            const matchesSearch = dog.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                                  dog.raza.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            
            const matchesAge = filters.age === FILTER_DEFAULTS.AGE || getAgeCategory(dog.edad) === filters.age;
            const matchesSize = filters.size === FILTER_DEFAULTS.SIZE || dog.tamano === filters.size;
            
            const matchesStatus = filters.status === FILTER_DEFAULTS.STATUS 
                ? dog.estado !== 'Adoptado' 
                : dog.estado === filters.status;
            
            const matchesSpecies = filters.species === FILTER_DEFAULTS.SPECIES || 
                                   (filters.species === 'Perro' && (!dog.especie || dog.especie === 'Perro')) || 
                                   (filters.species === 'Gato' && dog.especie === 'Gato');

            return matchesSearch && matchesAge && matchesSize && matchesStatus && matchesSpecies;
        });
    }, [allDogs, debouncedSearchTerm, filters.age, filters.size, filters.status, filters.species]);


    // --- HANDLERS CENTRALIZADOS ---
    const closeDetailModal = () => {
        setSelectedDogId(null);
        document.body.style.overflow = 'auto'; 
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        document.body.style.overflow = 'auto'; 
    };

    const openModal = (id: number) => {
        setSelectedDogId(id);
        setIsAdvisorOpen(false); // Cerrar chat si se abre perfil desde el chat
        document.body.style.overflow = 'hidden'; 
    };

    const openAddModal = () => {
        setIsAddModalOpen(true);
        document.body.style.overflow = 'hidden'; 
    };

    const openAdvisor = () => {
        setIsAdvisorOpen(true);
        document.body.style.overflow = 'hidden';
    }

    const closeAdvisor = () => {
        setIsAdvisorOpen(false);
        document.body.style.overflow = 'auto';
    }


    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedDogId(prev => { if(prev) document.body.style.overflow = 'auto'; return null; });
                setIsAddModalOpen(prev => { if(prev) document.body.style.overflow = 'auto'; return false; });
                setIsAdvisorOpen(prev => { if(prev) document.body.style.overflow = 'auto'; return false; });
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Render Condicional
    if (isInitialLoad && isLoading) {
        return (
            <main className="dogs-content dogs-container" style={{ minHeight: '80vh' }} role="status">
                <div className="loading-container">
                    <div className="paw-prints-loader">
                        {[...Array(5)].map((_, i) => <PawIcon key={i} className="loading-paw" />)}
                    </div>
                    <p className="loading-text">Buscando amigos...</p>
                </div>
            </main>
        );
    }

    if (error && allDogs.length === 0) return (
        <main className="main-content dogs-container">
            <p className="no-results error-message">⚠️ {error}</p>
            <button onClick={fetchDogs} className="cta-button">Reintentar</button>
        </main>
    );
    
    return (
        <main className="dogs-content dogs-container" style={{ position: 'relative' }}>
            
            {isLoading && !isInitialLoad && (
                <div className="loading-overlay-discrete" role="status">
                    <div className="spinner-mini"></div>
                    Actualizando...
                </div>
            )}

            <div className="page-header">
                <div className="header-title-group">
                    <h1>🐾 Nuestros Amigos en Adopción</h1>
                    <p>Encuentra a tu compañero ideal. ¡Todos esperan un hogar!</p>
                </div>
            </div>

            <FilterBar 
                filters={filters} 
                setFilters={setFilters} 
                totalResults={filteredDogs.length}
            />

            <div className="dogs-grid">
                {filteredDogs.length > 0 ? (
                    filteredDogs.map((dog) => (
                        <DogCard key={dog.id} dog={dog} onClick={openModal} />
                    ))
                ) : (
                    <div className="no-results-container">
                        <p className="no-results">No se encontraron mascotas con los filtros seleccionados. 😥</p>
                        <button 
                            className="text-link"
                            onClick={() => setFilters({
                                search: '', 
                                age: FILTER_DEFAULTS.AGE, 
                                size: FILTER_DEFAULTS.SIZE, 
                                status: FILTER_DEFAULTS.STATUS, 
                                species: FILTER_DEFAULTS.SPECIES
                            })}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* BOTÓN FLOTANTE DE AÑADIR MASCOTA (SOLO PROTECTORA) */}
            {isProtectora && (
                <button 
                    onClick={openAddModal} 
                    className="floating-add-btn" 
                    aria-label="Añadir nueva mascota"
                    title="Añadir Mascota"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            )}

            {/* BOTÓN FLOTANTE DE ASISTENTE IA (SOLO USUARIO NORMAL) */}
            {!isProtectora && (
                <button 
                    onClick={openAdvisor} 
                    className="floating-ai-btn" 
                    aria-label="Abrir Asistente de Adopción Gemini"
                    title="Asistente Gemini"
                >
                    <GeminiIcon className="floating-ai-icon" />
                </button>
            )}

            {selectedDogId && (
                <div className="modal" onClick={closeDetailModal} role="dialog" aria-modal="true">
                    <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
                        <DogDetailPage 
                            dogIdProp={selectedDogId.toString()} 
                            onClose={closeDetailModal} 
                            onStatusChange={fetchDogs} 
                        />
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="modal" onClick={closeAddModal} role="dialog" aria-modal="true">
                    <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
                        <AddPetPage 
                            onClose={closeAddModal} 
                            onSuccess={() => { closeAddModal(); fetchDogs(); }} 
                        />
                    </div>
                </div>
            )}

            {/* --- MODAL DEL ASISTENTE GEMINI --- */}
            {isAdvisorOpen && (
                <div className="modal-overlay-advisor" onClick={closeAdvisor}>
                    <div className="advisor-container" onClick={(e) => e.stopPropagation()}>
                        <GeminiAdvisor 
                            onClose={closeAdvisor} 
                            allPets={allDogs} 
                            onPetClick={openModal} 
                        />
                    </div>
                </div>
            )}
            
            <style>{`
                /* Estilos existentes */
                .loading-overlay-discrete {
                    position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.95);
                    padding: 8px 16px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    z-index: 50; display: flex; align-items: center; gap: 8px;
                    font-size: 0.85rem; font-weight: 600; color: var(--color-primary);
                }
                .spinner-mini {
                    width: 14px; height: 14px; border: 2px solid var(--color-primary);
                    border-top-color: transparent; border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .text-link {
                    background: none; border: none; color: var(--color-primary);
                    text-decoration: underline; cursor: pointer; margin-top: 10px;
                }
                .dog-card-adopted { opacity: 0.85; }
                .dog-card-adopted:hover { opacity: 1; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                /* --- MODAL ADVISOR (CHAT) --- */
                .modal-overlay-advisor {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 2000;
                }

                .advisor-container {
                    width: 90%; max-width: 500px; height: 600px;
                    background: white; border-radius: 16px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                    display: flex; flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { transform: translateY(0); }
                }

                .advisor-header {
                    padding: 15px 20px;
                    background: linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%);
                    color: white;
                    display: flex; justify-content: space-between; align-items: center;
                }

                .advisor-title { display: flex; gap: 12px; align-items: center; }
                .advisor-icon { width: 32px; height: 32px; fill: white; }
                .advisor-title h3 { margin: 0; font-size: 1.1rem; }
                .advisor-title span { font-size: 0.8rem; opacity: 0.9; }

                .advisor-close {
                    background: none; border: none; color: white; cursor: pointer;
                    opacity: 0.8; transition: opacity 0.2s;
                }
                .advisor-close:hover { opacity: 1; }

                .advisor-messages {
                    flex: 1; padding: 20px; overflow-y: auto;
                    background: #f9fafb; display: flex; flex-direction: column; gap: 15px;
                }

                .message-wrapper {
                    display: flex; flex-direction: column;
                    max-width: 80%;
                }
                .message-wrapper.user { align-self: flex-end; align-items: flex-end; }
                .message-wrapper.gemini { align-self: flex-start; align-items: flex-start; }

                .message-bubble {
                    padding: 12px 16px; border-radius: 12px;
                    font-size: 0.95rem; line-height: 1.5;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .user .message-bubble {
                    background: #4f46e5; color: white;
                    border-bottom-right-radius: 2px;
                }
                .gemini .message-bubble {
                    background: white; color: #374151;
                    border-bottom-left-radius: 2px; border: 1px solid #e5e7eb;
                }

                .typing-bubble { display: flex; gap: 4px; padding: 12px 16px; }
                .typing-bubble span {
                    width: 6px; height: 6px; background: #9ca3af; border-radius: 50%;
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                .typing-bubble span:nth-child(1) { animation-delay: -0.32s; }
                .typing-bubble span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

                .message-attachments {
                    margin-top: 10px; display: flex; flex-direction: column; gap: 8px; width: 100%;
                }

                .chat-pet-card {
                    display: flex; gap: 12px; padding: 8px;
                    background: white; border-radius: 8px;
                    border: 1px solid #e5e7eb; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .chat-pet-card:hover {
                    transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border-color: #c7d2fe;
                }
                .chat-pet-card img {
                    width: 50px; height: 50px; border-radius: 6px; object-fit: cover;
                }
                .chat-pet-info h4 { margin: 0; font-size: 0.9rem; color: #1f2937; }
                .chat-pet-info p { margin: 2px 0 0; font-size: 0.8rem; color: #6b7280; }

                .advisor-input-area {
                    padding: 15px; background: white; border-top: 1px solid #e5e7eb;
                    display: flex; gap: 10px;
                }
                .advisor-input-area input {
                    flex: 1; padding: 10px 15px; border-radius: 25px;
                    border: 1px solid #d1d5db; outline: none; transition: border-color 0.2s;
                }
                .advisor-input-area input:focus { border-color: #7c3aed; }
                .advisor-input-area button {
                    background: #4f46e5; color: white; border: none;
                    width: 42px; height: 42px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: background 0.2s;
                }
                .advisor-input-area button:hover { background: #4338ca; }
                .advisor-input-area button:disabled { background: #e5e7eb; cursor: not-allowed; }

                .ai-hint { font-size: 0.9rem; color: #555; display: none; }
                @media (min-width: 768px) { .ai-hint { display: block; } }
            `}</style>
        </main>
    );
};

export default DogsPage;