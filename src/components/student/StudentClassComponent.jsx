import React, { useEffect, useState } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Tabs, Col, Tab, Modal, Button } from 'react-bootstrap';
import StudentCMNavigationBarComponent from './StudentCMNavigationBarComponent';
import "../../style/teacher/cmActivities.css"; 
import { getStudentActivities } from "../api/API"; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCaretDown } from '@fortawesome/free-solid-svg-icons';

// Mapping of known programming languages to icons
const programmingLanguageMap = {
  "Java":   { name: "Java",   image: "/src/assets/java2.png" },
  "C#":     { name: "C#",     image: "/src/assets/c.png" },
  "Python": { name: "Python", image: "/src/assets/py.png" }
};

/**
 * Timer component displays a countdown timer as "HH:MM:SS".
 * If time left is <= 10 minutes, the timer text turns red and bold.
 */
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
        // Activity hasn't started yet
        diff = open - now;
      } else if (now >= open && now <= close) {
        // Activity ongoing
        diff = close - now;
      } else {
        diff = 0;
      }

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setIsTimeLow(false);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(formatted);
        setIsTimeLow(diff <= 10 * 60 * 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [openDate, closeDate]);

  return (
    <span 
      style={{ 
        color: isTimeLow ? "red" : "inherit", 
        fontWeight: isTimeLow ? "bold" : "normal" 
      }}
    >
      {timeLeft}
    </span>
  );
};

export const StudentClassComponent = () => {
  const navigate = useNavigate();
  const { classID } = useParams();

  // Tab state
  const [contentKey, setContentKey] = useState('ongoing');

  // Activities state
  const [ongoingActivities, setOngoingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [upcomingActivities, setUpcomingActivities] = useState([]);

  // Modal states for finished/upcoming activities
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // Modal state for confirming to take an ongoing activity
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [selectedActivityForAssessment, setSelectedActivityForAssessment] = useState(null);

  // New sorting states for activities
  const [sortField, setSortField] = useState("openDate");  // can be "openDate" or "closeDate"
  const [sortOrder, setSortOrder] = useState("asc");         // "asc" or "desc"

  // Handler functions for sorting
  const handleSortByOpenDate = () => {
    if (sortField === "openDate") {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField("openDate");
      setSortOrder("asc");
    }
  };

  const handleSortByCloseDate = () => {
    if (sortField === "closeDate") {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField("closeDate");
      setSortOrder("asc");
    }
  };

  // Derived sorted arrays for each activity type:
  const sortedUpcomingActivities = [...upcomingActivities].sort((a, b) => {
    const dateA = new Date(a[sortField]);
    const dateB = new Date(b[sortField]);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const sortedOngoingActivities = [...ongoingActivities].sort((a, b) => {
    const dateA = new Date(a[sortField]);
    const dateB = new Date(b[sortField]);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const sortedCompletedActivities = [...completedActivities].sort((a, b) => {
    const dateA = new Date(a[sortField]);
    const dateB = new Date(b[sortField]);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  // -------------------- Lifecycle: Fetch Activities --------------------
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch student activities from API and filter by classID
  const fetchActivities = async () => {
    try {
      const response = await getStudentActivities();
      console.log("🟢 API Response:", response);
      if (!response || response.error) {
        console.error("❌ Failed to fetch activities:", response?.error);
        return;
      }
      // Assuming your API returns { upcoming, ongoing, completed }
      const filteredUpcoming = (response.upcoming || []).filter(
        act => String(act.classID) === String(classID)
      );
      const filteredOngoing = (response.ongoing || []).filter(
        act => String(act.classID) === String(classID)
      );
      const filteredCompleted = (response.completed || []).filter(
        act => String(act.classID) === String(classID)
      );

      setUpcomingActivities(filteredUpcoming);
      setOngoingActivities(filteredOngoing);
      setCompletedActivities(filteredCompleted);
    } catch (error) {
      console.error("❌ Error fetching activities:", error);
    }
  };

  // Handle activity click
  const handleActivityClick = (activity) => {
    const now = new Date();
    const activityOpen = new Date(activity.openDate);
    const activityClose = new Date(activity.closeDate);
    
    if (now < activityOpen) {
      setModalTitle("Activity Not Yet Started");
      setModalMessage("This activity is upcoming and will start on " + formatDateString(activity.openDate) + ".");
      setShowModal(true);
    } else if (now > activityClose) {
      setModalTitle("Activity Finished");
      setModalMessage("This activity is finished and can no longer be accessed.");
      setShowModal(true);
    } else {
      setSelectedActivityForAssessment(activity);
      setShowTakeModal(true);
    }
  };

  // Helper to render multiple languages
  const renderLanguages = (languagesArray) => {
    if (!Array.isArray(languagesArray) || languagesArray.length === 0) {
      return "-";
    }
    return (
      <div className="lang-container">
        {languagesArray.map((langItem, index) => {
          let langName;
          if (typeof langItem === "object" && langItem !== null) {
            langName = (langItem.progLangName || "").trim();
          } else {
            langName = String(langItem).trim();
          }
          const mapping = programmingLanguageMap[langName] || { name: langName, image: null };
          return (
            <button disabled key={index} className="lang-btn">
              {mapping.image ? (
                <img 
                  src={mapping.image} 
                  alt={`${mapping.name} Icon`} 
                  style={{ width: "20px", marginRight: "5px" }}
                />
              ) : null}
              {mapping.name}
            </button>
          );
        })}
      </div>
    );
  };

  // Helper: Format date/time like "05 November 2024 10:29AM"
  const formatDateString = (dateString) => {
    if (!dateString) return "-";
    const dateObj = new Date(dateString);
    const day = String(dateObj.getDate()).padStart(2, '0'); 
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${monthName} ${year} ${hours}:${minutes}${ampm}`;
  };

  return (
    <>
      <StudentCMNavigationBarComponent />
      <div className='class-management'>
        <div className='container class-content'>
          {/* Sorting Controls for Activities */}
          <div style={{ margin: "20px 0" }}>
            <span>Sort by: </span>
            <Button variant="link" onClick={handleSortByOpenDate}>
              Open Date{" "}
              {sortField === "openDate" && (
                <FontAwesomeIcon
                  icon={faCaretDown}
                  style={{
                    transform: sortOrder === "asc" ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              )}
            </Button>
            <Button variant="link" onClick={handleSortByCloseDate}>
              Close Date{" "}
              {sortField === "closeDate" && (
                <FontAwesomeIcon
                  icon={faCaretDown}
                  style={{
                    transform: sortOrder === "asc" ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              )}
            </Button>
          </div>

          <Tabs
            defaultActiveKey={contentKey}
            id="tab"
            onSelect={(k) => setContentKey(k)}
            fill
          >
            <Tab eventKey="upcoming" title="Upcoming"></Tab>
            <Tab eventKey="ongoing" title="Ongoing"></Tab>
            <Tab eventKey="completed" title="Completed"></Tab>
          </Tabs>

          {/* -------------------- Upcoming Activities -------------------- */}
          {contentKey === "upcoming" && (
            <div className='upcoming-class-activities'>
              {sortedUpcomingActivities.length === 0 ? (
                <p>No upcoming activities found.</p>
              ) : (
                sortedUpcomingActivities.map((activity) => {
                  const languages = activity.programmingLanguages || activity.programming_languages || [];
                  return (
                    <div 
                      className='class-activities' 
                      key={`upcoming-${activity.actID}`} 
                      onClick={() => handleActivityClick(activity)}
                      style={{ cursor: "pointer" }}
                    >
                      <Row>
                        <Col className='activity-details-column'>
                          <div className='class-activity-details'>
                            <h3>{activity.actTitle}</h3>
                            <p><strong>Teacher:</strong> {activity.teacherName}</p>
                            <p className="activity-description">{activity.actDesc}</p>
                            {renderLanguages(languages)}
                            <p>
                              <i className='bi bi-calendar-check'></i>{" "}
                              Open Date: {formatDateString(activity.openDate)}
                            </p>
                            <p>
                              <i className='bi bi-calendar-x'></i>{" "}
                              Close Date: {formatDateString(activity.closeDate)}
                            </p>
                            <h6><strong>Difficulty:</strong> {activity.actDifficulty || "-"}</h6>
                            <div style={{ marginTop: "5px" }}>
                              <strong>Time Left: </strong>
                              <Timer openDate={activity.openDate} closeDate={activity.closeDate} />
                            </div>
                          </div>
                        </Col>
                        <Col className='activity-stats'>
                          <div className='score-chart'>
                            <h4>{activity.rank ?? "-"}</h4>
                            <p>Rank</p>
                          </div>
                          <div className='score-chart'>
                            <h4>
                              {activity.overallScore !== null 
                                ? `${activity.overallScore} / ${activity.maxPoints ?? "-"}` 
                                : `- / ${activity.maxPoints ?? "-"}`}
                            </h4>
                            <p>Overall Score</p>
                          </div>
                          <div className='score-chart'>
                            <h4>{activity.actDuration ? activity.actDuration : "-"}</h4>
                            <p>Duration</p>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* -------------------- Ongoing Activities -------------------- */}
          {contentKey === "ongoing" && (
            <div className='ongoing-class-activities'>
              {sortedOngoingActivities.length === 0 ? (
                <p>No ongoing activities found.</p>
              ) : (
                sortedOngoingActivities.map((activity) => {
                  const languages = activity.programmingLanguages || activity.programming_languages || [];
                  return (
                    <div 
                      className='class-activities' 
                      key={`ongoing-${activity.actID}`} 
                      onClick={() => handleActivityClick(activity)}
                      style={{ cursor: "pointer" }}
                    >
                      <Row>
                        <Col className='activity-details-column'>
                          <div className='class-activity-details'>
                            <h3>{activity.actTitle}</h3>
                            <p><strong>Teacher:</strong> {activity.teacherName}</p>
                            <p className="activity-description">{activity.actDesc}</p>
                            {renderLanguages(languages)}
                            <p>
                              <i className='bi bi-calendar-check'></i>{" "}
                              Open Date: {formatDateString(activity.openDate)}
                            </p>
                            <p>
                              <i className='bi bi-calendar-x'></i>{" "}
                              Close Date: {formatDateString(activity.closeDate)}
                            </p>
                            <h6><strong>Difficulty:</strong> {activity.actDifficulty || "-"}</h6>
                            <div style={{ marginTop: "5px" }}>
                              <strong>Time Left: </strong>
                              <Timer openDate={activity.openDate} closeDate={activity.closeDate} />
                            </div>
                          </div>
                        </Col>
                        <Col className='activity-stats'>
                          <div className='score-chart'>
                            <h4>{activity.rank ?? "-"}</h4>
                            <p>Rank</p>
                          </div>
                          <div className='score-chart'>
                            <h4>
                              {activity.overallScore !== null 
                                ? `${activity.overallScore} / ${activity.maxPoints ?? "-"}` 
                                : `- / ${activity.maxPoints ?? "-"}`}
                            </h4>
                            <p>Overall Score</p>
                          </div>
                          <div className='score-chart'>
                            <h4>{activity.actDuration ? activity.actDuration : "-"}</h4>
                            <p>Duration</p>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* -------------------- Completed Activities -------------------- */}
          {contentKey === "completed" && (
            <div className='completed-class-activities'>
              {sortedCompletedActivities.length === 0 ? (
                <p>No completed activities found.</p>
              ) : (
                sortedCompletedActivities.map((activity) => {
                  const languages = activity.programmingLanguages || activity.programming_languages || [];
                  return (
                    <div 
                      className='class-activities' 
                      key={`completed-${activity.actID}`} 
                      onClick={() => handleActivityClick(activity)}
                      style={{ cursor: "pointer" }}
                    >
                      <Row>
                        <Col className='activity-details-column'>
                          <div className='class-activity-details'>
                            <h3>{activity.actTitle}</h3>
                            <p><strong>Teacher:</strong> {activity.teacherName}</p>
                            {renderLanguages(languages)}
                            <p>
                              <i className='bi bi-calendar-check'></i>{" "}
                              Open Date: {formatDateString(activity.openDate)}
                            </p>
                            <p>
                              <i className='bi bi-calendar-x'></i>{" "}
                              Close Date: {formatDateString(activity.closeDate)}
                            </p>
                            <h6><strong>Difficulty:</strong> {activity.actDifficulty || "-"}</h6>
                            <div style={{ marginTop: "5px" }}>
                              <strong>Time Left: </strong>
                              <Timer openDate={activity.openDate} closeDate={activity.closeDate} />
                            </div>
                          </div>
                        </Col>
                        <Col className='activity-stats'>
                          <div className='score-chart'>
                            <h4>{activity.rank ?? "-"}</h4>
                            <p>Rank</p>
                          </div>
                          <div className='score-chart'>
                            <h4>
                              {activity.overallScore !== null 
                                ? `${activity.overallScore} / ${activity.maxPoints ?? "-"}` 
                                : `- / ${activity.maxPoints ?? "-"}`}
                            </h4>
                            <p>Overall Score</p>
                          </div>
                          <div className='score-chart'>
                            <h4>{activity.actDuration ? activity.actDuration : "-"}</h4>
                            <p>Duration</p>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal for upcoming/finished activities */}
      <Modal show={showModal} backdrop='static' keyboard={false} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{modalMessage}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal for confirming to take an ongoing activity */}
      <Modal show={showTakeModal} backdrop='static' keyboard={false} onHide={() => setShowTakeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Take Activity</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Do you want to take the activity: <strong>{selectedActivityForAssessment?.actTitle}</strong>?
          </p>
          <p>
            <FontAwesomeIcon icon={faClock} style={{ marginRight: "5px" }} />
            Duration: {selectedActivityForAssessment?.actDuration 
              ? selectedActivityForAssessment.actDuration + " min" 
              : "-"}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTakeModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              navigate(`/student/class/${classID}/activity/${selectedActivityForAssessment.actID}/assessment`);
            }}
          >
            Yes, take activity
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StudentClassComponent;