import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  useStripe,
  useElements,
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { useNavigate, useLocation } from "react-router-dom"; // [MEJORA 3] Hooks de router

import "../styles/style_donation.css";
import { api } from "../services/api"; // [MEJORA 1] Servicio API
import { useAuth } from "../context/AuthContext"; // [MEJORA 2] Contexto Auth

// --- COMPONENTE SPINNER ---
const Spinner = () => (
    <div className="spinner-mini" style={{
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', 
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// Nota: En producción, esta clave debería venir de import.meta.env.VITE_STRIPE_KEY
const stripePromise = loadStripe(
  "pk_test_51SZVSKGfSI1RlbzscHGBEQNq93J220DKEBEzJBURzJ1Z27kueEvjIwD9cpxzq6sbK1zR1jVchsdoj7K4YWLXBVl100ykZvD7G1"
);

type MetodoPago = "card" | "paypal";

const DonationForm: React.FC = () => {
  // --- HOOKS ---
  const { isAuthenticated, user } = useAuth(); // [MEJORA 2]
  const navigate = useNavigate(); // [MEJORA 3]
  const location = useLocation();
  const stripe = useStripe();
  const elements = useElements();

  // --- ESTADO ---
  const [selectedAmount, setSelectedAmount] = useState<number | null>(20);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [cardholderName, setCardholderName] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("card");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amounts = [5, 10, 20, 50, 100];
  const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  // --- ESTILOS STRIPE ---
  const CARD_OPTIONS = {
    style: {
      base: {
        fontSize: "16px",
        color: "#374151",
        letterSpacing: "0.025em",
        fontFamily: "Inter, sans-serif",
        "::placeholder": { color: "#9ca3af" },
        padding: "12px 16px",
      },
      invalid: { color: "#ef4444" },
    },
  };

  // --- HANDLERS ---
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setIsAnonymous(false);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    } else {
      setSelectedAmount(amounts[2]);
    }
  };

  const displayError = (message: string) => {
    setErrorMessage(message);
    // Auto-ocultar error, pero limpiar timer si se desmonta
    const timer = setTimeout(() => setErrorMessage(null), 8000);
    return () => clearTimeout(timer);
  };

  // Manejo de respuesta de PayPal
  const handlePayPalCallback = async (orderId: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // [MEJORA 1] Usar api.get en lugar de fetch manual
      const data = await api.get<any>(`/paypal/capturar?token=${orderId}`);

      if (data.metodoPago === "paypal") {
        navigate("/donacionExitosa"); // [MEJORA 3] Navegación interna
      } else {
        throw new Error(data.error || "Error al confirmar la donación de PayPal");
      }
    } catch (err: any) {
      console.error("Error PayPal:", err);
      // Redirigir a home con error si falla gravemente, o mostrar error en pantalla
      navigate(`/?error=${encodeURIComponent(err.message || "Error PayPal")}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- EFECTOS ---
  useEffect(() => {
    // Detectar retorno de PayPal
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has("token")) {
      const token = urlParams.get("token") as string;
      // Limpiar URL visualmente
      window.history.replaceState(null, "", location.pathname);
      handlePayPalCallback(token);
    }
  }, [location]);

  // --- LÓGICA DE DONACIÓN ---
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (finalAmount <= 0) {
      displayError("Por favor, introduce una cantidad válida.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1️⃣ Iniciar Intento de Pago
      // [MEJORA 1] Usar api.post. El servicio ya inyecta el token si existe.
      const initData = await api.post<any>('/donar', {
        monto: finalAmount,
        metodoPago: metodoPago,
        nombreDonante: isAnonymous ? "Anónimo" : (cardholderName || user?.name || "Usuario"),
      });

      // CASO PAYPAL
      if (metodoPago === "paypal") {
        if (initData.redirectUrl) {
          window.location.href = initData.redirectUrl; // Redirección externa necesaria
          return;
        } else {
          throw new Error("Error iniciando PayPal: Sin URL de redirección.");
        }
      }

      // CASO STRIPE
      if (metodoPago === "card") {
        if (!stripe || !elements) throw new Error("Stripe no inicializado.");
        
        const cardNumberElement = elements.getElement(CardNumberElement);
        if (!cardNumberElement) throw new Error("Error en formulario de tarjeta.");

        // 2️⃣ Confirmar con Stripe (Lado Cliente)
        const result = await stripe.confirmCardPayment(initData.clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: cardholderName,
              email: user?.email // Pre-llenar email si está logueado
            },
          },
        });

        if (result.error) {
          throw new Error(result.error.message || "Pago rechazado.");
        }

        if (result.paymentIntent?.status === "succeeded") {
          // 3️⃣ Confirmar en Backend
          await api.post('/donar/confirmar', {
            paymentId: result.paymentIntent.id,
            monto: finalAmount,
            metodoPago: "card",
            isAnonymous: isAnonymous,
          });

          navigate("/donacionExitosa"); // [MEJORA 3] Navegación SPA
        }
      }
    } catch (err: any) {
      console.error("Error donación:", err);
      // Si el error viene de nuestra API custom (con message), o es genérico
      const msg = err.message || "Error desconocido al procesar la donación.";
      displayError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="donation-page-wrapper">
      <div className="donation-card">
        {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}

        <div className="donation-header">
          <h2>Tu ayuda salva vidas 🐾</h2>
          <p>Cada euro se destina a alimentación, cuidados veterinarios y rescate.</p>
        </div>

        <form onSubmit={handleDonate}>
          {/* SECCIÓN: CANTIDAD */}
          <h3 className="form-section-title">¿Cuánto quieres aportar?</h3>
          <div className="amount-grid">
            {amounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAmountSelect(amount)}
                className={`amount-btn ${selectedAmount === amount ? "selected" : ""}`}
              >
                {amount}€
              </button>
            ))}
          </div>

          <div className="custom-amount-wrapper form-group" style={{ marginTop: "15px" }}>
            <label htmlFor="customAmount">O introduce otra cantidad (€)</label>
            <input
              id="customAmount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Ej: 35.00"
              value={customAmount}
              onChange={handleCustomAmountChange}
              className="custom-amount-input"
            />
          </div>

          {/* SECCIÓN: MÉTODO DE PAGO */}
          <h3 className="form-section-title" style={{ marginTop: "30px" }}>Método de Pago</h3>
          <div className="payment-methods-grid">
            <button
              type="button"
              onClick={() => setMetodoPago("card")}
              className={`payment-method-btn card ${metodoPago === "card" ? "active" : ""}`}
              disabled={isLoading}
            >
              💳 Tarjeta
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago("paypal")}
              className={`payment-method-btn paypal ${metodoPago === "paypal" ? "active" : ""}`}
              disabled={isLoading}
            >
              🅿️ PayPal
            </button>
          </div>

          {/* DATOS DE TARJETA */}
          {metodoPago === "card" && (
            <div className="card-details-container">
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="cardholderName">Titular de la tarjeta</label>
                <input
                  id="cardholderName"
                  type="text"
                  placeholder="Nombre completo"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="form-input-text"
                  required={metodoPago === "card"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label>Número de tarjeta</label>
                  <div className="stripe-element-container">
                    <CardNumberElement options={CARD_OPTIONS} />
                  </div>
                </div>
                <div>
                  <label>Expiración</label>
                  <div className="stripe-element-container">
                    <CardExpiryElement options={CARD_OPTIONS} />
                  </div>
                </div>
                <div>
                  <label>CVC</label>
                  <div className="stripe-element-container">
                    <CardCvcElement options={CARD_OPTIONS} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OPCIÓN ANONIMATO */}
          {isAuthenticated && (
            <div className="anonymous-checkbox-wrapper">
              <input
                id="isAnonymous"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <label htmlFor="isAnonymous">
                Donar de forma anónima (no se asociará a mi cuenta).
              </label>
            </div>
          )}

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            className={`donate-submit-btn ${metodoPago === "card" ? "card-mode" : "paypal-mode"}`}
            disabled={isLoading || (metodoPago === "card" && !stripe) || finalAmount <= 0}
          >
            {isLoading ? (
                <>
                    <Spinner /> Procesando...
                </>
            ) : (
                `Donar ${finalAmount.toFixed(2)}€ con ${metodoPago === "card" ? "Tarjeta" : "PayPal"}`
            )}
          </button>

          <p className="secure-badge">
            🔒 Pago 100% seguro. Los datos de tu tarjeta son gestionados directamente por Stripe.
          </p>
        </form>
      </div>
    </div>
  );
};

// Wrapper
export default function App() {
  return (
    <Elements stripe={stripePromise}>
      <DonationForm />
    </Elements>
  );
}