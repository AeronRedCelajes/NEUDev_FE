import React, { useState, useEffect } from "react"; 
import { useParams } from "react-router-dom";
import "../../style/teacher/activitySettings.css";
import TeacherAMNavigationBarComponent from './TeacherAMNavigationBarComponent';
import { getActivitySettingsTeacher, updateActivitySettingsTeacher, getProfile } from "../api/API";

// -------------------- Timer Component --------------------
// Displays the time left in HH:MM:SS. If time left <= 10 minutes, text turns red and bold.
const Timer = ({ openDate, closeDate }) => {
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [isTimeLow, setIsTimeLow] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const open = new Date(openDate);
      const close = new Date(closeDate);

      let diff = 0;
      if (now < open) {
        // Countdown to openDate
        diff = open - now;
      } else if (now >= open && now <= close) {
        // Countdown to closeDate
        diff = close - now;
      } else {
        // Past closeDate => 0
        diff = 0;
      }

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setIsTimeLow(false);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(formatted);
        // If <= 10 minutes left, highlight
        setIsTimeLow(diff <= 10 * 60 * 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [openDate, closeDate]);

  return (
    <span style={{ color: isTimeLow ? "red" : "inherit", fontWeight: isTimeLow ? "bold" : "normal" }}>
      {timeLeft}
    </span>
  );
};

// -------------------- Main Component --------------------
const TeacherActivitySettingsComponent = () => {
  const { actID } = useParams(); 
  const [activity, setActivity] = useState(null);
  const [settings, setSettings] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchProfessorInfo();
  }, []);

  // Fetch activity settings
  const fetchSettings = async () => {
    const response = await getActivitySettingsTeacher(actID);
    if (!response.error) {
      setActivity({
        name: response.activityName,
        maxPoints: response.maxPoints,
        className: response.className,
        openDate: response.openDate,
        closeDate: response.closeDate
      });
      setSettings(response.settings);
    }
    setLoading(false);
  };

  // Fetch professor details
  const fetchProfessorInfo = async () => {
    const response = await getProfile();
    if (!response.error) {
      setProfessor({
        name: `${response.firstname} ${response.lastname}`,
        imageUrl: response.profileImage || "/src/assets/noy.png"
      });
    }
  };

  // Copy link handler – copies the link: /teacher/activity/{actID}/items
  const handleCopyLink = () => {
    const link = `${window.location.origin}/teacher/activity/${actID}/items`;
    navigator.clipboard.writeText(link)
      .then(() => alert("Link copied to clipboard!"))
      .catch((err) => console.error("Failed to copy link:", err));
  };

  return (
    <>
      <TeacherAMNavigationBarComponent />

      {!loading && activity ? (
        <div className="activity-settings">
          <ActivityHeader name={activity.name} points={activity.maxPoints} />
          <div className="activity-page">
            {/* Left Column */}
            <div className="left-column">
              <div className="info-container">
                {professor && <ProfInfo name={professor.name} imageUrl={professor.imageUrl} />}
              </div>
              <div className="date-container">
                <DateTimeSection 
                  openDate={activity.openDate} 
                  closeDate={activity.closeDate}
                  handleCopyLink={handleCopyLink}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="right-column">
              <div className="right-column-container">
                {settings && <OptionalSettings actID={actID} settings={settings} />}
              </div>
            </div>
          </div>
          </div>
      ) : (
        <p className="text-center">Loading activity settings...</p>
      )}
      
    </>
  );
};

// -------------------- Header --------------------
const ActivityHeader = ({ name, points }) => (
  <header className="activity-header">
    <div className="header-content">
      <div className="left-indicator"></div>
      <h2 className="activity-title">
        {name} <span className="points">({points} points)</span>
      </h2>
      <div className="menu-icon">
        <i className="bi bi-three-dots"></i>
      </div>
    </div>
  </header>
);

// -------------------- Professor Info --------------------
const ProfInfo = ({ name, imageUrl }) => (
  <div className="prof-info">
    <img src={imageUrl} alt="Professor" />
    <div>
      <p className="prof-name">{name}</p>
      <p className="prof-details">Instructor</p>
    </div>
  </div>
);

// -------------------- DateTime Section --------------------
const DateTimeSection = ({ openDate, closeDate, handleCopyLink }) => (
  <div className="date-time-section">
    <DateTimeItem
      icon="bi bi-calendar-check"
      label="Open Date and Time"
      defaultDate={openDate}
      color="#4CAF50"
    />
    <DateTimeItem
      icon="bi bi-calendar2-week"
      label="Close Date and Time"
      defaultDate={closeDate}
      color="#E53935"
    />
    <div className="time-limit">
      <strong>Time Left:</strong>{" "}
      <Timer openDate={openDate} closeDate={closeDate} />
      <br />
      <span className="highlight">While the activity is still open</span>
    </div>
    <button className="copy-link-btn" onClick={handleCopyLink}>
      <i className="bi bi-link-45deg"></i> Copy link
    </button>
  </div>
);

// -------------------- DateTimeItem --------------------
const DateTimeItem = ({ icon, label, defaultDate, color }) => {
  const [date, setDate] = useState(defaultDate);

  return (
    <div className="date-time-item">
      <div className="label-with-icon">
        <i className={icon} style={{ color }}></i>
        <label>{label}</label>
      </div>
      <input 
        type="datetime-local" 
        value={date} 
        onChange={(e) => setDate(e.target.value)} 
      />
    </div>
  );
};

// -------------------- Optional Settings --------------------
const OptionalSettings = ({ actID, settings }) => {
  const [selectedSettings, setSelectedSettings] = useState(settings);

  const handleToggle = async (key) => {
    const updatedSettings = { ...selectedSettings, [key]: !selectedSettings[key] };
    setSelectedSettings(updatedSettings);

    const response = await updateActivitySettingsTeacher(actID, updatedSettings);
    if (response.error) {
      console.error("❌ Failed to update settings:", response.error);
    }
  };

  const settingsList = [
    { key: "examMode", icon: "bi bi-file-earmark-text", name: "Exam mode", description: "Tab and window switches will be recorded." },
    { key: "randomizedItems", icon: "bi bi-shuffle", name: "Randomized Items", description: "Items will be shuffled at random per student." },
    { key: "disableReviewing", icon: "bi bi-eye-slash", name: "Disable reviewing", description: "Cannot be reviewed after finishing." },
    { key: "hideLeaderboard", icon: "bi bi-bar-chart-line", name: "Hide leaderboards", description: "Leaderboard will be hidden." },
    { key: "delayGrading", icon: "bi bi-clock-history", name: "Delay grading", description: "You will manually grade your students." }
  ];

  return (
    <div className="optional-settings">
      <h4 className="optional-settings-title">Optional Settings</h4>
      {settingsList.map((setting) => (
        <div
          key={setting.key}
          className={`setting-item ${selectedSettings[setting.key] ? "selected" : ""}`}
          onClick={() => handleToggle(setting.key)}
        >
          <i className={setting.icon}></i>
          <div className="setting-details">
            <strong>{setting.name}</strong>
            <p>{setting.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherActivitySettingsComponent;