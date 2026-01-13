// src/utils/advisorKnowledge.ts

// ---------------------------------------------------------------------------
// 1. DICCIONARIO DE ENTRADA (Lo que el usuario escribe)
// ---------------------------------------------------------------------------
export const USER_INPUTS = {
    SPECIES: {
        Perro: ['perro', 'canino', 'firulais', 'perrito', 'chucho', 'lomito', 'doggo', 'cachorro', 'can'],
        Gato: ['gato', 'felino', 'mishi', 'minino', 'gatito', 'michito', 'bigotes', 'felinido', 'minino']
    },
    SIZE: {
        Pequeño: ['pequeño', 'chico', 'mini', 'bolsillo', 'compacto', 'toy', 'diminuto', 'portatil', 'faldero', 'menos de 10kg'],
        Mediano: ['mediano', 'normal', 'talla media', 'tamaño promedio', 'ni muy grande ni muy chico', 'estándar'],
        Grande: ['grande', 'enorme', 'gigante', 'imponente', 'talla grande', 'maxi', 'corporento', 'gran danés', 'mastín']
    },
    AGE: {
        Cachorro: ['cachorro', 'bebé', 'bebe', 'joven', 'cria', 'meses'],
        Adulto: ['adulto', 'maduro', 'plena vida', 'crecido'],
        Senior: ['senior', 'mayor', 'viejo', 'abuelo', 'tercera edad', 'jubilado', 'anciano', 'viejito']
    },
    // Palabras que indican negación
    NEGATION: ['no ', 'sin ', 'evito ', 'no quiero ', 'no compatible con ', 'odio ', 'anti-', 'necesito que no', 'tampoco'],
};

// ---------------------------------------------------------------------------
// 2. DICCIONARIO DE SALIDA (Lo que buscamos en la base de datos)
// ---------------------------------------------------------------------------
export const PET_TRAITS = {
    // Nivel de Energía
    ALTA_ENERGIA: ['activo', 'mucha energía', 'correr', 'deporte', 'agility', 'nervioso', 'incansable', 'atleta', 'juguetón', 'terremoto'],
    MEDIA_ENERGIA: ['equilibrado', 'paseos normales', 'juega', 'moderado'],
    BAJA_ENERGIA: ['tranquilo', 'sofá', 'manta', 'siestas', 'relajado', 'calmado', 'dormilón', 'sedentario', 'paz', 'descanso'],

    // Personalidad
    CARIÑOSO: ['cariñoso', 'mimoso', 'pegajoso', 'besucón', 'faldero', 'amoroso', 'dulce', 'tierno', 'apegado', 'leal'],
    INDEPENDIENTE: ['independiente', 'a su aire', 'solitario', 'no molesta', 'autónomo', 'desapegado'],
    TIMIDO: ['tímido', 'miedoso', 'asustadizo', 'inseguro', 'trauma', 'paciencia', 'poco a poco', 'cauto'],
    PROTECTOR: ['guardián', 'protector', 'territorial', 'ladra', 'vigilante', 'carácter fuerte', 'seguro'],

    // Convivencia
    KIDS_FRIENDLY: ['niños', 'familia', 'chicos', 'infantil', 'bebes', 'paciente', 'niñera'],
    DOG_FRIENDLY: ['con perros', 'jauría', 'sociable', 'sumiso', 'juega con perros', 'compatible perros'],
    CAT_FRIENDLY: ['con gatos', 'ignora gatos', 'amigo de gatos', 'compatible gatos', 'test de gatos'],
    
    // Nivel de Experiencia Requerido
    FACIL: ['primerizos', 'fácil', 'novatos', 'dócil', 'obediente', 'aprende rápido', 'buenazo', 'santo'],
    DIFICIL: ['experiencia', 'adiestrador', 'etólogo', 'rehabilitación', 'caso especial', 'mordedor', 'reactivo', 'dominante'],

    // Salud
    SALUD_DELICADA: ['leishmania', 'tratamiento', 'pastillas', 'crónico', 'displasia', 'ciego', 'sordo', 'tripode', 'tres patas']
};

// ---------------------------------------------------------------------------
// 3. REGLAS DE INFERENCIA (La "Inteligencia")
// Si el usuario dice X (User Keyword), asumimos que busca Y (Required Traits)
// ---------------------------------------------------------------------------
export const INFERENCE_RULES = [
    // Estilo de vida: Piso/Apartamento
    {
        keywords: ['piso', 'apartamento', 'depto', 'casa pequeña', 'sin jardín', 'ciudad'],
        deductions: {
            traits_preferred: ['BAJA_ENERGIA', 'MEDIA_ENERGIA'], // Prefieren tranquilos
            traits_excluded: ['ALTA_ENERGIA', 'PROTECTOR'], // Evitar muy activos o guardianes (ladridos)
            sizes_excluded: ['Grande'] // Generalmente no quieren gigantes en pisos
        }
    },
    // Estilo de vida: Deporte/Campo
    {
        keywords: ['correr', 'senderismo', 'montaña', 'campo', 'finca', 'huerta', 'maratón', 'bici', 'viajar'],
        deductions: {
            traits_preferred: ['ALTA_ENERGIA'],
            traits_excluded: ['BAJA_ENERGIA', 'SALUD_DELICADA', 'TIMIDO'],
        }
    },
    // Situación: Familia con niños
    {
        keywords: ['hijo', 'niño', 'bebé', 'familia', 'nietos', 'chiquillos'],
        deductions: {
            traits_preferred: ['KIDS_FRIENDLY', 'FACIL'],
            traits_excluded: ['TIMIDO', 'DIFICIL', 'PROTECTOR'], // Evitar perros miedosos o agresivos
        }
    },
    // Situación: Pasa tiempo solo
    {
        keywords: ['trabajo mucho', 'solo en casa', 'horas solo', 'oficina'],
        deductions: {
            traits_preferred: ['INDEPENDIENTE', 'BAJA_ENERGIA'],
            traits_excluded: ['CARIÑOSO'] // Evitar ansiedad por separación (velcro)
        }
    },
    // Situación: Principiante
    {
        keywords: ['primera vez', 'primer perro', 'nunca he tenido', 'novato', 'no se'],
        deductions: {
            traits_preferred: ['FACIL'],
            traits_excluded: ['DIFICIL', 'TIMIDO', 'PROTECTOR']
        }
    },
     // Situación: Busca Guardián
     {
        keywords: ['guardar', 'seguridad', 'vigilar', 'finca', 'nave', 'proteger'],
        deductions: {
            traits_preferred: ['PROTECTOR', 'ALTA_ENERGIA'],
            traits_excluded: ['TIMIDO', 'CARIÑOSO']
        }
    }
];