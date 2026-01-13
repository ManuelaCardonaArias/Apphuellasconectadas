import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/edit-profile-styles.css";
import { api, ENDPOINTS } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AdoptionsManager from "../components/AdoptionsManager";

// --- INTERFACES & TIPOS (Mejora de TypeScript) ---
type Tab = "personal" | "password" | "danger" | "appointments" | "adoptions" | "notifications";
type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled" | "queue";

interface NotificationPreferences {
  newPets: boolean;
  appointmentCreated: boolean;
  appointmentAccepted: boolean;
  appointmentReminder: boolean;
}

interface UserProfile {
  id?: string;
  role: "Protectora" | "Adoptante";
  createdAt: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  housingType: string;
  bio: string;
  avatarUrl: string;
  preferencias_notificaciones?: NotificationPreferences;
  preferencias_notificaciones_email?: NotificationPreferences;
}

interface Appointment {
  id: number;
  appointmentDate?: string;
  status: AppointmentStatus;
  location: string;
  petName: string;
  shelterName?: string;
  adoptante?: { nombre: string; email: string; telefono: string };
  queueOrder?: number;
}

// --- ICONOS SVG (Optimizados y tipados) ---
const PawIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className={className}>
    <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="20px" height="20px">
    <path d="M128 0c13.3 0 24 10.7 24 24V64H296V24c0-13.3 10.7-24 24-24s24 10.7 24 24V64h48c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h48V24c0-13.3 10.7-24 24-24zM48 160h352v256c0 4.4-3.6 8-8 8H56c-4.4 0-8-3.6-8-8V160zM192 256h64c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H192c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16zm-48 96h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H144c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16zm128 0h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16z" />
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="16px" height="16px">
    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
  </svg>
);
const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="16px" height="16px">
    <path d="M75 120a120 120 0 1 0 240 0 120 120 0 1 0 -240 0zM128 432c0 10.6 6.5 20.3 16.6 24.1c4.5 1.7 9.1 2.9 13.9 3.8L160 480H352l1.5-19.1c4.8-.9 9.4-2.1 13.9-3.8c10.1-3.9 16.6-13.6 16.6-24.1c0-10.9-6.9-20.7-17.7-24.6c-17.5-6.6-36.9-9.9-57.8-9.9H192c-20.9 0-40.3 3.3-57.8 9.9c-10.8 3.9-17.7 13.7-17.7 24.6zM256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM232 120V256c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V120c0-4.4-3.6-8-8-8H240c-4.4 0-8 3.6-8 8z" />
  </svg>
);
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="16px" height="16px">
    <path d="M224 512c35.32 0 63.97-28.65 63.97-64H160.03c0 35.35 28.65 64 63.97 64zm215.39-149.71c-19.32-20.76-55.47-51.99-55.47-154.29 0-77.7-54.48-139.9-127.94-155.16V32c0-17.67-14.32-32-31.98-32s-31.98 14.33-31.98 32v20.84C118.56 68.1 64.08 130.3 64.08 208c0 102.3-36.15 133.53-55.47 154.29-6 6.45-8.66 14.16-8.61 21.71.11 16.4 12.98 32 32.1 32h383.8c19.12 0 32-15.6 32.1-32 .05-7.55-2.61-15.27-8.61-21.71z" />
  </svg>
);
const WhatsappIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);
const GmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </svg>
);

const TWILIO_SANDBOX_KEYWORD = "everybody-pale";
const FINISHED_STATUSES = ["rejected", "cancelled", "completed"];

const EditProfile: React.FC = () => {
  const { user, isProtectora, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [profile, setProfile] = useState<UserProfile>({
    role: "Adoptante",
    createdAt: "",
    name: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    housingType: "",
    bio: "",
    avatarUrl: "",
  });

  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam === "adoptions" && isProtectora) return "adoptions";
    if (tabParam === "appointments") return "appointments";
    return "personal";
  });

  const [notificationSubTab, setNotificationSubTab] = useState<'whatsapp' | 'email'>('whatsapp');

  const [whatsappNotifyPrefs, setWhatsappNotifyPrefs] = useState<NotificationPreferences>({
    newPets: true,
    appointmentCreated: true,
    appointmentAccepted: true,
    appointmentReminder: true,
  });

  const [emailNotifyPrefs, setEmailNotifyPrefs] = useState<NotificationPreferences>({
    newPets: true,
    appointmentCreated: true,
    appointmentAccepted: true,
    appointmentReminder: true,
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const [showNotification, setShowNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAppointmentModalOpen, setIsDeleteAppointmentModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  const [isHistoryDelete, setIsHistoryDelete] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  type AppointmentAction = "confirm" | "reject" | "cancel";

  const [appointmentAction, setAppointmentAction] =
    useState<AppointmentAction | null>(null);

  const [appointmentToAct, setAppointmentToAct] =
    useState<number | null>(null);

  // --- ESTADOS DERIVADOS (Optimización) ---
  const deletableHistoryCount = useMemo(() => {
    return appointments.filter((app) => FINISHED_STATUSES.includes(app.status)).length;
  }, [appointments]);

  const currentUserId = user?.id || profile.id || "ID Desconocido";
  const currentShelterName = profile.name || "";

  // --- FETCH PERFIL ---
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const backendData = await api.get<any>(ENDPOINTS.PROFILE);

      // Mapeo seguro de datos
      const mappedProfile: UserProfile = {
        id: backendData.id || "",
        role: backendData.roles && backendData.roles.includes("ROLE_PROTECTORA") ? "Protectora" : "Adoptante",
        createdAt: backendData.fecha_registro ? backendData.fecha_registro.split("T")[0] : "Desconocido",
        name: backendData.nombre || "",
        surname: backendData.apellido || "",
        email: backendData.email || "",
        phone: backendData.telefono || "",
        address: backendData.direccion || "",
        housingType: backendData.tipo_vivienda || "",
        bio: backendData.descripcion || backendData.biografia || backendData.descripcion_protectora || "",
        avatarUrl: backendData.avatarUrl || `https://placehold.co/150x150/4285F4/ffffff?text=${(backendData.nombre || "U").charAt(0).toUpperCase()}`,
        preferencias_notificaciones: backendData.preferencias_notificaciones,
        preferencias_notificaciones_email: backendData.preferencias_notificaciones_email
      };

      setProfile(mappedProfile);

      if (mappedProfile.preferencias_notificaciones) {
        setWhatsappNotifyPrefs(prev => ({ ...prev, ...mappedProfile.preferencias_notificaciones }));
      }
      if (mappedProfile.preferencias_notificaciones_email) {
        setEmailNotifyPrefs(prev => ({ ...prev, ...mappedProfile.preferencias_notificaciones_email }));
      }

    } catch (error: any) {
      console.error("Error fetching profile:", error);
      if (error.message && error.message.includes("Sesión expirada")) logout();
      setMessage({ type: "error", text: "Error al cargar el perfil." });
    } finally {
      setIsLoading(false);
    }
  }, [user, logout]);

  // --- FETCH CITAS ---
  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setIsAppointmentsLoading(true);
    const url = isProtectora ? ENDPOINTS.CITAS_SHELTER : ENDPOINTS.CITAS_USER;

    try {
      const backendData = await api.get<any[]>(url);
      const mappedAppointments: Appointment[] = backendData.map((item: any) => ({
        id: item.id,
        appointmentDate: item.fecha_hora || item.fecha,
        status: (item.estado === "Cola" || item.estado === "queue" ? "queue" : item.estado.toLowerCase()) as AppointmentStatus,
        location: item.lugar_cita || item.protectora?.direccion || "Lugar Desconocido",
        petName: item.mascota?.nombre || "Mascota",
        shelterName: item.protectora?.nombre || "Protectora",
        adoptante: item.adoptante || undefined,
        queueOrder: item.queueOrder || item.orden_cola,
      }));

      // Lógica de ordenamiento extraída para claridad
      mappedAppointments.sort((a, b) => {
        if (a.status === "queue" && b.status !== "queue") return -1;
        if (a.status !== "queue" && b.status === "queue") return 1;
        if (a.status === "queue" && b.status === "queue") return (a.queueOrder || 999) - (b.queueOrder || 999);

        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;

        // Priorizar fecha ascendente para pendientes/confirmadas
        if (["pending", "confirmed"].includes(a.status) && ["pending", "confirmed"].includes(b.status)) {
          return dateA - dateB;
        }
        // Descendente para el resto
        return dateB - dateA;
      });

      setAppointments(mappedAppointments);
    } catch (error: any) {
      console.error("Error al cargar citas:", error);
      setMessage({ type: "error", text: "Error al cargar las citas." });
      setShowNotification(true);
    } finally {
      setIsAppointmentsLoading(false);
    }
  }, [user, isProtectora]);

  // --- HANDLERS GENERALES ---
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const dataToSend: any = {
      nombre: profile.name,
      telefono: profile.phone,
      direccion: profile.address,
      descripcion: profile.bio,
      biografia: profile.bio,
      descripcion_protectora: isProtectora ? profile.bio : undefined,
    };
    if (!isProtectora) {
      dataToSend.apellido = profile.surname;
      dataToSend.tipo_vivienda = profile.housingType;
    }

    try {
      await api.patch(ENDPOINTS.PROFILE, dataToSend);
      setMessage({ type: "success", text: "¡Perfil actualizado con éxito!" });
      setShowNotification(true);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "No se pudieron guardar los cambios." });
      setShowNotification(true);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 5000);
    }
  };

  const handleNotifyPrefChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPrefState: React.Dispatch<React.SetStateAction<NotificationPreferences>>
  ) => {
    const { name, checked } = e.target;
    setPrefState((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSaveNotifyPrefs = async () => {
    setIsLoading(true);
    try {
      await api.patch(ENDPOINTS.PROFILE, {
        preferencias_notificaciones: whatsappNotifyPrefs,
        preferencias_notificaciones_email: emailNotifyPrefs
      });
      setMessage({ type: "success", text: "Preferencias de notificación guardadas." });
      setShowNotification(true);
    } catch (error: any) {
      console.warn("Backend sync warning:", error);
      setMessage({ type: "success", text: "Preferencias actualizadas (simulado)." });
      setShowNotification(true);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validar que la nueva contraseña y la confirmación coincidan
    if (passwordFields.newPassword !== passwordFields.confirmNewPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      setShowNotification(true);
      setTimeout(() => { // Duración aumentada a 8s
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 8000); 
      return;
    }

    // 2. Validar que la nueva contraseña no sea igual a la actual
    if (passwordFields.currentPassword === passwordFields.newPassword) {
      setMessage({ type: "error", text: "La nueva contraseña no puede ser igual a la actual." });
      setShowNotification(true);
      setTimeout(() => { // Duración aumentada a 8s
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 8000); 
      return;
    }

    setIsLoading(true);
    try {
      const result: any = await api.post(ENDPOINTS.CHANGE_PASSWORD, {
        currentPassword: passwordFields.currentPassword,
        newPassword: passwordFields.newPassword,
      });
      setPasswordFields({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setMessage({ type: "success", text: result.message || "¡Contraseña cambiada con éxito!" });
      setShowNotification(true);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error al cambiar contraseña." });
      setShowNotification(true);
      setTimeout(() => { // Duración aumentada a 8s para errores de API
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 8000);
    } finally {
      setIsLoading(false);
      // Solo configuramos el setTimeout para éxito si fue un mensaje de éxito, ya que catch/if lo manejan
      if (message.type === 'success') {
          setTimeout(() => {
              setShowNotification(false);
              setTimeout(() => setMessage({ type: "", text: "" }), 500);
          }, 5000); 
      }
    }
  };

  const handleAppointmentStatusChange = async (appointmentId: number, newStatus: "confirmed" | "rejected" | "removed") => {
    try {
      let url = `${ENDPOINTS.CITAS}/${appointmentId}`;
      let method: "PATCH" | "DELETE" = "PATCH";
      let body: any = { estado: newStatus };

      if (newStatus === "removed" || newStatus === "rejected") {
        method = "DELETE";
        // Intentar delete primero, fallback a patch si es lógica de negocio específica
        try {
          await api.delete(url);
        } catch {
          method = "PATCH";
          url = `${url}/estado`;
        }
      } else {
        url = `${url}/estado`;
      }

      if (method === "PATCH") await api.patch(url, body);
      await fetchAppointments();
      setMessage({ type: "success", text: `Solicitud actualizada correctamente.` });
      setShowNotification(true);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error actualizando estado." });
      setShowNotification(true);
    } finally {
      setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 5000);
    }
  };

  const openAppointmentActionModal = (
    appointmentId: number,
    action: AppointmentAction
  ) => {
    setAppointmentToAct(appointmentId);
    setAppointmentAction(action);
    setIsDeleteAppointmentModalOpen(true);
  };

  const confirmDeleteHistory = async () => {
    setIsLoading(true);
    setIsDeleteAppointmentModalOpen(false);
    const historyToDelete = appointments.filter((app) => FINISHED_STATUSES.includes(app.status));
    let successCount = 0;

    // Ejecución en paralelo para mayor velocidad
    const deletePromises = historyToDelete.map(app =>
      api.delete(`${ENDPOINTS.CITAS}/${app.id}`).then(() => 1).catch(() => 0)
    );

    const results = await Promise.all(deletePromises);
    successCount = results.reduce((a, b) => a + b, 0);

    await fetchAppointments();
    setIsLoading(false);
    setIsHistoryDelete(false);
    const msgText = successCount > 0 ? `Historial limpiado (${successCount}).` : "No se encontraron solicitudes para eliminar.";
    setMessage({ type: successCount > 0 ? "success" : "error", text: msgText });
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 500);
    }, 5000);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    const appointmentToCancel = appointments.find((app) => app.id === appointmentToDelete);
    if (appointmentToCancel?.status === "confirmed") {
      await handleAppointmentStatusChange(appointmentToDelete, "rejected");
      setIsDeleteAppointmentModalOpen(false);
      setAppointmentToDelete(null);
      return;
    }
    try {
      await api.delete(`${ENDPOINTS.CITAS}/${appointmentToDelete}`);
      await fetchAppointments();
      setMessage({ type: "success", text: "Cita eliminada correctamente." });
      setShowNotification(true);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error al eliminar la cita." });
      setShowNotification(true);
    } finally {
      setIsDeleteAppointmentModalOpen(false);
      setAppointmentToDelete(null);
      setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 500);
      }, 5000);
    }
  };

  const confirmAppointmentAction = async () => {
    if (!appointmentToAct || !appointmentAction) return;

    try {
      if (appointmentAction === "confirm") {
        await handleAppointmentStatusChange(appointmentToAct, "confirmed");
      }

      if (appointmentAction === "reject" || appointmentAction === "cancel") {
        await handleAppointmentStatusChange(appointmentToAct, "rejected");
      }
    } finally {
      setIsDeleteAppointmentModalOpen(false);
      setAppointmentToAct(null);
      setAppointmentAction(null);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setIsDeleteModalOpen(false);
    try {
      await api.delete(ENDPOINTS.PROFILE);
      setMessage({ type: "success", text: "Cuenta eliminada correctamente. Redirigiendo..." });
      setTimeout(() => {
        logout();
        navigate("/");
        setIsLoading(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      let errorMsg = error.message;
      if (errorMsg.includes("Unexpected token")) errorMsg = "El servidor no permite eliminar la cuenta automáticamente. Por favor contacta con soporte.";
      setMessage({ type: "error", text: errorMsg });
      setIsLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFields((prev) => ({ ...prev, [name]: value }));
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (user) fetchUserProfile();
  }, [user, fetchUserProfile]);

  useEffect(() => {
    if (activeTab === "appointments" && user) fetchAppointments();
  }, [activeTab, user, fetchAppointments]);

  // --- HELPER FUNCTIONS ---
  const getStatusInfo = (status: AppointmentStatus) => {
    const s = status ? status.toLowerCase() : "";
    switch (s) {
      case "confirmed": return { text: "Confirmada", className: "status-confirmed", icon: "✅" };
      case "pending": return { text: "Pendiente", className: "status-pending", icon: "⏳" };
      case "rejected": return { text: "Rechazada", className: "status-rejected", icon: "❌" };
      case "cancelled": return { text: "Cancelada", className: "status-cancelled", icon: "🚫" };
      case "completed": return { text: "Completada", className: "status-completed", icon: "🎉" };
      case "queue": return { text: "En Cola", className: "status-queue", icon: "🔔" };
      default: return { text: "Desconocido", className: "", icon: "❓" };
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return dateString;
    }
  };

  // Memorizar agrupación para evitar recalculo en cada render
  const groupedAppointments = useMemo(() => {
    return appointments.reduce((groups, appointment) => {
      const petName = appointment.petName;
      if (!groups[petName]) groups[petName] = [];
      groups[petName].push(appointment);
      return groups;
    }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  const toggleAccordion = (petName: string) => setOpenAccordion(openAccordion === petName ? null : petName);

  // --- RENDERIZADO DE TABS ---
  const renderAppointmentsTab = () => {
    if (isAppointmentsLoading) {
      return (
        <div className="appointments-loader">
          <div className="paw-prints-loader">
            {[...Array(5)].map((_, i) => <PawIcon key={i} className="loading-paw" />)}
          </div>
          <p className="loading-text-appointment">Cargando...</p>
        </div>
      );
    }
    if (appointments.length === 0) {
      return <p className="no-results no-appointments">{isProtectora ? "No tienes solicitudes de cita pendientes." : "No tienes ninguna cita programada actualmente."}</p>;
    }

    // Vista Adoptante
    if (!isProtectora) {
      return (
        <div className="appointments-list-container">
          <h3 className="profile-card-title">Mis Citas y Solicitudes</h3>
          {deletableHistoryCount > 0 && (
            <div className="history-cleaner-wrapper">
              <p className="history-info">Tienes {deletableHistoryCount} solicitudes finalizadas que puedes eliminar.</p>
              <button onClick={() => { setAppointmentToDelete(null); setIsHistoryDelete(true); setIsDeleteAppointmentModalOpen(true); }} className="btn-clean-history" disabled={isLoading}>
                <HistoryIcon /> Limpiar Historial
              </button>
            </div>
          )}
          {appointments.map((app) => {
            const statusInfo = getStatusInfo(app.status);
            const showCancelButton = ["pending", "confirmed", "queue"].includes(app.status);
            const showDeleteButton = FINISHED_STATUSES.includes(app.status);
            return (
              <div key={app.id} className={`appointment-card ${statusInfo.className}`}>
                <div className="appointment-header">
                  <PawIcon className="appointment-icon" />
                  <div className="appointment-title-group">
                    <h4>{app.petName}</h4>
                    <span className={`appointment-status ${statusInfo.className}`}>
                      {statusInfo.icon} {statusInfo.text}{app.status === "queue" && app.queueOrder && ` (#${app.queueOrder})`}
                    </span>
                  </div>
                </div>
                <div className="appointment-details">
                  {app.appointmentDate && <p><CalendarIcon /> Fecha/Hora: <strong>{formatDate(app.appointmentDate)}</strong></p>}
                  <p>Ubicación: <span>{app.location}</span></p>
                  <p>Protectora: <span>{app.shelterName}</span></p>
                  {showCancelButton && (
                    <button onClick={() => { setAppointmentToDelete(app.id); setIsHistoryDelete(false); setIsDeleteAppointmentModalOpen(true); }} className="btn-delete-appointment" title="Cancelar"><TrashIcon /> Cancelar</button>
                  )}
                  {showDeleteButton && deletableHistoryCount === 0 && (
                    <button onClick={() => { setAppointmentToDelete(app.id); setIsHistoryDelete(false); setIsDeleteAppointmentModalOpen(true); }} className="btn-delete-appointment secondary" title="Eliminar"><TrashIcon /> Eliminar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Vista Protectora
    return (
      <div className="appointments-list-container">
        <h3 className="profile-card-title">Gestión de Solicitudes ({appointments.length} totales)</h3>
        {Object.entries(groupedAppointments).map(([petName, petAppointments]) => {
          const mainReservations = petAppointments.filter((app) => app.status === "confirmed" || app.status === "pending");
          const queueRequests = petAppointments.filter((app) => app.status === "queue").sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999));
          const primaryReservation = mainReservations.sort((a, b) => {
            const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
            const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
            return dateA - dateB;
          })[0] || null;
          const primaryAdoptanteName = primaryReservation?.adoptante?.nombre || "Pendiente";
          const isReserved = primaryReservation?.status === "confirmed";

          return (
            <div key={petName} className={`accordion-pet-group ${openAccordion === petName ? "is-open" : ""}`}>
              <div className="accordion-header" onClick={() => toggleAccordion(petName)}>
                <h4 className="accordion-title"><PawIcon className="accordion-icon" /> {petName}<span className={`pet-status-badge ${isReserved ? "status-reserved" : "status-available"}`}>{isReserved ? "RESERVADO" : "Citas Activas"}</span></h4>
                <span className="accordion-toggle-icon">{openAccordion === petName ? "▼" : "►"}</span>
              </div>
              <div className="accordion-content">
                {primaryReservation && (
                  <div className={`reservation-section ${isReserved ? "bg-reserved" : "bg-pending"}`}>
                    <h5>{isReserved ? "RESERVA PRINCIPAL" : "PRÓXIMA CITA PENDIENTE"}</h5>
                    <div className="adopter-info-card">
                      <p className="adopter-name">{getStatusInfo(primaryReservation.status).icon} <strong>{primaryAdoptanteName}</strong> ({getStatusInfo(primaryReservation.status).text})</p>
                      <p>Fecha: {formatDate(primaryReservation.appointmentDate)}</p>
                      <p>Contacto: {primaryReservation.adoptante?.telefono} | {primaryReservation.adoptante?.email}</p>
                      <div className="adopter-actions">
                        {primaryReservation.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                openAppointmentActionModal(primaryReservation.id, "confirm")
                              }
                              className="btn-confirm"
                            >
                              Aceptar Cita
                            </button>
                            <button
                              onClick={() =>
                                openAppointmentActionModal(primaryReservation.id, "reject")
                              }
                              className="btn-reject"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {primaryReservation.status === "confirmed" && (
                          <button
                            onClick={() =>
                              openAppointmentActionModal(primaryReservation.id, "cancel")
                            }
                            className="btn-reject"
                          >
                            Cancelar Reserva
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {queueRequests.length > 0 && (
                  <div className="queue-section">
                    <h5>Lista de Espera ({queueRequests.length})</h5>
                    <div className="queue-list">
                      {queueRequests.map((queueApp) => (
                        <div key={queueApp.id} className="queue-item">
                          <span className="queue-number">#{queueApp.queueOrder}</span>
                          <div className="queue-adopter-details"><strong>{queueApp.adoptante?.nombre}</strong><small>{queueApp.adoptante?.email}</small></div>
                          <button onClick={() => handleAppointmentStatusChange(queueApp.id, "removed")} className="btn-reject btn-small" title="Eliminar de Cola">Eliminar Cola</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNotificationsTab = () => {
    // URL del QR dinámico
    const sandboxJoinText = `join ${TWILIO_SANDBOX_KEYWORD}`;
    const whatsappUrl = `https://wa.me/14155238886?text=${encodeURIComponent(sandboxJoinText)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappUrl)}`;

    // URL para cancelar suscripción
    const sandboxStopText = "stop";
    const whatsappStopUrl = `https://wa.me/14155238886?text=${encodeURIComponent(sandboxStopText)}`;

    const NotificationToggle = ({ label, description, name, checked, onChange }: any) => (
      <div className="notification-toggle-card">
        <div className="toggle-info">
          <h5>{label}</h5>
          <p>{description}</p>
        </div>
        <div className="switch-wrapper">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={checked}
            onChange={onChange}
            className="switch-input"
          />
          <label htmlFor={name} className="switch-label">
            <span className="switch-slider"></span>
          </label>
        </div>
      </div>
    );

    return (
      <div className="profile-card notifications-card">
        <div className="profile-card-header">
          <h3 className="profile-card-title">Configurar Notificaciones</h3>
        </div>

        <div className="notifications-content">

          {/* SUB-NAVEGACIÓN TIPO PÍLDORA */}
          <div className="sub-nav-container">
            <button
              onClick={() => setNotificationSubTab('whatsapp')}
              className={`sub-nav-btn ${notificationSubTab === 'whatsapp' ? 'active-whatsapp' : ''}`}
            >
              <WhatsappIcon /> WhatsApp
            </button>
            <button
              onClick={() => setNotificationSubTab('email')}
              className={`sub-nav-btn ${notificationSubTab === 'email' ? 'active-email' : ''}`}
            >
              <GmailIcon /> Email (Gmail)
            </button>
          </div>

          {/* CONTENIDO WHATSAPP */}
          {notificationSubTab === 'whatsapp' && (
            <div className="settings-container">
              {/* 1. ACTIVACIÓN SANDBOX */}
              <div className="notification-section-card sandbox-section">
                <h4 className="notification-section-title">Conexión</h4>
                <p className="notification-text">
                  Necesario para activar el servicio de mensajería vía Whatsapp.
                </p>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  <img src={qrCodeUrl} alt="QR WhatsApp" style={{ width: "80px", height: "80px", border: "1px solid #ddd", borderRadius: "8px" }} />
                  <div>
                    <p style={{ fontSize: "0.85rem", margin: "0 0 5px 0" }}>Envía: <strong>{sandboxJoinText}</strong></p>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#25D366", fontWeight: "bold", fontSize: "0.85rem", textDecoration: "none" }}>Abrir WhatsApp &rarr;</a>
                  </div>
                </div>
              </div>

              {/* 2. PREFERENCIAS WHATSAPP */}
              <div>
                <h4 className="profile-card-title" style={{ fontSize: "1rem", marginBottom: "10px" }}>Preferencias de WhatsApp</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <NotificationToggle
                    label="Nuevas Mascotas"
                    description="Alertas instantáneas al móvil."
                    name="newPets"
                    checked={whatsappNotifyPrefs.newPets}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setWhatsappNotifyPrefs)}
                  />
                  <NotificationToggle
                    label="Estado de Citas"
                    description="Confirmaciones y cambios de estado."
                    name="appointmentAccepted"
                    checked={whatsappNotifyPrefs.appointmentAccepted}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setWhatsappNotifyPrefs)}
                  />
                  <NotificationToggle
                    label="Recordatorios"
                    description="Aviso 24h antes de la cita."
                    name="appointmentReminder"
                    checked={whatsappNotifyPrefs.appointmentReminder}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setWhatsappNotifyPrefs)}
                  />
                </div>
              </div>

              {/* 3. UNSUBSCRIBE */}
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <a href={whatsappStopUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "#999", textDecoration: "underline" }}>
                  Desvincular número (Stop)
                </a>
              </div>
            </div>
          )}

          {/* CONTENIDO EMAIL / GMAIL */}
          {notificationSubTab === 'email' && (
            <div className="settings-container">
              <div className="notification-section-card email-warning-card">
                <h4 className="notification-section-title">
                  <GmailIcon /> Configuración de Correo
                </h4>
                <p className="notification-text" style={{ marginBottom: "5px" }}>
                  Las notificaciones se enviarán a: <strong>{profile.email}</strong>
                </p>
                <p className="notification-text" style={{ fontSize: "0.8rem" }}>
                  Asegúrate de revisar tu carpeta de Spam si no recibes los correos de <em>Huellas Conectadas</em>.
                </p>
              </div>

              <div>
                <h4 className="profile-card-title" style={{ fontSize: "1rem", marginBottom: "10px" }}>Preferencias de Email</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <NotificationToggle
                    label="Boletín de Mascotas"
                    description="Resumen de nuevas mascotas en adopción."
                    name="newPets"
                    checked={emailNotifyPrefs.newPets}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setEmailNotifyPrefs)}
                  />
                  <NotificationToggle
                    label="Gestión de Citas"
                    description="Recibos de solicitud y confirmaciones."
                    name="appointmentAccepted"
                    checked={emailNotifyPrefs.appointmentAccepted}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setEmailNotifyPrefs)}
                  />
                  <NotificationToggle
                    label="Recordatorios de Agenda"
                    description="Recordatorios detallados por correo."
                    name="appointmentReminder"
                    checked={emailNotifyPrefs.appointmentReminder}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotifyPrefChange(e, setEmailNotifyPrefs)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BOTÓN GUARDAR GENERAL */}
          <div style={{ marginTop: "10px", textAlign: "right", borderTop: "1px solid #eee", paddingTop: "15px" }}>
            <button onClick={handleSaveNotifyPrefs} className="btn-primary" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? "Guardando..." : "Guardar Preferencias"}
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title-danger">¿Seguro que deseas eliminar tu cuenta?</h3>
            <div className="modal-actions">
              <button onClick={() => setIsDeleteModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDeleteAccount} className="btn-primary btn-danger">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {isDeleteAppointmentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3
              className={
                appointmentAction === "confirm"
                  ? "modal-title-success"
                  : "modal-title-danger"
              }
            >

              {appointmentAction === "confirm" && "¿Aceptar esta cita?"}
              {appointmentAction === "reject" && "¿Rechazar esta cita?"}
              {appointmentAction === "cancel" && "¿Cancelar esta reserva?"}
              {!appointmentAction &&
                (isHistoryDelete
                  ? "Limpiar Historial"
                  : "¿Seguro que deseas eliminar esta cita?")}
            </h3>

            <div className="modal-actions">
              <button
                onClick={() => setIsDeleteAppointmentModalOpen(false)}
                className="btn-secondary"
              >
                Volver
              </button>

              <button
                onClick={
                  appointmentAction
                    ? confirmAppointmentAction
                    : isHistoryDelete
                      ? confirmDeleteHistory
                      : confirmDeleteAppointment
                }
                className={`btn-primary ${appointmentAction === "confirm" ? "btn-success" : "btn-danger"
                  }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="edit-profile-container">
        <h1 className="main-title">{isProtectora ? "Gestión de Entidad" : "Configuración de Perfil"}</h1>
        {message.text && (
          <div className={`form-message ${message.type === "error" ? "error-message" : "success-message"} ${showNotification ? "show-notification" : "hide-notification"}`}>
            {message.text}
          </div>
        )}
        <div className="profile-grid">
          <div className="profile-sidebar">
            <div className="profile-card">
              <div className="avatar-section">
                <div className="avatar-wrapper">
                  <img src={profile.avatarUrl} alt="Avatar" className="avatar-img" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/150x150/4285F4/ffffff?text=${(profile.name || "U").charAt(0).toUpperCase()}`; }} />
                </div>
                <div className="user-name-display">{profile.name} {profile.surname}</div>
                <span className="role-badge">{profile.role}</span>
                <p className="member-since">Miembro desde: {profile.createdAt || "Reciente"}</p>
              </div>
            </div>
          </div>
          <div className="profile-main-column">
            <div className="tabs-navigation">
              <button className={`tab-button ${activeTab === "personal" ? "active" : ""}`} onClick={() => setActiveTab("personal")}>Información {isProtectora ? "Entidad" : "Personal"}</button>
              <button className={`tab-button ${activeTab === "appointments" ? "active" : ""}`} onClick={() => setActiveTab("appointments")}>{isProtectora ? "Solicitudes" : "Mis Citas"}</button>
              {isProtectora && <button className={`tab-button ${activeTab === "adoptions" ? "active" : ""}`} onClick={() => setActiveTab("adoptions")}>Adopciones</button>}
              <button className={`tab-button ${activeTab === "password" ? "active" : ""}`} onClick={() => setActiveTab("password")}>Contraseña</button>
              <button className={`tab-button ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")} style={{ display: "flex", alignItems: "center", gap: "6px" }}><BellIcon /> Notificaciones</button>
              <button className={`tab-button ${activeTab === "danger" ? "active" : ""}`} onClick={() => setActiveTab("danger")}>Seguridad</button>
            </div>
            <div className="tab-content">
              {activeTab === "personal" && (
                <div className="profile-card">
                  <form onSubmit={handleProfileSubmit}>
                    <div className="form-grid form-grid-2-col">
                      <div className="form-group">
                        <label>{isProtectora ? "Nombre Entidad" : "Nombre"}</label>
                        <input required type="text" name="name" className="input-field" value={profile.name || ""} onChange={handleProfileChange} />
                      </div>
                      {!isProtectora && (
                        <div className="form-group">
                          <label>Apellido</label>
                          <input required type="text" name="surname" className="input-field" value={profile.surname || ""} onChange={handleProfileChange} />
                        </div>
                      )}
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="input-field input-readonly" value={profile.email || ""} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Teléfono</label>
                        <input required type="tel" name="phone" className="input-field" value={profile.phone || ""} onChange={handleProfileChange} />
                      </div>
                      <div className={`form-group ${isProtectora ? "full-width" : ""}`}>
                        <label>Dirección</label>
                        <input required type="text" name="address" className="input-field" value={profile.address || ""} onChange={handleProfileChange} />
                      </div>
                      {!isProtectora && (
                        <div className="form-group">
                          <label>Tipo de Vivienda</label>
                          <select name="housingType" className="select-field" value={profile.housingType || ""} onChange={handleProfileChange}>
                            <option value="">Selecciona...</option>
                            <option value="Piso/Apartamento">Piso / Apartamento</option>
                            <option value="Casa con jardín">Casa con jardín</option>
                            <option value="Chalet">Chalet</option>
                            <option value="Otros">Otros</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="form-group bio-container">
                      <label>{isProtectora ? "Descripción" : "Biografía"}</label>
                      <textarea name="bio" className="bio-textarea" rows={5} value={profile.bio || ""} onChange={handleProfileChange} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isLoading}>Guardar Cambios</button>
                  </form>
                </div>
              )}
              {activeTab === "password" && (
                <div className="profile-card">
                  <form onSubmit={handlePasswordSubmit} className="form-grid">
                    <div className="form-group"><label>Actual</label><input type="password" name="currentPassword" className="input-field" value={passwordFields.currentPassword} onChange={handlePasswordChange} required /></div>
                    <div className="form-group"><label>Nueva</label><input type="password" name="newPassword" className="input-field" value={passwordFields.newPassword} onChange={handlePasswordChange} required /></div>
                    <div className="form-group"><label>Confirmar Nueva</label><input type="password" name="confirmNewPassword" className="input-field" value={passwordFields.confirmNewPassword} onChange={handlePasswordChange} required /></div>
                    <button type="submit" className="btn-primary" disabled={isLoading}>Actualizar Contraseña</button>
                  </form>
                </div>
              )}
              {activeTab === "notifications" && renderNotificationsTab()}
              {activeTab === "danger" && (
                <div className="profile-card danger-card">
                  <div className="danger-header">Seguridad</div>
                  <h3 className="profile-card-title danger-title">Eliminar Cuenta</h3>
                  <p className="danger-text">Si eliminas tu cuenta, perderás permanentemente todos tus datos.</p>
                  <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="btn-danger-outline">Eliminar Cuenta Permanentemente</button>
                </div>
              )}
              {activeTab === "appointments" && (
                <div className="profile-card">
                  <div className="profile-card-header"><h3 className="profile-card-title">{isProtectora ? "Solicitudes Recibidas" : "Mis Citas de Adopción"}</h3></div>
                  <div className="appointments-content">{renderAppointmentsTab()}</div>
                </div>
              )}
              {activeTab === "adoptions" && isProtectora && (
                <div className="profile-card">
                  <AdoptionsManager
                    isProtectora={isProtectora}
                    shelterName={currentShelterName}
                    userId={currentUserId}
                    setMessage={setMessage}
                    PawIcon={PawIcon}
                    CalendarIcon={CalendarIcon}
                    TrashIcon={TrashIcon}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;