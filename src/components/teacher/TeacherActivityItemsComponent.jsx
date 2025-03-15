import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import "../../style/teacher/cmActivities.css"; 
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import { getActivityItemsByTeacher, getCurrentUserKey } from "../api/API";

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
  }, []);

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
    <div className="activity-items">
      <TeacherAMNavigationBarComponent />

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

      <TableComponent items={items} loading={loading} onRowClick={handleRowClick} />

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
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Item Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem ? (
            <div>
              <h5>{selectedItem.itemName}</h5>
              <p>
                <strong>Description:</strong> {selectedItem.itemDesc}
              </p>
              <p>
                <strong>Difficulty:</strong> {selectedItem.itemDifficulty}
              </p>
              <p>
                <strong>Points:</strong> {selectedItem.actItemPoints}
              </p>
              <p>
                <strong>Programming Languages:</strong>{" "}
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
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        marginBottom: "10px"
                      }}
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
                <p>No test cases available.</p>
              )}
            </div>
          ) : (
            <p>No item selected.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal for Test Start / Resume / Expired */}
      <Modal
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
          <Button variant="primary" onClick={handleConfirm}>
            Yes, proceed
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
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
        <tbody>
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