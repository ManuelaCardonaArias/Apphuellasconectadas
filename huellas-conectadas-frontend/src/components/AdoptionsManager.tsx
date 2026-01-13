import React, { useState, useEffect } from "react";
import "../styles/edit-profile-styles.css";

// =================================================================
// 1. CONFIGURACIÓN API
// =================================================================

const API_BASE_URL = "http://localhost:8000";

const getHeaders = (isMultipart: boolean = false): HeadersInit => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("jwt_token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const handleResponse = async (response: Response): Promise<any> => {
  if (response.status === 401) {
    console.warn("Sesión expirada o no autorizada");
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errorMessage =
      data.message || data.error || `Error ${response.status}`;
    throw new Error(errorMessage);
  }
  return data;
};

const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(response);
  },
};

// =================================================================
// 2. UTILIDAD PDF
// =================================================================
const loadJsPDF = async () => {
  if ((window as any).jspdf) return (window as any).jspdf;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve((window as any).jspdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- ENDPOINTS ---
const ADOPTIONS_USER_URL = "/api/adopciones/adoptante";
const ADOPTIONS_SHELTER_URL = "/api/adopciones/protectora";
const ADOPTIONS_BASE_URL = "/api/adopciones";
const LISTAS_MASCOTAS_URL = "/api/adopciones/listas/mascotas";
const LISTAS_ADOPTANTES_URL = "/api/adopciones/listas/adoptantes";
const SHELTER_PROFILE_URL = "/api/adopciones/perfil-contrato";

// --- INTERFACES ---
interface PetOption {
  id: number;
  nombre: string;
  especie: string;
  edad: string;
  raza: string;
}
interface AdopterOption {
  id: number;
  nombre: string;
  dni: string;
  telefono: string;
  direccion: string;
  email: string;
}
interface ShelterDetails {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
}

interface Adoption {
  id: number;
  adoptionDate: string;
  petName: string;
  petBreed: string;
  shelterName: string;
  adoptanteName: string;
  adoptanteId: number;
  mascotId: number;
  contrato?: string;
  adoptanteEmail?: string;
  adoptanteTelefono?: string;
}

export interface AdoptionsManagerProps {
  isProtectora: boolean;
  shelterName: string;
  userId: string;
  setMessage: (msg: { type: "success" | "error" | ""; text: string }) => void;
  PawIcon?: React.FC<{ className?: string }>;
  CalendarIcon?: React.FC;
  TrashIcon?: React.FC;
}

const DefaultIcon = () => <span>•</span>;

const AdoptionsManager: React.FC<AdoptionsManagerProps> = ({
  isProtectora,
  shelterName,
  userId,
  setMessage,
  PawIcon = DefaultIcon,
  CalendarIcon = DefaultIcon,
  TrashIcon = DefaultIcon,
}) => {
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [isAdoptionsLoading, setIsAdoptionsLoading] = useState(false);
  const [isAdoptionsCRUDLoading, setIsAdoptionsCRUDLoading] = useState(false);

  const [availablePets, setAvailablePets] = useState<PetOption[]>([]);
  const [userAdoptantes, setUserAdoptantes] = useState<AdopterOption[]>([]);
  const [shelterDetails, setShelterDetails] = useState<ShelterDetails | null>(
    null
  );

  const [adoptionForm, setAdoptionForm] = useState({
    adoptionDate: new Date().toISOString().split("T")[0],
    mascotId: "" as number | "",
    adoptanteId: "" as number | "",
  });

  const [isAdoptionFormOpen, setIsAdoptionFormOpen] = useState(false);
  const [adoptionToDelete, setAdoptionToDelete] = useState<number | null>(null);
  const [isDeleteAdoptionModalOpen, setIsDeleteAdoptionModalOpen] =
    useState(false);

  // Estado para el acordeón (Igual que en EditProfile)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    loadJsPDF().catch(console.error);
    fetchAdoptions();

    if (isProtectora) {
      fetchSelectLists();
      fetchShelterDetails();
    }
  }, [isProtectora]);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "Fecha desconocida";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const fetchAdoptions = async () => {
    setIsAdoptionsLoading(true);
    const url = isProtectora ? ADOPTIONS_SHELTER_URL : ADOPTIONS_USER_URL;

    try {
      const backendData = await api.get<any[]>(url);

      const mappedAdoptions: Adoption[] = backendData.map((item: any) => ({
        id: item.id,
        adoptionDate: item.fechaAdopcion || item.fechaSolicitud,
        petName:
          item.idMascota?.nombre || item.mascota?.nombre || "Mascota eliminada",
        petBreed: item.idMascota?.raza || item.mascota?.raza || "Desconocida",
        shelterName:
          item.idMascota?.idUsuario?.nombre ||
          item.mascota?.usuario?.nombre ||
          "Protectora",
        adoptanteName:
          item.idUsuario?.nombre || item.usuario?.nombre || "Usuario eliminado",
        adoptanteId: item.idUsuario?.id || item.usuario?.id || 0,
        mascotId: item.idMascota?.id || item.mascota?.id || 0,
        contrato: item.contrato,
        adoptanteEmail: item.idUsuario?.email || item.usuario?.email,
        adoptanteTelefono: item.idUsuario?.telefono || item.usuario?.telefono,
      }));

      setAdoptions(mappedAdoptions);
    } catch (error: any) {
      console.error("Error cargando adopciones:", error);
      if (isProtectora)
        setMessage({
          type: "error",
          text: "Error cargando lista de adopciones.",
        });
    } finally {
      setIsAdoptionsLoading(false);
    }
  };

  const fetchShelterDetails = async () => {
    try {
      const data = await api.get<ShelterDetails>(SHELTER_PROFILE_URL);
      setShelterDetails(data);
    } catch (e) {
      console.warn("Error cargando perfil protectora", e);
    }
  };

  const fetchSelectLists = async () => {
    try {
      const [pets, users] = await Promise.all([
        api.get<PetOption[]>(LISTAS_MASCOTAS_URL),
        api.get<AdopterOption[]>(LISTAS_ADOPTANTES_URL),
      ]);
      setAvailablePets(pets);
      setUserAdoptantes(users);
    } catch (e) {
      console.error("Error cargando listas", e);
    }
  };

  // --- LÓGICA DE ACORDEÓN ---
  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  // Agrupar adopciones por mascota para mantener consistencia con el diseño de Solicitudes
  const groupAdoptionsByPet = () => {
    return adoptions.reduce((groups, adoption) => {
      const key = `${adoption.petName}-${adoption.id}`; // Usamos ID también por si hay nombres duplicados, aunque idealmente se agrupa por mascota
      if (!groups[key]) groups[key] = [];
      groups[key].push(adoption);
      return groups;
    }, {} as Record<string, Adoption[]>);
  };

  // --- GENERACIÓN PDF ---
  const generateAdoptionContractBlob = async (
    pet: PetOption,
    adopter: AdopterOption,
    shelter: ShelterDetails,
    date: string
  ) => {
    try {
      const { jsPDF } = await loadJsPDF();
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CONTRATO DE ADOPCIÓN", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${date}`, 105, 28, { align: "center" });

      let yPos = 45;
      const leftMargin = 20;
      const lineHeight = 7;

      // 1. DATOS PROTECTORA
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(leftMargin - 2, yPos - 5, 175, 7, "F");
      doc.text("DATOS DE LA PROTECTORA (CEDENTE)", leftMargin, yPos);
      yPos += lineHeight + 3;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre: ${shelter.nombre}`, leftMargin, yPos);
      yPos += lineHeight;
      doc.text(
        `Dirección: ${shelter.direccion || "No especificada"}`,
        leftMargin,
        yPos
      );
      yPos += lineHeight;
      doc.text(
        `Teléfono: ${shelter.telefono || "No especificado"}`,
        leftMargin,
        yPos
      );
      yPos += lineHeight;
      doc.text(`Email: ${shelter.email}`, leftMargin, yPos);
      yPos += 12;

      // 2. DATOS ADOPTANTE
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(leftMargin - 2, yPos - 5, 175, 7, "F");
      doc.text("DATOS DEL ADOPTANTE", leftMargin, yPos);
      yPos += lineHeight + 3;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre Completo: ${adopter.nombre}`, leftMargin, yPos);
      yPos += lineHeight;
      doc.text(`DNI/NIE: ${adopter.dni || "No registrado"}`, leftMargin, yPos);
      yPos += lineHeight;
      doc.text(
        `Teléfono: ${adopter.telefono || "No registrado"}`,
        leftMargin,
        yPos
      );
      yPos += lineHeight;
      doc.text(
        `Dirección: ${adopter.direccion || "No registrada"}`,
        leftMargin,
        yPos
      );
      yPos += lineHeight;
      doc.text(`Email: ${adopter.email}`, leftMargin, yPos);
      yPos += 12;

      // 3. DATOS MASCOTA
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(leftMargin - 2, yPos - 5, 175, 7, "F");
      doc.text("DATOS DE LA MASCOTA", leftMargin, yPos);
      yPos += lineHeight + 3;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre: ${pet.nombre}`, leftMargin, yPos);
      yPos += lineHeight;
      doc.text(`Especie: ${pet.especie}`, leftMargin, yPos);
      yPos += lineHeight;
      doc.text(`Raza: ${pet.raza}`, leftMargin, yPos);
      yPos += lineHeight;

      // === INICIO CORRECCIÓN EDAD ===
      const edadNum = parseInt(pet.edad);
      const edadTexto = isNaN(edadNum) ? pet.edad : `${edadNum} años`;
      doc.text(`Edad: ${edadTexto}`, leftMargin, yPos);
      // === FIN CORRECCIÓN EDAD ===

      yPos += 20;

      // TEXTO LEGAL
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const legalText =
        "El adoptante declara reunir las condiciones necesarias para el cuidado de la mascota y se compromete a proporcionarle los cuidados veterinarios, alimentación y alojamiento adecuados, así como a no abandonarlo ni destinarlo a fines ilícitos. La protectora se reserva el derecho de seguimiento del animal para asegurar su bienestar.";
      const splitText = doc.splitTextToSize(legalText, 170);
      doc.text(splitText, leftMargin, yPos);

      // FIRMAS
      yPos = 250;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Fdo. La Protectora", 50, yPos, { align: "center" });
      doc.text("Fdo. El Adoptante", 160, yPos, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(25, yPos + 30, 75, yPos + 30);
      doc.line(135, yPos + 30, 185, yPos + 30);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("(Firma y Sello)", 50, yPos + 35, { align: "center" });
      doc.text("(Firma)", 160, yPos + 35, { align: "center" });

      return doc.output("blob");
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleAdoptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adoptionForm.mascotId || !adoptionForm.adoptanteId) return;

    setIsAdoptionsCRUDLoading(true);
    try {
      const pet = availablePets.find((p) => p.id === adoptionForm.mascotId);
      const user = userAdoptantes.find(
        (u) => u.id === adoptionForm.adoptanteId
      );
      const shelter = shelterDetails || {
        nombre: shelterName,
        direccion: "",
        telefono: "",
        email: "",
      };

      let pdfBlob = null;
      if (pet && user) {
        pdfBlob = await generateAdoptionContractBlob(
          pet,
          user,
          shelter,
          adoptionForm.adoptionDate
        );
      }

      const formData = new FormData();
      formData.append("idMascota", String(adoptionForm.mascotId));
      formData.append("idUsuario", String(adoptionForm.adoptanteId));
      formData.append("fechaAdopcion", adoptionForm.adoptionDate);

      if (pdfBlob && pet) {
        formData.append("contrato", pdfBlob, `Contrato_${pet.nombre}.pdf`);
      }

      await api.upload(ADOPTIONS_BASE_URL, formData);

      setMessage({ type: "success", text: "Adopción registrada con éxito." });
      setIsAdoptionFormOpen(false);
      setAdoptionForm({ ...adoptionForm, mascotId: "", adoptanteId: "" });

      await fetchAdoptions();
      fetchSelectLists();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al registrar",
      });
    } finally {
      setIsAdoptionsCRUDLoading(false);
    }
  };

  const confirmDeleteAdoption = async () => {
    if (!adoptionToDelete) return;
    setIsAdoptionsCRUDLoading(true);
    try {
      await api.delete(`${ADOPTIONS_BASE_URL}/${adoptionToDelete}`);
      setMessage({ type: "success", text: "Adopción eliminada." });
      await fetchAdoptions();
      fetchSelectLists();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsAdoptionsCRUDLoading(false);
      setIsDeleteAdoptionModalOpen(false);
    }
  };

  if (isAdoptionsLoading)
    return (
      <div className="appointments-loader">
        <div className="paw-prints-loader">
          {[...Array(3)].map((_, i) => (
            <PawIcon key={i} className="loading-paw" />
          ))}
        </div>
        <p className="loading-text-appointment">Cargando adopciones...</p>
      </div>
    );

  return (
    <div className="adoptions-list-container">
      {/* SECCIÓN PROTECTORA */}
      {isProtectora ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-200">
              Gestión de Adopciones{" "}
              <span className="text-gray-500 text-sm ml-2">
                ({adoptions.length} totales)
              </span>
            </h3>
            <button
              onClick={() => setIsAdoptionFormOpen(true)}
              className="btn-primary"
              style={{ width: "auto" }}
            >
              + Nueva Adopción
            </button>
          </div>

          {/* FORMULARIO DE NUEVA ADOPCIÓN */}
          {isAdoptionFormOpen && (
            <div className="bg-[#1e1e1e] p-6 rounded-lg mb-8 border border-gray-700 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h4 className="text-lg font-bold text-indigo-400 mb-4 uppercase tracking-wider">
                Registrar Nueva Adopción
              </h4>
              <form onSubmit={handleAdoptionSubmit} className="grid gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                      Mascota
                    </label>
                    <select
                      className="input-field w-full bg-[#2a2a2a] border-gray-600 text-white focus:border-indigo-500"
                      value={adoptionForm.mascotId}
                      onChange={(e) =>
                        setAdoptionForm({
                          ...adoptionForm,
                          mascotId: Number(e.target.value),
                        })
                      }
                      required
                    >
                      <option value="">Seleccionar Mascota...</option>
                      {availablePets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} - {p.raza}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                      Adoptante
                    </label>
                    <select
                      className="input-field w-full bg-[#2a2a2a] border-gray-600 text-white focus:border-indigo-500"
                      value={adoptionForm.adoptanteId}
                      onChange={(e) =>
                        setAdoptionForm({
                          ...adoptionForm,
                          adoptanteId: Number(e.target.value),
                        })
                      }
                      required
                    >
                      <option value="">Seleccionar Adoptante...</option>
                      {userAdoptantes.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.dni})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                    Fecha de Adopción
                  </label>
                  <input
                    type="date"
                    className="input-field w-full bg-[#2a2a2a] border-gray-600 text-white"
                    value={adoptionForm.adoptionDate}
                    onChange={(e) =>
                      setAdoptionForm({
                        ...adoptionForm,
                        adoptionDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="adoption-form-actions">
                  <button
                    type="button"
                    onClick={() => setIsAdoptionFormOpen(false)}
                    className="btn-cancel-custom"
                  >
                    Cancelar
                  </button>

                  <button
                    disabled={isAdoptionsCRUDLoading}
                    type="submit"
                    className="btn-confirm-custom"
                  >
                    {isAdoptionsCRUDLoading
                      ? "Guardando..."
                      : "Confirmar Adopción"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODAL DE ELIMINACIÓN */}
          {isDeleteAdoptionModalOpen && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h4 className="modal-title-danger flex items-center justify-center gap-2">
                  <TrashIcon /> Eliminar Registro
                </h4>
                <p className="danger-text">
                  ¿Estás seguro? Al eliminar este registro, la mascota volverá a
                  estar marcada como <strong>Disponible</strong>.
                </p>
                <div className="modal-actions">
                  <button
                    onClick={() => setIsDeleteAdoptionModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteAdoption}
                    className="btn-primary btn-danger"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE ADOPCIONES - ESTILO ACORDEÓN (SOLICITUDES) */}
          <div className="appointments-list-container">
            {adoptions.length === 0 && (
              <p className="no-active-requests">
                No hay historial de adopciones registrado.
              </p>
            )}

            {Object.values(groupAdoptionsByPet()).map((adoptionGroup) => {
              const item = adoptionGroup[0]; // Normalmente es 1 por mascota
              const uniqueKey = `${item.petName}-${item.id}`;
              const isOpen = openAccordion === uniqueKey;

              return (
                <div
                  key={uniqueKey}
                  className={`accordion-pet-group ${isOpen ? "is-open" : ""}`}
                >
                  {/* HEADER DEL ACORDEÓN */}
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(uniqueKey)}
                  >
                    <h4 className="accordion-title">
                      <PawIcon className="accordion-icon" />
                      {item.petName}
                      <span className="pet-status-badge status-confirmed">
                        ADOPTADO
                      </span>
                    </h4>
                    <span className="accordion-toggle-icon">
                      {isOpen ? "▼" : "►"}
                    </span>
                  </div>

                  {/* CONTENIDO DEL ACORDEÓN */}
                  <div className="accordion-content">
                    <div
                      className="reservation-section bg-reserved"
                      style={{
                        borderColor: "var(--color-primary)",
                        backgroundColor: "var(--color-background)",
                      }}
                    >
                      <h5>Detalles de Adopción</h5>
                      <div className="adopter-info-card">
                        <p className="adopter-name">
                          <strong>{item.adoptanteName}</strong>{" "}
                          <span style={{ fontSize: "0.8em", opacity: 0.7 }}>
                            (ID: {item.adoptanteId})
                          </span>
                        </p>
                        <p>
                          <strong>Fecha Adopción:</strong>{" "}
                          {formatDate(item.adoptionDate)}
                        </p>
                        <p>
                          <strong>Raza:</strong> {item.petBreed}
                        </p>

                        {(item.adoptanteEmail || item.adoptanteTelefono) && (
                          <p>
                            <strong>Contacto:</strong>{" "}
                            {item.adoptanteTelefono || "S/N"} |{" "}
                            {item.adoptanteEmail || "S/N"}
                          </p>
                        )}

                        {/* ACCIONES INTEGRADAS EN LA TARJETA */}
                        <div
                          className="adopter-actions mt-3 flex flex-row gap-2 items-center"
                          id="btn-adopcion"
                        >
                          {item.contrato ? (
                            <a
                              href={`${API_BASE_URL}/uploads/contratos/${item.contrato}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-confirm flex items-center justify-center gap-2 text-center flex-1"
                              style={{
                                backgroundColor: "var(--color-primary)",
                              }}
                            >
                              📄 Ver Contrato
                            </a>
                          ) : (
                            <button
                              disabled
                              className="btn-secondary opacity-50 cursor-not-allowed flex-1"
                            >
                              Sin contrato
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdoptionToDelete(item.id);
                              setIsDeleteAdoptionModalOpen(true);
                            }}
                            className="btn-reject flex-1"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* SECCIÓN USUARIO / ADOPTANTE (Mantiene diseño de tarjetas limpio) */
        <>
          <h3 className="text-2xl font-bold mb-6 text-indigo-400 border-b border-gray-700 pb-2">
            Mis Adopciones
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {adoptions.length === 0 && (
              <div className="col-span-2 text-center py-10 bg-[#1e1e1e] border border-gray-800 rounded-lg">
                <PawIcon className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-gray-400">
                  Aún no has realizado ninguna adopción.
                </p>
              </div>
            )}
            {adoptions.map((item) => (
              <div
                key={item.id}
                className="bg-[#1e1e1e] rounded-xl shadow-sm border border-gray-700 overflow-hidden hover:border-indigo-500/50 transition-colors"
              >
                <div className="bg-indigo-900/20 p-3 flex items-center gap-2 border-b border-indigo-900/30">
                  <PawIcon className="text-indigo-400 w-5 h-5" />
                  <span className="font-bold text-indigo-300">
                    ¡Adopción Completada!
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-xl font-bold text-white mb-2">
                    {item.petName}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>
                      <span className="font-semibold text-gray-500">Raza:</span>{" "}
                      {item.petBreed}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-500">
                        Protectora:
                      </span>{" "}
                      {item.shelterName}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-500">
                        Fecha:
                      </span>{" "}
                      {formatDate(item.adoptionDate)}
                    </p>
                  </div>
                  {item.contrato && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <a
                        href={`${API_BASE_URL}/uploads/contratos/${item.contrato}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        📄 Descargar Contrato de Adopción
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdoptionsManager;
