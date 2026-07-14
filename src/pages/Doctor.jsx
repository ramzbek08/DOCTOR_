import { useEffect, useState, useRef } from "react";
import "../styles/doctor.css";
import {
  getDoctors,
  getAppointments,
  closeAppointment,
  createRevisitAppointment,
} from "../api/api";

const WEEKDAYS = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];
const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  // Dushanba (Monday) boshlanishi uchun offset
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

const Doctor = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(() => {
    return localStorage.getItem("selectedDoctor") || "";
  });
  const [appointments, setAppointments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayCount, setDayCount] = useState(null);
  const [dayCountLoading, setDayCountLoading] = useState(false);
  const [revisitSubmitting, setRevisitSubmitting] = useState(false);

  const currentPatientRef = useRef(null);
  useEffect(() => {
    currentPatientRef.current = currentPatient;
  }, [currentPatient]);

  const getNumberMapKey = (doctorId) => `appointmentNumbers_${doctorId}`;

  const loadNumberMap = (doctorId) => {
    try {
      const raw = localStorage.getItem(getNumberMapKey(doctorId));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveNumberMap = (doctorId, map) => {
    try {
      localStorage.setItem(getNumberMapKey(doctorId), JSON.stringify(map));
    } catch {}
  };

  // Muammo #3 tuzatildi: eski IDlar localStorage'dan tozalanadi
  const assignNumbers = (doctorId, arr) => {
    const map = loadNumberMap(doctorId);

    const currentIds = new Set(arr.map((item) => String(item.id)));
    Object.keys(map).forEach((key) => {
      if (!currentIds.has(key)) delete map[key];
    });

    let maxNum = Object.values(map).reduce((max, n) => (n > max ? n : max), 0);

    arr.forEach((item) => {
      const key = String(item.id);
      if (!map[key]) {
        maxNum += 1;
        map[key] = maxNum;
      }
    });

    saveNumberMap(doctorId, map);
    return arr.map((item) => ({ ...item, _num: map[String(item.id)] }));
  };

  // Muammo #5 tuzatildi: xatoliklar ekranda ko'rsatiladi
  const loadDoctors = async () => {
    setDoctorsLoading(true);
    setError(null);
    try {
      const data = await getDoctors();
      if (Array.isArray(data)) {
        setDoctors(data);
        if (data.length > 0) {
          const saved = localStorage.getItem("selectedDoctor");
          if (!saved) setSelectedDoctor(String(data[0].id));
          else setSelectedDoctor(saved);
        }
      } else {
        setError("Shifokorlar ro'yxatini olishda xatolik yuz berdi.");
      }
    } catch {
      setError("Server bilan ulanishda xatolik. Qayta urinib ko'ring.");
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Muammo #2 tuzatildi: setLoading(false) finally blokida
  const loadAppointments = async (doctorId, silent = false) => {
    if (!doctorId) return [];
    if (!silent) setLoading(true);
    try {
      const data = await getAppointments(doctorId);
      const arr = Array.isArray(data) ? data : [];
      const withNumbers = assignNumbers(doctorId, arr);
      setAppointments(withNumbers);
      return withNumbers;
    } catch {
      if (!silent) setError("Navbatlarni yuklashda xatolik yuz berdi.");
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
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
          setCurrentPatient(stillExists);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDoctor]);

  const nextPatient = () => {
    if (appointments.length === 0) return;
    const p = appointments[0];
    setCurrentPatient(p);
    try {
      localStorage.setItem("currentPatientId", String(p.id));
    } catch {}
  };

  // Muammo #1 tuzatildi: keyingi bemor avtomatik tanlanmaydi
  // Muammo #4 tuzatildi: finishing holati va disabled tugma qo'shildi
  const finishPatient = async () => {
    if (!currentPatient) return;

    setFinishing(true);
    setError(null);
    try {
      await closeAppointment(Number(selectedDoctor), currentPatient.id);

      const updatedRaw = await getAppointments(selectedDoctor);
      const normalizedRaw = Array.isArray(updatedRaw) ? updatedRaw : [];
      const normalized = assignNumbers(selectedDoctor, normalizedRaw);

      setAppointments(normalized);
      setCurrentPatient(null);
      localStorage.removeItem("currentPatientId");
    } catch {
      setError("Bemorni tugatishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setFinishing(false);
    }
  };

  const openCalendar = () => {
    setCalendarMonth(new Date());
    setSelectedDate(null);
    setDayCount(null);
    setShowCalendar(true);
  };

  const closeCalendar = () => {
    setShowCalendar(false);
    setSelectedDate(null);
    setDayCount(null);
  };

  const changeMonth = (delta) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectDate = async (dateObj) => {
    const key = formatDateKey(dateObj);
    setSelectedDate(key);
    setDayCount(null);
    setDayCountLoading(true);
    try {
      const data = await getAppointments(selectedDoctor, key);
      const arr = Array.isArray(data) ? data : [];
      setDayCount(arr.length);
    } catch {
      setDayCount(0);
    } finally {
      setDayCountLoading(false);
    }
  };

  const confirmRevisit = async () => {
    if (!currentPatient || !selectedDate) return;

    setRevisitSubmitting(true);
    setError(null);
    try {
      await createRevisitAppointment(
        selectedDoctor,
        currentPatient.name,
        currentPatient.phone,
        selectedDate
      );
      setSuccess(`✅ ${currentPatient.name} uchun ${selectedDate} sanasiga navbat yozildi (${dayCount + 1}-navbat).`);
      closeCalendar();
    } catch {
      setError("Qayta navbat yozishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setRevisitSubmitting(false);
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

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

      {error && (
        <div className="errorBanner">
          ⚠️ {error}
          <button className="errorClose" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {success && (
        <div className="successBanner">
          {success}
          <button className="errorClose" onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      <div className="topBar">
        <h1>🩺 Doctor Panel</h1>
        <div className="countBox">{appointments.length} ta navbat</div>
      </div>

      <select
        className="doctorSelect"
        value={selectedDoctor}
        onChange={(e) => { setSelectedDoctor(e.target.value); setShowQR(false); }}
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

      {/* QR KOD */}
      {selectedDoctor && (() => {
        const qrUrl = `https://dental.kliniknavbat.uz/createApp/${selectedDoctor}`;
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrUrl)}`;
        const docName = doctors.find((d) => String(d.id) === String(selectedDoctor))?.name || "";
        return (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setShowQR((v) => !v)}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                border: "2px solid #16a34a",
                background: showQR ? "#f0fdf4" : "#fff",
                color: "#16a34a", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              📷 {showQR ? "QR kodni yopish" : "QR kodni ko'rish"}
            </button>

            {showQR && (
              <div style={{
                marginTop: "12px", background: "#fff", borderRadius: "12px",
                padding: "24px 16px", textAlign: "center",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}>
                <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "13px" }}>Shifokor</p>
                <p style={{ margin: "0 0 16px", fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>{docName}</p>
                <img
                  src={qrImg}
                  alt="QR kod"
                  style={{ width: "220px", height: "220px", borderRadius: "8px", display: "block", margin: "0 auto 14px" }}
                />
                <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "12px", wordBreak: "break-all" }}>
                  {qrUrl}
                </p>
                <a
                  href={qrImg}
                  download={`qr-${docName}.png`}
                  style={{
                    display: "inline-block", padding: "10px 24px",
                    borderRadius: "8px", background: "#16a34a",
                    color: "#fff", fontWeight: "600", fontSize: "14px",
                    textDecoration: "none"
                  }}
                >
                  ⬇ Yuklab olish
                </a>
              </div>
            )}
          </div>
        );
      })()}

      <div className="currentCard">
        <h2>🏥 Hozir qabulda</h2>
        {currentPatient ? (
          <>
            <div className="bigNumber">#{currentPatient._num}</div>
            <h1>{currentPatient.name}</h1>
            <p>📞 {currentPatient.phone}</p>
            <button
              className="finishBtn"
              onClick={finishPatient}
              disabled={finishing}
            >
              {finishing ? "Tugatilmoqda..." : "✅ Tugatish"}
            </button>
            <button className="revisitBtn" onClick={openCalendar}>
              📅 Qayta navbat berish
            </button>
          </>
        ) : (
          <div>
            <p className="empty">Hozir bemor yo'q</p>
            <button
              className="nextBtn"
              onClick={nextPatient}
              disabled={appointments.length === 0}
            >
              ➡ Keyingisi
            </button>
          </div>
        )}
      </div>

      <div className="queueWrapper">
        <h2>📋 Navbatlar</h2>
        {appointments.length === 0 ? (
          <p className="empty">Navbat yo'q</p>
        ) : (
          appointments.map((item) => (
            <div key={item.id} className="queueCard">
              <div>
                <div className="number">#{item._num}</div>
                <h3>{item.name}</h3>
                <p>📞 {item.phone}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showCalendar && (
        <div className="calendarOverlay" onClick={closeCalendar}>
          <div className="calendarModal" onClick={(e) => e.stopPropagation()}>
            <h2>📅 Qayta ko'rik sanasini tanlang</h2>
            <p className="calendarPatientName">{currentPatient?.name}</p>

            <div className="calendarHeader">
              <button className="calendarNavBtn" onClick={() => changeMonth(-1)}>◀</button>
              <span>{MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
              <button className="calendarNavBtn" onClick={() => changeMonth(1)}>▶</button>
            </div>

            <div className="calendarWeekdays">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="calendarWeekday">{wd}</div>
              ))}
            </div>

            <div className="calendarGrid">
              {buildMonthGrid(calendarMonth).map((dateObj, idx) => {
                if (!dateObj) return <div key={idx} className="calendarCell empty" />;
                const key = formatDateKey(dateObj);
                const isPast = dateObj < todayStart;
                const isSelected = key === selectedDate;
                return (
                  <button
                    key={idx}
                    className={`calendarCell${isSelected ? " selected" : ""}`}
                    disabled={isPast}
                    onClick={() => selectDate(dateObj)}
                  >
                    {dateObj.getDate()}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="calendarPreview">
                {dayCountLoading
                  ? "Navbat soni hisoblanmoqda..."
                  : `Bu kunga ${(dayCount ?? 0) + 1}-navbat bo'ladi`}
              </div>
            )}

            <div className="calendarActions">
              <button className="calendarCancelBtn" onClick={closeCalendar}>
                Bekor qilish
              </button>
              <button
                className="calendarConfirmBtn"
                onClick={confirmRevisit}
                disabled={!selectedDate || dayCountLoading || revisitSubmitting}
              >
                {revisitSubmitting ? "Yozilmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Doctor;
