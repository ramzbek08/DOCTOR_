const API = "https://7534.sangilov.uz";

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

export const getAppointments = async (doctorId) => {
  try {
    console.log("🔄 Navbatlar yuklash:", doctorId);
    const res = await fetch(`${API}/doctor/get_appointments/${doctorId}`);
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