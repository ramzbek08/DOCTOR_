const API = "https://doctorsappointment-production-d0b9.up.railway.app";

export const getDoctors = async () => {
  try {
    console.log("🔄 Doctorlarni yuklash...");
    const res = await fetch(`${API}/doctor/get_doctors`);
    console.log("Response status:", res.status);
    if (!res.ok) throw new Error(`Xatolik: ${res.status} - ${res.statusText}`);
    const data = await res.json();
    console.log("✅ Doctorlar olingan:", data);
    const doctors = data.message || data;
    console.log("Array format:", doctors);
    console.log("Array mi?", Array.isArray(doctors));
    return doctors;
  } catch (err) {
    console.error("❌ Xatolik:", err);
    return [];
  }
};

export const getAppointments = async (doctorId, date) => {
  try {
    console.log("🔄 Navbatlar yuklash:", doctorId, date || "");
    const url = date
      ? `${API}/doctor/get_appointments/${doctorId}?appointment_date=${date}`
      : `${API}/doctor/get_appointments/${doctorId}`;
    const res = await fetch(url);
    console.log("Response status:", res.status);
    if (res.status === 404) {
      console.warn("Navbatlar topilmadi (404), bo'sh array qaytariladi");
      return [];
    }
    if (!res.ok) throw new Error(`Navbatlar olinmadi: ${res.status}`);
    const data = await res.json();
    console.log("✅ Navbatlar olingan:", data);
    const appointments = data.message || data.appointments || data;
    console.log("Navbatlar:", appointments);
    return appointments;
  } catch (err) {
    console.error("❌ Xatolik:", err);
    return [];
  }
};

// Doktor bemorga qayta ko'rik uchun tanlangan sanaga navbat yozadi
export const createRevisitAppointment = async (doctorId, name, phone, appointmentDate) => {
  try {
    console.log("🔄 Qayta navbat yaratilmoqda:", { doctorId, name, phone, appointmentDate });
    const res = await fetch(`${API}/doctor/create_appointment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        doctor_id: Number(doctorId),
        appointment_date: appointmentDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : "Xatolik");
    console.log("✅ Qayta navbat yaratildi:", data);
    return data;
  } catch (err) {
    console.error("❌ createRevisitAppointment xatolik:", err);
    throw err;
  }
};

export const closeAppointment = async (doctorId, appointmentId) => {
  try {
    console.log("🔄 Appointment yopilmoqda:", { doctorId, appointmentId });
    const res = await fetch(`${API}/doctor/close_appointment`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_id: appointmentId,
      }),
    });
    const data = await res.json();
    console.log("✅ Close response:", data);
    return data;
  } catch (err) {
    console.error("❌ closeAppointment xatolik:", err);
  }
};