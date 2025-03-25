import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import "../../style/teacher/activityItems.css"; 
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import { getActivityItemsByTeacher, getCurrentUserKey, getActivityProgress  } from "../api/API";

// Mapping of known programming languages to images
const programmingLanguageMap = {
  1: { name: "Java", image: "/src/assets/java2.png" },
  2: { name: "C#", image: "/src/assets/c.png" },
  3: { name: "Python", image: "/src/assets/py.png" }
};

// AutoResizeTextarea helper: adjusts its height based on content
function AutoResizeTextarea({ value, ...props }) {
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <Form.Control
      as="textarea"
      ref={textareaRef}
      value={value}
      rows={1}
      style={{
        whiteSpace: "pre-wrap",
        overflow: "hidden",
        resize: "none"
      }}
      {...props}
    />
  );
}

const TeacherActivityItemsComponent = () => {
  const { actID, classID } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state for showing item details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // New confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState("");
  const [confirmModalMessage, setConfirmModalMessage] = useState("");

  // We'll use a teacher-specific key (replace with real teacher ID if available)
  const teacherKey = getCurrentUserKey() || 'default';
  const stateKey = `activityState_${actID}_${teacherKey}`;

  // Fetch activity data on mount.
  useEffect(() => {
    fetchActivityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps

    // Also try to sync localStorage with any progress from the server
    syncTeacherProgressFromServer(actID);
  }, [actID]);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const response = await getActivityItemsByTeacher(actID);
      if (!response.error) {
        setActivity({
          name: response.activityName,
          description: response.actDesc,
          maxPoints: response.maxPoints,
          actDuration: response.actDuration,
        });
        setItems(response.items || []);
      }
    } catch (error) {
      console.error("❌ Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  // fetch teacher’s progress from DB
  const syncTeacherProgressFromServer = async (activityId) => {
    try {
      // You might have a teacher-specific endpoint or reuse the same getActivityProgress
      // For demonstration, we’ll pretend getActivityProgress also works for teacher progress
      const progressResponse = await getActivityProgress(activityId);

      // progressResponse might look like { progress: [ ... ] } just like in the student code
      if (progressResponse && progressResponse.progress && progressResponse.progress.length > 0) {
        const serverProgress = progressResponse.progress[0];
        const localData = localStorage.getItem(stateKey);
        let mergedProgress = {};

        if (localData) {
          const parsedLocal = JSON.parse(localData);
          // Merge: prefer local endTime, but override with server’s data
          mergedProgress = {
            ...parsedLocal,
            ...serverProgress,
            endTime: parsedLocal.endTime, 
          };
        } else {
          mergedProgress = serverProgress;
        }

        // Save merged result back to local storage
        localStorage.setItem(stateKey, JSON.stringify(mergedProgress));
        console.log("[syncTeacherProgressFromServer] Merged progress:", mergedProgress);
      } else {
        // If no progress found in DB, remove local
        localStorage.removeItem(stateKey);
        console.log("[syncTeacherProgressFromServer] No teacher progress found. Local storage cleared.");
      }
    } catch (error) {
      console.error("[syncTeacherProgressFromServer] Error:", error);
    }
  };

  // When a row (item) is clicked, open the modal for details.
  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  // Helper: Check teacher progress from localStorage.
  // Returns "in progress" if valid, "expired" if past endTime, or null if none.
  const checkTeacherProgressStatus = () => {
    const saved = localStorage.getItem(stateKey);
    console.log("State for", stateKey, ":", saved);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      console.log("Parsed state:", parsed);
      if (parsed.endTime) {
        return parsed.endTime > Date.now() ? "in progress" : "expired";
      }
    } catch (e) {
      console.error("Error parsing saved state:", e);
    }
    return null;
  };

  // Handler for the "Try Answering the Activity" button.
  const handleTryTest = () => {
    const status = checkTeacherProgressStatus();
    if (!status) {
      // Fresh start scenario
      setConfirmModalTitle("Start New Test");
      setConfirmModalMessage(`Do you want to start testing the activity "${activity?.name}"?`);
    } else if (status === "in progress") {
      setConfirmModalTitle("Resume Test");
      setConfirmModalMessage(`You have an in-progress test for "${activity?.name}". Do you want to resume?`);
    } else if (status === "expired") {
      setConfirmModalTitle("Test Completed");
      setConfirmModalMessage(`Your previous test attempt for "${activity?.name}" has expired. Do you want to start a new test?`);
    }
    setShowConfirmModal(true);
  };

  // Confirmation modal handler.
  const handleConfirm = () => {
    const status = checkTeacherProgressStatus();
    if (status === "expired") {
      // Clear expired progress so teacher can start afresh.
      localStorage.removeItem(stateKey);
    }
    setShowConfirmModal(false);
    // Navigate to the teacher assessment page.
    navigate(`/teacher/class/${classID}/activity/${actID}/assessment`);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <TeacherAMNavigationBarComponent />
      <div className="activity-items">

        {activity && (
          <ActivityHeader 
            name={activity.name} 
            description={activity.description}
            actItemPoints={activity.maxPoints}
          />
        )}

        {/* Refresh Button */}
        <div style={{ margin: '10px 0', textAlign: 'right' }}>
          <Button variant="secondary" onClick={fetchActivityData}>
            Refresh Data
          </Button>
        </div>

        <TableComponent items={items} loading={loading} onRowClick={handleRowClick}/>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            className="try-answer-button active"
            onClick={handleTryTest}
          >
            ✏️ Try Answering the Activity
          </button>
          {/* Optionally, you can show a small indicator if progress exists */}
          {checkTeacherProgressStatus() === "in progress" && (
            <span style={{ marginLeft: '10px', color: '#007bff', fontWeight: 'bold' }}>
              In Progress
            </span>
          )}
          {checkTeacherProgressStatus() === "expired" && (
            <span style={{ marginLeft: '10px', color: 'red', fontWeight: 'bold' }}>
              Test Completed
            </span>
          )}
        </div>

        {/* Modal to show item details */}
        <Modal
          className='modal-design'
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          size="md"
        >
          <Modal.Header closeButton>
            <Modal.Title>Item Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>

            {selectedItem ? (
              <div>
                <Form.Group className="mb-3">
                  <Form.Label>Item Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={selectedItem.itemName}
                    readOnly
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={selectedItem.itemDesc}
                    readOnly
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Difficulty</Form.Label>
                  <Form.Control
                    value={selectedItem.itemDifficulty}
                    readOnly
                  >
                  </Form.Control>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Item Points</Form.Label>
                  <Form.Control
                    type="number"
                    value={selectedItem.actItemPoints}
                    readOnly
                  />
                </Form.Group>
                <p>
                  Programming Languages:{" "}
                  {selectedItem.programming_languages && selectedItem.programming_languages.length > 0 ? (
                    selectedItem.programming_languages.map((lang, index) => {
                      const mapping = programmingLanguageMap[lang.progLangID] || { name: lang.progLangName, image: null };
                      return (
                        <span key={lang.progLangID}>
                          {mapping.image ? (
                            <>
                              <img 
                                src={mapping.image} 
                                alt={`${mapping.name} Icon`} 
                                style={{ width: "20px", marginRight: "5px" }}
                              />
                              {mapping.name}
                            </>
                          ) : (
                            mapping.name
                          )}
                          {index < selectedItem.programming_languages.length - 1 ? ", " : ""}
                        </span>
                      );
                    })
                  ) : (
                    "-"
                  )}
                </p>
                <h6>Test Cases (added after each successful run):</h6>
                {selectedItem.testCases && selectedItem.testCases.length > 0 ? (
                  <Form.Group className="mb-3">
                    {selectedItem.testCases.map((tc, index) => (
                      <div
                        key={index}
                        className="test-case-item"
                      >
                        <strong>Test Case {index + 1}:</strong>
                        <br />
                        <Form.Label style={{ marginTop: "5px" }}>Expected Output:</Form.Label>
                        <AutoResizeTextarea
                          readOnly
                          value={tc.expectedOutput}
                          style={{ marginBottom: "5px" }}
                        />
                        <Form.Label>Points:</Form.Label>
                        <Form.Control
                          type="number"
                          value={tc.testCasePoints ?? ""}
                          readOnly
                        />
                        <Form.Check
                          type="checkbox"
                          label="Hidden"
                          checked={tc.isHidden || false}
                          readOnly
                          style={{ marginTop: "5px" }}
                        />
                      </div>
                    ))}
                  </Form.Group>
                ) : (
                  <p className='text-center'>No test cases available.</p>
                )}
              </div>
            ) : (
              <p className='text-center'>No item selected.</p>
            )}
            
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Confirmation Modal for Test Start / Resume / Expired */}
        <Modal
          className='modal-design'
          show={showConfirmModal}
          onHide={handleCancelConfirm}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{confirmModalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{confirmModalMessage}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelConfirm}>
              Cancel
            </Button>
            <Button className='success-button' onClick={handleConfirm}>
              Yes, proceed
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
};

const ActivityHeader = ({ name, description, actItemPoints }) => (
  <header className="activity-header">
    <div className="header-content">
      <div className="left-indicator"></div>
      <div className="activity-info">
        <h2 className="activity-title">
          {name} <span className="points">({actItemPoints} points)</span>
        </h2>
        {description && <p className="activity-description">{description}</p>}
      </div>
      <div className="menu-icon">
        <i className="bi bi-three-dots"></i>
      </div>
    </div>
  </header>
);

const TableComponent = ({ items, loading, onRowClick }) => {
  return (
    <div className="table-wrapper">
      <table className="item-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Difficulty</th>
            <th>Item Type</th>
            <th>Points</th>
            <th>Avg. Student Score</th>
            <th>Avg. Student Time Spent</th>
          </tr>
        </thead>
        <tbody style={{cursor: "pointer"}}>
          {loading ? (
            <tr>
              <td colSpan="6" className="loading-text">Loading...</td>
            </tr>
          ) : items.length > 0 ? (
            items.map((item, index) => (
              <tr key={index} onClick={() => onRowClick(item)}>
                <td>{item.itemName}</td>
                <td>{item.itemDifficulty}</td>
                <td>{item.itemType}</td>
                <td>{item.actItemPoints}</td>
                <td>
                  {item.avgStudentScore !== "-"
                    ? `${item.avgStudentScore} / ${item.actItemPoints}`
                    : `- / ${item.actItemPoints}`}
                </td>
                <td>
                  {item.avgStudentTimeSpent !== "-" ? item.avgStudentTimeSpent : "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="loading-text">No items found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TeacherActivityItemsComponent;