import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Tabs, Col, Tab, Modal, Button } from 'react-bootstrap';
import StudentCMNavigationBarComponent from './StudentCMNavigationBarComponent';
import "../../style/teacher/cmActivities.css";
import { getStudentActivities, finalizeSubmission, getActivityProgress } from "../api/API";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCaretDown, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const programmingLanguageMap = {
  "Java":   { name: "Java",   image: "/src/assets/java2.png" },
  "C#":     { name: "C#",     image: "/src/assets/c.png" },
  "Python": { name: "Python", image: "/src/assets/py.png" }
};

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
        diff = open - now;
      } else if (now >= open && now <= close) {
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
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes
          .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(formatted);
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

export const StudentClassComponent = () => {
  const navigate = useNavigate();
  const { classID } = useParams();

  const [contentKey, setContentKey] = useState('ongoing');
  const [ongoingActivities, setOngoingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [selectedActivityForAssessment, setSelectedActivityForAssessment] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeTimeLeft, setResumeTimeLeft] = useState("00:00:00");
  const [expiredAttempt, setExpiredAttempt] = useState(false);
  const [sortField, setSortField] = useState("openDate");
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch the latest activities every 5 seconds
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  // For each ongoing activity, update progress from the DB to show "In Progress" immediately
  useEffect(() => {
    ongoingActivities.forEach(activity => {
      syncProgressFromServer(activity.actID);
    });
  }, [ongoingActivities]);

  // Function to fetch activities for the student
  const fetchActivities = async () => {
    try {
      const response = await getStudentActivities();
      if (!response || response.error) {
        console.error("Failed to fetch activities:", response?.error);
        return;
      }
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
      console.error("Error fetching activities:", error);
    }
  };

  // Merge server progress (from DB) into local storage
  const syncProgressFromServer = async (actID) => {
    try {
      const progressResponse = await getActivityProgress(actID);
      if (progressResponse && progressResponse.progress && progressResponse.progress.length > 0) {
        const serverProgress = progressResponse.progress[0];
        const key = `activityState_${actID}`;
        const local = localStorage.getItem(key);
        if (local) {
          const parsedLocal = JSON.parse(local);
          const mergedProgress = {
            ...parsedLocal,
            ...serverProgress,
            endTime: parsedLocal.endTime // Preserve our locally computed timer endTime
          };
          localStorage.setItem(key, JSON.stringify(mergedProgress));
          console.log("[syncProgressFromServer] Merged progress:", mergedProgress);
        } else {
          localStorage.setItem(key, JSON.stringify(serverProgress));
          console.log("[syncProgressFromServer] Set local storage from server progress:", serverProgress);
        }
      }
    } catch (error) {
      console.error("[syncProgressFromServer] Error fetching progress:", error);
    }
  };

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

  // Check local storage for progress info and return a formatted time if available
  const checkLocalStorageForActivity = (actID) => {
    const key = `activityState_${actID}`;
    const saved = localStorage.getItem(key);
    console.log(`[checkLocalStorageForActivity] Key: ${key}, saved state:`, saved);
    if (!saved) {
      console.log("[checkLocalStorageForActivity] No saved state found.");
      return null;
    }
    const parsed = JSON.parse(saved);
    if (!parsed.endTime) {
      console.log("[checkLocalStorageForActivity] Saved state has no endTime.");
      return null;
    }
    const diffMs = parsed.endTime - Date.now();
    console.log(`[checkLocalStorageForActivity] Time difference (ms): ${diffMs}`);
    if (diffMs <= 0) {
      console.log("[checkLocalStorageForActivity] Timer expired.");
      return "expired";
    }
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    console.log(`[checkLocalStorageForActivity] Returning time left: ${formatted}`);
    return formatted;
  };

  const handleActivityClick = async (activity) => {
    console.log("[handleActivityClick] Activity clicked:", activity.actTitle, "ID:", activity.actID);
    // Sync progress from DB before taking/resuming an activity
    await syncProgressFromServer(activity.actID);

    const now = new Date();
    const activityOpen = new Date(activity.openDate);
    const activityClose = new Date(activity.closeDate);

    if (activity.actAttempts > 0 && (activity.attemptsTaken || 0) >= activity.actAttempts) {
      console.log("[handleActivityClick] Maximum attempts reached.");
      setModalTitle("Maximum Attempts Reached");
      setModalMessage("You have already taken the maximum number of attempts for this activity.");
      setShowModal(true);
      return;
    }

    if (now < activityOpen) {
      console.log("[handleActivityClick] Activity not yet started.");
      setModalTitle("Activity Not Yet Started");
      setModalMessage("This activity is upcoming and will start on " + formatDateString(activity.openDate) + ".");
      setShowModal(true);
      return;
    }

    if (now > activityClose) {
      console.log("[handleActivityClick] Activity finished.");
      setModalTitle("Activity Finished");
      setModalMessage("This activity is finished and can no longer be accessed.");
      setShowModal(true);
      return;
    }

    const timeLeftStr = checkLocalStorageForActivity(activity.actID);
    console.log("[handleActivityClick] timeLeftStr:", timeLeftStr);
    if (timeLeftStr === "expired") {
      console.log("[handleActivityClick] Saved attempt expired. Initiating auto-submission.");
      setExpiredAttempt(true);
      const key = `activityState_${activity.actID}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("[handleActivityClick] Parsed saved state:", parsed);
        let itemID = parsed.selectedItem;
        if (!itemID && activity.items && activity.items[0]) {
          itemID = activity.items[0].itemID;
        }
        let code = "";
        if (parsed.files && parsed.activeFileId !== undefined) {
          const fileObj = parsed.files[parsed.activeFileId];
          if (fileObj) {
            code = fileObj.content;
          }
        }
        const submissionData = {
          itemID: itemID,
          codeSubmission: code,
          score: 0,
          timeSpent: Math.floor((Date.now() - (parsed.startTime || Date.now())) / 60000) || 0
        };
        console.log("[handleActivityClick] Auto-submitting with data:", submissionData);
        const result = await finalizeSubmission(activity.actID, submissionData);
        if (!result.error) {
          console.log("[handleActivityClick] Auto-submission successful.");
          setModalTitle("Time Expired - Attempt Submitted");
          setModalMessage("Your allotted time for this activity has expired and your attempt has been submitted automatically.");
        } else {
          console.error("[handleActivityClick] Auto-submission error:", result.error, result.details);
          setModalTitle("Submission Error");
          setModalMessage("An error occurred while submitting your attempt automatically.");
        }
        localStorage.removeItem(key);
        console.log("[handleActivityClick] Removed localStorage key:", key);
      } else {
        console.log("[handleActivityClick] No saved attempt found in localStorage.");
        setModalTitle("Expired");
        setModalMessage("No saved attempt found.");
      }
      setShowModal(true);
      return;
    } else if (timeLeftStr) {
      console.log("[handleActivityClick] Valid saved attempt found. Resuming attempt.");
      setIsResuming(true);
      setResumeTimeLeft(timeLeftStr);
      setExpiredAttempt(false);
    } else {
      console.log("[handleActivityClick] No saved attempt detected. Starting new attempt.");
      setIsResuming(false);
      setResumeTimeLeft("00:00:00");
      setExpiredAttempt(false);
    }

    setSelectedActivityForAssessment(activity);
    setShowTakeModal(true);
  };

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

  const handleClassClick = () => {
    navigate(`/student/class/${classID}/activity`);
  };

  return (
    <>
      <StudentCMNavigationBarComponent />
      <div className='class-management'>
        <div className='container class-content'>
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

          <Tabs defaultActiveKey={contentKey} id="tab" onSelect={(k) => setContentKey(k)} fill>
            <Tab eventKey="upcoming" title="Upcoming"></Tab>
            <Tab eventKey="ongoing" title="Ongoing"></Tab>
            <Tab eventKey="completed" title="Completed"></Tab>
          </Tabs>

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
                            <div>
                              <strong>Attempts: </strong>
                              {activity.actAttempts === 0 
                                ? "Unlimited" 
                                : `${activity.attemptsTaken || 0} / ${activity.actAttempts}`}
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
                            <h3>
                              {activity.actTitle}
                              {(() => {
                                const status = checkLocalStorageForActivity(activity.actID);
                                if (status === "expired") {
                                  return (
                                    <span style={{ color: "red", fontWeight: "bold", marginLeft: "8px" }}>
                                      Expired Attempt #{(activity.attemptsTaken || 0)}
                                    </span>
                                  );
                                } else if (status) {
                                  return (
                                    <span style={{ 
                                      backgroundColor: "#ffc107", 
                                      color: "#000", 
                                      padding: "2px 6px", 
                                      borderRadius: "4px", 
                                      fontSize: "0.8em", 
                                      marginLeft: "8px" 
                                    }}>
                                      In Progress
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </h3>
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
                              {(() => {
                                const status = checkLocalStorageForActivity(activity.actID);
                                if (status === "expired") {
                                  return (
                                    <span style={{ color: "red", fontWeight: "bold" }}>
                                      Expired Attempt #{(activity.attemptsTaken || 0)}
                                    </span>
                                  );
                                }
                                return <Timer openDate={activity.openDate} closeDate={activity.closeDate} />;
                              })()}
                            </div>
                            <div>
                              <strong>Attempts: </strong>
                              {activity.actAttempts === 0 
                                ? "Unlimited" 
                                : `${activity.attemptsTaken || 0} / ${activity.actAttempts}`}
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
      
      <Modal 
        show={showModal} 
        backdrop='static' 
        keyboard={false} 
        onHide={() => setShowModal(false)} 
        centered
      >
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
      
      <Modal 
        show={showTakeModal} 
        backdrop='static' 
        keyboard={false} 
        onHide={() => setShowTakeModal(false)} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {expiredAttempt ? (
              <span style={{ color: "red" }}>
                Expired Attempt #{(selectedActivityForAssessment?.attemptsTaken || 0)}
              </span>
            ) : (
              isResuming ? "Resume Activity" : "Take Activity"
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {expiredAttempt ? (
            <p style={{ color: "red" }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: "5px" }} />
              Your allotted time for this activity has expired.
            </p>
          ) : isResuming ? (
            <>
              <p>
                Do you want to resume your progress on activity: <strong>{selectedActivityForAssessment?.actTitle}</strong>?
              </p>
              <p>
                <FontAwesomeIcon icon={faClock} style={{ marginRight: "5px" }} />
                Time Left (resuming): {resumeTimeLeft}
              </p>
            </>
          ) : (
            <>
              <p>
                Do you want to take the activity: <strong>{selectedActivityForAssessment?.actTitle}</strong>?
              </p>
              <p>
                <FontAwesomeIcon icon={faClock} style={{ marginRight: "5px" }} />
                Duration: {selectedActivityForAssessment?.actDuration ? selectedActivityForAssessment.actDuration + " min" : "-"}
              </p>
            </>
          )}
          {selectedActivityForAssessment?.actAttempts > 0 && (
            <p>
              <strong>Attempts: </strong>
              {selectedActivityForAssessment.attemptsTaken || 0} / {selectedActivityForAssessment.actAttempts}
            </p>
          )}
        </Modal.Body>
        
        {!expiredAttempt && (
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
              Yes, {isResuming ? "resume activity" : "take activity"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </>
  );
};

export default StudentClassComponent;