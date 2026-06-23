import React, { useEffect, useState, useRef } from "react";
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

  const currentPatientRef = useRef(null);
  useEffect(() => {
    currentPatientRef.current = currentPatient;
  }, [currentPatient]);

  // ====== ✅ YANGI: navbat raqamlarini doctor bo'yicha localStorage'da saqlash ======

  const getNumberMapKey = (doctorId) => `appointmentNumbers_${doctorId}`;

  const loadNumberMap = (doctorId) => {
    try {
      const raw = localStorage.getItem(getNumberMapKey(doctorId));
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn("Number map o'qishda xatolik", err);
      return {};
    }
  };

  const saveNumberMap = (doctorId, map) => {
    try {
      localStorage.setItem(getNumberMapKey(doctorId), JSON.stringify(map));
    } catch (err) {
      console.warn("Number map yozishda xatolik", err);
    }
  };

  // Har bir appointment'ga, agar hali raqam berilmagan bo'lsa, navbatdagi keyingi raqamni biriktiradi.
  // Qaytaradi: { numbers: { id: raqam }, list: [{...appointment, _num}] }
  const assignNumbers = (doctorId, arr) => {
    const map = loadNumberMap(doctorId);

    // Hozir mavjud bo'lgan eng katta raqamni topamiz (davom ettirish uchun)
    let maxNum = 0;
    Object.values(map).forEach((n) => {
      if (n > maxNum) maxNum = n;
    });

    arr.forEach((item) => {
      const key = String(item.id);
      if (!map[key]) {
        maxNum += 1;
        map[key] = maxNum;
      }
    });

    saveNumberMap(doctorId, map);

    const list = arr.map((item) => ({
      ...item,
      _num: map[String(item.id)],
    }));

    return list;
  };

  // ====== ====== ====== ====== ====== ====== ====== ====== ======

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

  // silent = true bo'lsa, loading spinner ko'rsatilmaydi (fon rejimida yangilash uchun)
  const loadAppointments = async (doctorId, silent = false) => {
    if (!doctorId) return [];
    if (!silent) setLoading(true);
    const data = await getAppointments(doctorId);
    const arr = Array.isArray(data) ? data : [];
    const withNumbers = assignNumbers(doctorId, arr);
    setAppointments(withNumbers);
    if (!silent) setLoading(false);
    return withNumbers;
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

  // Har 10 sekundda fon rejimida navbatlarni qayta yuklash (refreshsiz yangi navbat ko'rinishi uchun)
  useEffect(() => {
    if (!selectedDoctor) return;

    const interval = setInterval(async () => {
      const data = await getAppointments(selectedDoctor);
      const arr = Array.isArray(data) ? data : [];
      const withNumbers = assignNumbers(selectedDoctor, arr);

      setAppointments((prev) => {
        const prevIds = prev.map((x) => x.id).join(",");
        const newIds = withNumbers.map((x) => x.id).join(",");
        if (prevIds === newIds) return prev;
        return withNumbers;
      });

      const cp = currentPatientRef.current;
      if (cp) {
        const stillExists = withNumbers.find((a) => String(a.id) === String(cp.id));
        if (!stillExists) {
          setCurrentPatient(null);
          localStorage.removeItem("currentPatientId");
        } else {
          // _num yangilanган bo'lishi mumkin (aslida o'zgarmaydi, lekin xavfsizlik uchun)
          setCurrentPatient(stillExists);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
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

      const closeRes = await closeAppointment(
        Number(selectedDoctor),
        currentPatient.id
      );

      console.log("✅ Bemor yopildi, response:", closeRes);
      console.log("🔄 Navbatlar qayta yuklash:", selectedDoctor);
      const updatedAppointments = await getAppointments(selectedDoctor);
      console.log("📋 Qayta yuklangan navbatlar:", updatedAppointments);

      const normalizedRaw = Array.isArray(updatedAppointments)
        ? updatedAppointments
        : updatedAppointments.message || updatedAppointments.appointments || [];

      const normalized = assignNumbers(selectedDoctor, normalizedRaw);

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
            {/* ✅ TUZATILDI: o'zgarmas, localStorage'da saqlangan asl navbat raqami */}
            <div className="bigNumber">
              #{currentPatient._num}
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
          appointments.map((item) => (
            <div key={item.id} className="queueCard">
              <div>
                {/* ✅ TUZATILDI: o'zgarmas asl navbat raqami */}
                <div className="number">#{item._num}</div>
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