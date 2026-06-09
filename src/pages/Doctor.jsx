import React, { useEffect, useState } from "react";
import "../styles/doctor.css";
import { getDoctors, getAppointments, closeAppointment } from "../api/api";

const Doctor = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(() => {
    return localStorage.getItem("selectedDoctor") || "";
  });
  const [appointments, setAppointments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDoctors = async () => {
    console.log("📋 loadDoctors boshlandi");
    const data = await getDoctors();
    console.log("Olingan data:", data);
    if (Array.isArray(data)) {
      setDoctors(data);
      if (data.length > 0) {
        const saved = localStorage.getItem("selectedDoctor");
        if (!saved) {
          setSelectedDoctor(data[0].id);
        } else {
          setSelectedDoctor(saved);
        }
      }
    } else {
      console.warn("❌ Data array emas!", data);
    }
  };

  const loadAppointments = async (doctorId) => {
    if (!doctorId) return;
    setLoading(true);
    const data = await getAppointments(doctorId);
    if (Array.isArray(data)) {
      setAppointments(data);
    } else {
      setAppointments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedDoctor) {
      localStorage.setItem("selectedDoctor", selectedDoctor);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      loadAppointments(selectedDoctor);
      setCurrentPatient(null);
    }
  }, [selectedDoctor]);

  const nextPatient = () => {
    if (appointments.length === 0) return;
    setCurrentPatient(appointments[0]);
  };

  const finishPatient = async () => {
    if (!currentPatient) {
      console.warn("⚠️ Hech qanday bemor qabul qilinmagan");
      return;
    }

    try {
      console.log("🔄 Bemor tugatish boshlandi:", currentPatient);

      // ✅ TUZATILDI: doctor_id va appointment_id ikkalasi ham yuborilmoqda
      const closeRes = await closeAppointment(
        Number(selectedDoctor),
        currentPatient.id
      );

      console.log("✅ Bemor yopildi, response:", closeRes);

      console.log("🔄 Navbatlar qayta yuklash:", selectedDoctor);
      const updatedAppointments = await getAppointments(selectedDoctor);
      console.log("📋 Qayta yuklangan navbatlar:", updatedAppointments);

      const normalized = Array.isArray(updatedAppointments)
        ? updatedAppointments
        : updatedAppointments.message || updatedAppointments.appointments || [];

      console.log("✅ Normalizatsiya qilindi:", normalized);
      setAppointments(normalized);

      if (normalized.length > 0) {
        console.log("➡️ Keyingi bemor tanlanildi:", normalized[0]);
        setCurrentPatient(normalized[0]);
      } else {
        console.log("✅ Barcha bemorlar tugallandi");
        setCurrentPatient(null);
      }
    } catch (err) {
      console.error("❌ Xatolik tugatish vaqtida:", err);
    }
  };

  return (
    <div className="doctorPage">

      {/* TOP */}
      <div className="topBar">
        <h1>🩺 Doctor Panel</h1>
        <div className="countBox">{appointments.length} ta navbat</div>
      </div>

      {/* SELECT */}
      <select
        className="doctorSelect"
        value={selectedDoctor}
        onChange={(e) => setSelectedDoctor(e.target.value)}
      >
        {doctors.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.name} - {doc.specialization}
          </option>
        ))}
      </select>

      {/* CURRENT */}
      <div className="currentCard">
        <h2>🏥 Hozir qabulda</h2>
        {currentPatient ? (
          <>
            <div className="bigNumber">
              #{appointments.findIndex((x) => x.id === currentPatient.id) + 1}
            </div>
            <h1>{currentPatient.patient_name}</h1>
            <p>📞 {currentPatient.phone}</p>
            <button className="finishBtn" onClick={finishPatient}>
              ✅ Tugatish
            </button>
          </>
        ) : (
          <div>
            <p className="empty">Hozir bemor yo'q</p>
            <button className="nextBtn" onClick={nextPatient}>
              ➡ Keyingisi
            </button>
          </div>
        )}
      </div>

      {/* QUEUE */}
      <div className="queueWrapper">
        <h2>📋 Navbatlar</h2>
        {loading ? (
          <p className="empty">Yuklanmoqda...</p>
        ) : appointments.length === 0 ? (
          <p className="empty">Navbat yo'q</p>
        ) : (
          appointments.map((item, index) => (
            <div key={item.id} className="queueCard">
              <div>
                <div className="number">#{index + 1}</div>
                <h3>{item.patient_name}</h3>
                <p>📞 {item.phone}</p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Doctor;