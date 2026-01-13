// DonacionExitosaPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';

// Estilos de ejemplo para la tarjeta
const cardStyles = { 
    textAlign: 'center' as const, 
    padding: '50px 20px', 
    maxWidth: '500px',
    margin: '100px auto',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#fff',
};

const DonacionExitosaPage: React.FC = () => {

    // Ya no necesitamos lógica de estado o useEffect, el mensaje es estático.
    
    return (
        <div className="main-content">
            <div className="form-card" style={cardStyles}>
                
                <div style={{ fontSize: '60px', marginBottom: '20px', color: '#27ae60' }}>🎉</div>
                
                <h2 style={{ color: '#27ae60', marginBottom: '15px' }}>¡Muchas gracias por tu ayuda!</h2>
                
                <p style={{ fontSize: '1.1em', color: '#555', margin: '15px 0' }}>
                    Tu donación ha sido procesada correctamente.
                </p>
                
                <p style={{ color: '#555' }}>
                    Recibirás un comprobante en tu correo electrónico en breve.
                </p>
                
                <div style={{ marginTop: '40px' }}>
                    <Link 
                        to="/mascotas" 
                        className="button-submit" 
                        style={{ display: 'inline-block', textDecoration: 'none', width: 'auto', padding: '12px 30px' }}
                    >
                        Ver animales en adopción
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DonacionExitosaPage;