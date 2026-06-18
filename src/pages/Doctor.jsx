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
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const loadDoctors = async () => {
    console.log("📋 loadDoctors boshlandi");
    setDoctorsLoading(true);
    try {
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
    } catch (err) {
      console.error("❌ loadDoctors xatolik:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadAppointments = async (doctorId) => {
    if (!doctorId) return;
    setLoading(true);
    const data = await getAppointments(doctorId);
    const arr = Array.isArray(data) ? data : [];
    setAppointments(arr);
    setLoading(false);
    return arr;
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
      loadAppointments(selectedDoctor).then((arr) => {
        const savedId = localStorage.getItem("currentPatientId");
        if (savedId) {
          const patient = arr.find((a) => String(a.id) === String(savedId));
          if (patient) {
            setCurrentPatient(patient);
          } else {
            localStorage.removeItem("currentPatientId");
            setCurrentPatient(null);
          }
        } else {
          setCurrentPatient(null);
        }
      });
    }
  }, [selectedDoctor]);

  const nextPatient = () => {
    if (appointments.length === 0) return;
    const p = appointments[0];
    setCurrentPatient(p);
    try {
      localStorage.setItem("currentPatientId", String(p.id));
    } catch (err) {
      console.warn("localStorage set error for currentPatientId", err);
    }
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
        try {
          localStorage.setItem("currentPatientId", String(normalized[0].id));
        } catch (err) {
          console.warn("localStorage set error for currentPatientId", err);
        }
      } else {
        console.log("✅ Barcha bemorlar tugallandi");
        setCurrentPatient(null);
        localStorage.removeItem("currentPatientId");
      }
    } catch (err) {
      console.error("❌ Xatolik tugatish vaqtida:", err);
    }
  };

  // If either doctors or appointments are loading, show a full-page loader
  if (doctorsLoading || loading) {
    return (
      <div className="fullLoader">
        <div className="spinner" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

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
        disabled={doctorsLoading}
      >
        {doctorsLoading ? (
          <option value="">Yuklanmoqda...</option>
        ) : doctors.length === 0 ? (
          <option value="">Shifokor topilmadi</option>
        ) : (
          doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name} - {doc.specialization}
            </option>
          ))
        )}
      </select>

      {/* CURRENT */}
      <div className="currentCard">
        <h2>🏥 Hozir qabulda</h2>
        {currentPatient ? (
          <>
            <div className="bigNumber">
              #{appointments.findIndex((x) => x.id === currentPatient.id) + 1}
            </div>
            <h1>{currentPatient.name}</h1>
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
                <h3>{item.name}</h3>
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