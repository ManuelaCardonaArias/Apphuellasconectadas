import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // IMPORTANTE: El nuevo contexto

// IMPORTACIONES DE COMPONENTES
import Header from './components/Header'; 
import Footer from './components/Footer'; 

// IMPORTACIONES DE PÁGINAS
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DogsPage from './pages/DogPage'; 
import DogDetailPage from './pages/DogDetailPage';
import AppointmentPage from './pages/AppointmentPage'; 
import AddPetPage from './pages/AddPetPage'; 
import EditProfilePage from './pages/EditProfile';
import DonationPage from './pages/DonationPage'; 
import DonacionExitosa from './components/DonacionExitosa'; 
import AboutUs from './pages/AboutUs'; 
//Recuperar contraseña usuario
import RecoveryPasswordPage from './pages/RecoveryPasswordPage';
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';
// Estilos globales
import './styles/style_general.css';

// --- COMPONENTE DE RUTA PROTEGIDA (Ahora usa el Contexto) ---
const ProtectedRoute = ({ element, requireProtectora = false }: { element: React.ReactElement, requireProtectora?: boolean }) => {
    const { isAuthenticated, isProtectora, isLoading } = useAuth();

    if (isLoading) return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando...</div>;

    if (!isAuthenticated) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Acceso denegado. Por favor, <Link to="/login">inicia sesión</Link>.</div>;
    }

    if (requireProtectora && !isProtectora) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Permisos insuficientes. Solo Protectoras pueden acceder.</div>;
    }

    return element;
};

// --- CONTENIDO PRINCIPAL (Consumidor del Contexto) ---
const AppContent = () => {
    // Ya no necesitamos pasar props a Header, él se conecta solo al AuthContext
    return (
        <div className="app-main-container">
            <Header /> 
            
            <main>
                <Routes>
                    {/* --- RUTAS PÚBLICAS --- */}
                    <Route path="/" element={<HomePage />} /> 
                    <Route path="/mascotas" element={<DogsPage />} />
                    <Route path="/donaciones" element={<DonationPage />} />
                    <Route path="/donacionExitosa" element={<DonacionExitosa />} />
                    <Route path="/sobrenosotros" element={<AboutUs />} /> 
                    <Route path="/mascotas/:dogId" element={<DogDetailPage />} />
                    
                    {/* --- RUTAS DE AUTENTICACIÓN --- */}
                    {/* El LoginPage ya no necesita props onLoginSuccess, el contexto lo maneja */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} /> 
                    <Route path="/recuperar-pass" element={<RecoveryPasswordPage />} />
                    <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
                    {/* --- RUTAS PROTEGIDAS (GENERAL) --- */}
                    <Route path="/edit-profile" element={<ProtectedRoute element={<EditProfilePage />} />} />
                    <Route path="/cita/:dogId" element={<ProtectedRoute element={<AppointmentPage />} />} />

                    {/* --- RUTAS PROTEGIDAS (SOLO PROTECTORAS) --- */}
                    <Route path="/afegir-gos" element={<ProtectedRoute element={<AddPetPage />} requireProtectora={true} />} /> 
                    <Route path="/editar-mascota/:dogId" element={<ProtectedRoute element={<AddPetPage />} requireProtectora={true} />} /> 
                    
                    {/* Ruta 404 */}
                    <Route path="*" element={<div style={{textAlign: 'center', marginTop: '50px'}}>404 | Página no encontrada</div>} />
                </Routes>
            </main>
            
            <Footer />
        </div>
    );
};

// --- COMPONENTE RAÍZ (Proveedor del Contexto) ---
const App = () => {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
};

export default App;