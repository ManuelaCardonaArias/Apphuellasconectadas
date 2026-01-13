import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/style_aboutus.css';

// --- ICONOS SVG ---
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="40" height="40">
    <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/>
  </svg>
);

const HandshakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor" width="40" height="40">
    <path d="M434.7 64h-9.7c-32.3 0-61.9 17.2-79.3 43.1L303.4 169.6c-17.7 26.5-27.1 57.7-27.1 89.6V416c0 53 43 96 96 96h176c53 0 96-43 96-96V336c0-40.2-24.1-75.3-59.3-89.9l-61.2-25.5c-19.1-8-32.8-25.5-35.3-46.1l-6-49.3c-2.8-23.4-22.7-41.2-46.3-41.2h-1.6zM215 64h-9.7c-23.6 0-43.5 17.8-46.3 41.2l-6 49.3c-2.5 20.6-16.2 38.1-35.3 46.1l-61.2 25.5C21.6 240.7-2.5 275.8-2.5 316v80c0 53 43 96 96 96h176c53 0 96-43 96-96V259.2c0-31.9-9.4-63.1-27.1-89.6L294.3 107.1C276.9 81.2 247.3 64 215 64z"/>
  </svg>
);

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="40" height="40">
    <path d="M272 96c-78.6 0-145.1 51.5-167.7 122.5c33.6-17 71.5-26.5 111.7-26.5h88c8.8 0 16 7.2 16 16s-7.2 16-16 16H288 216s0 0 0 0c-16.6 0-32.7 1.9-48.3 5.4c-25.9 5.9-49.9 16.4-71.4 30.7c0 0 0 0 0 0C38.3 298.8 0 364.9 0 440v16c0 13.3 10.7 24 24 24s24-10.7 24-24V440c0-48.7 20.7-92.5 53.8-123.2C121.6 392.3 190.3 448 272 448l1 0c132.5 0 240-107.5 240-240S404.5 96 272 96zM272 416c-117.5 0-217.6-69.6-258.6-168.2C29.7 220.8 68.3 203.2 110.8 198C126.9 203.2 144.9 208 164 208h40 100c53 0 96 43 96 96s-43 96-96 96h-32z"/>
  </svg>
);

const BulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" width="40" height="40">
    <path d="M272 384c9.6-31.9 29.5-59.1 49.2-86.2l0 0c5.2-7.1 10.4-14.2 15.4-21.4c19.8-28.5 31.4-63 31.4-100.3C368 78.8 289.2 0 192 0S16 78.8 16 176c0 37.3 11.6 71.9 31.4 100.3c5 7.2 10.2 14.3 15.4 21.4l0 0c19.8 27.1 39.7 54.4 49.2 86.2H272zM192 512c44.2 0 80-35.8 80-80V416H112v16c0 44.2 35.8 80 80 80zM112 176c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16s7.2-16 16-16H96c8.8 0 16 7.2 16 16z"/>
  </svg>
);

const AboutUs: React.FC = () => {
    // Datos de la sección
    const mission = {
        title: "Nuestra Misión",
        content: "Conectar animales sin hogar con familias amorosas de forma transparente y responsable. Creemos que cada mascota merece una segunda oportunidad y trabajamos incansablemente para facilitar el proceso de adopción, apoyando tanto a los adoptantes como a las protectoras con herramientas digitales modernas."
    };

    const story = {
        title: "Nuestra Historia",
        content: "Huellas Conectadas nació en 2023 cuando un grupo de amantes de los animales y desarrolladores notó una desconexión vital: muchas protectoras pequeñas hacían un trabajo increíble pero carecían de visibilidad digital. Decidimos crear un puente. Lo que comenzó como un pequeño proyecto para un refugio local, hoy es una plataforma que une a cientos de corazones en toda la región.",
        image: "https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=1000" // Imagen de placeholder de calidad
    };

    const values = [
        { icon: <HeartIcon />, title: "Compasión", description: "El bienestar de los animales es el centro de todo lo que hacemos. Abogamos por un trato ético y respetuoso.", colorClass: "blue" },
        { icon: <HandshakeIcon />, title: "Transparencia", description: "Garantizamos un proceso de adopción abierto y honesto, proporcionando información detallada sobre cada mascota.", colorClass: "green" },
        { icon: <LeafIcon />, title: "Compromiso", description: "Fomentamos la adopción responsable, ofreciendo recursos y apoyo a largo plazo para asegurar el éxito de cada unión.", colorClass: "yellow" },
        { icon: <BulbIcon />, title: "Innovación", description: "Utilizamos la tecnología para hacer que el proceso de encontrar y adoptar una mascota sea más fácil y eficiente.", colorClass: "pink" },
    ];

    return (
        <div className="about-page-wrapper">
            <div className="about-container">
                {/* Cabecera Principal (Hero) */}
                <section className="hero-section">
                    <div className="hero-content-wrapper">
                        <h1 className="hero-title">
                            Conoce a Huellas Conectadas
                        </h1>
                        <p className="hero-subtitle">
                            Somos el puente digital entre las protectoras de animales y los futuros hogares de sus residentes peludos. Uniendo corazones, una huella a la vez.
                        </p>
                    </div>
                </section>

                <main>
                    {/* Sección de Misión */}
                    <section className="mission-section">
                        <div className="mission-content centered">
                            <h2 className="section-title-main">
                                {mission.title}
                            </h2>
                            <p className="mission-text-large">
                                {mission.content}
                            </p>
                        </div>
                    </section>

                    {/* Nueva Sección: Nuestra Historia (Layout Izquierda/Derecha si el CSS lo permite, sino bloque) */}
                    <section className="story-section">
                        <div className="story-grid">
                            <div className="story-image-container">
                                <img src={story.image} alt="Perro feliz adoptado" className="story-img" />
                            </div>
                            <div className="story-text-content">
                                <h2 className="section-title">{story.title}</h2>
                                <p className="story-paragraph">{story.content}</p>
                            </div>
                        </div>
                    </section>

                    {/* Sección de Valores */}
                    <section className="values-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                Nuestros Valores
                            </h2>
                            <p className="section-desc">Los pilares que sostienen nuestra comunidad.</p>
                        </div>

                        <div className="values-grid">
                            {values.map((value, index) => (
                                <div 
                                    key={index} 
                                    className={`value-card ${value.colorClass}`}
                                >
                                    <div className="value-icon-svg">
                                        {value.icon}
                                    </div>
                                    <h3 className="value-title">{value.title}</h3>
                                    <p className="value-desc">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                
                    {/* Sección de Impacto (Estadísticas Reales) */}
                    <section className="impact-section">
                        <h2 className="impact-title">
                            Nuestro Impacto
                        </h2>
                        
                        <div className="impact-grid">
                            <div className="stat-item">
                                <div className="stat-number">524</div>
                                <div className="stat-divider"></div>
                                <p className="stat-label">Mascotas adoptadas</p>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-number">42</div>
                                <div className="stat-divider"></div>
                                <p className="stat-label">Protectoras asociadas</p>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-number">24/7</div>
                                <div className="stat-divider"></div>
                                <p className="stat-label">Soporte a la comunidad</p>
                            </div>
                        </div>
                    </section>

                    {/* Llamada a la acción final */}
                    <div className="cta-container">
                        <div className="cta-content">
                            <h3 className="cta-title">¿Listo para cambiar una vida?</h3>
                            <p className="cta-text">Tu nuevo mejor amigo te está esperando.</p>
                            <Link to="/mascotas" className="cta-button-about">
                                Encuentra tu compañero ideal
                            </Link>
                        </div>
                    </div>
                    
                </main>
            </div>
        </div>
    );
};

export default AboutUs;