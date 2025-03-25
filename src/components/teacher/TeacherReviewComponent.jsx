import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Navbar,
  Row,
  Col,
  Button,
  Dropdown,
  DropdownButton,
  Tabs,
  Tab,
  Modal,
  Spinner
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCirclePlay,
  faCheck,
  faTimes,
  faPlusSquare,
  faQuestion,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import "/src/style/student/assessment.css";

// Import your API calls:
import {
  getActivityItemsByTeacher,  // Teacher-specific endpoint to fetch items & testcases
  getSubmissionDetail         // Returns the student's codeSubmission, testCaseResults, timeRemaining, selectedLanguage, etc.
} from "../api/API";

// Helper to convert seconds → HH:MM:SS
function formatSecondsToHMS(seconds) {
  if (!seconds || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

const languageIconMap = {
  "C#": "/src/assets/c.png",
  Java: "/src/assets/java2.png",
  Python: "/src/assets/py.png"
};

const TeacherReviewComponent = () => {
  const { classID, actID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve studentID & attemptNo from query params
  const searchParams = new URLSearchParams(location.search);
  const studentID = searchParams.get("studentID");
  const attemptNo = searchParams.get("attemptNo");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Activity & submission details
  const [activityName, setActivityName] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [maxPoints, setMaxPoints] = useState(0);
  const [actDuration, setActDuration] = useState("");
  const [finalScorePolicy, setFinalScorePolicy] = useState("last_attempt");
  const [overallScore, setOverallScore] = useState(0);
  const [overallTimeSpent, setOverallTimeSpent] = useState(0);

  // Items & testcases
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Code submission (read-only)
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(0);

  // TestCaseResults
  const [testCaseResults, setTestCaseResults] = useState({});

  // For modals
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [finalTitle, setFinalTitle] = useState("Result");
  const [finalTestCases, setFinalTestCases] = useState("0/0");
  const [finalScoreText, setFinalScoreText] = useState("0/0");
  const [finalSpeed, setFinalSpeed] = useState("00:00:00");

  // Additional fields from submission
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submissionLanguage, setSubmissionLanguage] = useState("Read-Only");

  // For design parity
  const [isSubmitted] = useState(false);
  const [expandedTestCases, setExpandedTestCases] = useState({});

  // "Terminal" placeholders (teacher doesn't run code)
  const [showTerminal] = useState(false);
  const [lines] = useState([]);
  const [prompt] = useState("");

  // ---------------------------
  // Fetch + Merge data
  // ---------------------------
  useEffect(() => {
    if (!studentID || !attemptNo) {
      setErrorMsg("Missing studentID or attemptNo in URL query parameters.");
      setLoading(false);
      return;
    }
    loadData();
  }, [actID, studentID, attemptNo]);

  async function loadData() {
    setLoading(true);
    try {
      // 1) Teacher items
      const teacherItemsResp = await getActivityItemsByTeacher(actID);
      if (teacherItemsResp.error) {
        setErrorMsg(teacherItemsResp.error);
        setLoading(false);
        return;
      }
      setActivityName(teacherItemsResp.activityName || "");
      setActDesc(teacherItemsResp.actDesc || "");
      setMaxPoints(teacherItemsResp.maxPoints || 0);
      setActDuration(teacherItemsResp.actDuration || "");
      const teacherItems = teacherItemsResp.items || [];

      // 2) Student's submission
      const submissionResp = await getSubmissionDetail(actID, studentID, attemptNo);
      if (submissionResp.error) {
        setErrorMsg(submissionResp.error);
        setLoading(false);
        return;
      }
      if (submissionResp.message === "No submission details found for this attempt.") {
        setErrorMsg("No submission details found for this attempt.");
        setLoading(false);
        return;
      }
      setOverallScore(submissionResp.overallScore || 0);
      setOverallTimeSpent(submissionResp.overallTimeSpent || 0);

      // parse the submission items
      const submissionItems = submissionResp.items || [];
      if (submissionItems.length > 0) {
        const firstItem = submissionItems[0];
        if (Array.isArray(firstItem.codeSubmission)) {
          setFiles(firstItem.codeSubmission);
        }
        if (firstItem.timeRemaining != null) {
          setTimeRemaining(firstItem.timeRemaining);
        }
        if (firstItem.selectedLanguage) {
          setSubmissionLanguage(firstItem.selectedLanguage);
        }
      }

      // Build testCaseResults map
      const tcrMap = {};
      submissionItems.forEach(sub => {
        if (sub.testCaseResults) {
          tcrMap[sub.itemID] = sub.testCaseResults;
        }
      });
      setTestCaseResults(tcrMap);

      setItems(teacherItems);

      // Pre-select first item
      if (teacherItems.length > 0) {
        setSelectedItem(teacherItems[0].itemID);
        setExpandedItem(teacherItems[0].itemID);
      }
    } catch (err) {
      setErrorMsg("Network error or server issue loading teacher review data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // Score logic
  // ---------------------------
  function computeItemScore(itemID) {
    const tcr = testCaseResults[itemID] || {};
    let sum = 0;
    Object.values(tcr).forEach(tc => {
      if (finalScorePolicy === "highest_score") {
        sum += tc.bestPoints || 0;
      } else {
        sum += tc.latestPoints || 0;
      }
    });
    return sum;
  }

  function computeTotalScore() {
    let total = 0;
    items.forEach(it => {
      total += computeItemScore(it.itemID);
    });
    return total;
  }

  // ---------------------------
  // Summaries
  // ---------------------------
  const handleFinishAttempt = () => setShowFinishModal(true);

  const handleSubmitAllAndFinish = () => {
    let totalTC = 0;
    let correctTC = 0;
    items.forEach(it => {
      const tcr = testCaseResults[it.itemID] || {};
      totalTC += Object.keys(tcr).length;
      Object.values(tcr).forEach(res => {
        if (finalScorePolicy === "highest_score") {
          if (res.bestPass) correctTC++;
        } else {
          if (res.latestPass) correctTC++;
        }
      });
    });
    setFinalTestCases(`${correctTC}/${totalTC}`);

    const totalScore = computeTotalScore();
    const percent = (totalScore / maxPoints) * 100;
    setFinalTitle(percent < 60 ? "Bummer..." : "You are Awesome!");
    setFinalScoreText(`${totalScore}/${maxPoints}`);
    setFinalSpeed(formatSecondsToHMS(overallTimeSpent));

    setShowFinishModal(false);
    setShowFinalModal(true);
  };

  // ---------------------------
  // UI toggles
  // ---------------------------
  const toggleItem = (itemID) => {
    setSelectedItem(itemID);
    setExpandedItem(prev => prev === itemID ? null : itemID);
  };

  // The "active file" for code editor
  const activeFile = files.find(f => f.id === activeFileId) || {};

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <p className="text-center">Loading submission data...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="container mt-5">
        <h4 className="text-danger">{errorMsg}</h4>
        <Button variant="link" onClick={() => navigate(-1)}>
          &larr; Go Back
        </Button>
      </div>
    );
  }

  // For the read-only language dropdown icon
  const selectedLangIcon = languageIconMap[submissionLanguage] || "/src/assets/py.png";

  return (
    <>
      {/* Top Navbar */}
      <Navbar expand='lg' className='assessment-navbar-top'>
        <a href='#' onClick={() => navigate(-1)}>
          <i className='bi bi-arrow-left-circle'></i>
        </a>
        <p>Back to previous page</p>
        <div className='assessment-navbar'>
          <span className='ping'>23 ms</span>
          <a href='#'><i className='bi bi-moon'></i></a>
        </div>
      </Navbar>

      <div className="container-fluid assessment-content">
        <Row className="g-3">
          {/* LEFT COLUMN: Items */}
          <Col>
            <div className='assessment-time'>
              {/* Now we convert timeRemaining to HH:MM:SS */}
              Time Left: {formatSecondsToHMS(timeRemaining)}
            </div>
            <div className="description-item">
              {items.map((item, idx) => {
                const isOpen = expandedItem === item.itemID;
                return (
                  <div key={item.itemID}>
                    <div className="container item" onClick={() => toggleItem(item.itemID)}>
                      <h6>{`Item ${idx + 1}: ${item.itemName || "Unknown"}`}</h6>
                      <p>{(item.actItemPoints || 0)} point/s</p>
                    </div>
                    {isOpen && (
                      <div className="container item-details">
                        <h5>{item.itemName}</h5>
                        <p className="item-description">{item.itemDesc}</p>
                        <p><em>{item.itemType}</em></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Col>

          {/* Middle: Code Editor (read-only) */}
          <Col xs={7} className="col-compiler">
            <div className="compiler-container">
              <div className="compiler-header">
                  {/* <Col sm={10} className="compiler-left-corner">
                    <Tabs
                      activeKey={activeFileId}
                      id="teacher-file-tabs"
                      onSelect={(k) => setActiveFileId(Number(k))}
                    >
                      {files.map(file => (
                        <Tab
                          key={file.id}
                          eventKey={file.id}
                          title={
                            <div
                              className={`d-flex align-items-center file-tab ${
                                file.id === activeFileId ? "active-tab" : ""
                              }`}
                              style={
                                file.id === activeFileId
                                  ? { borderBottom: "2px solid #007bff" }
                                  : {}
                              }
                            >
                              <span>{`${file.fileName}.${file.extension}`}</span>
                            </div>
                          }
                        />
                      ))}
                    </Tabs>
                  </Col> */}
                  <div className='left-corner'>
                    <Tabs
                      activeKey={activeFileId}
                      id="teacher-file-tabs"
                      onSelect={(k) => setActiveFileId(Number(k))}
                    >
                      {files.map(file => (
                        <Tab
                          key={file.id}
                          eventKey={file.id}
                          title={
                            <div
                              className={`d-flex align-items-center file-tab ${
                                file.id === activeFileId ? "active-tab" : ""
                              }`}
                            >
                              <span>{`${file.fileName}.${file.extension}`}</span>
                            </div>
                          }
                        />
                      ))}
                    </Tabs>
                  </div>
                  <div className='right-corner'>
                    <DropdownButton
                      className="compiler-dropdown"
                      id="language-dropdown"
                      size="sm"
                      title={
                        <>
                          <img
                            src={selectedLangIcon}
                            style={{ width: "17px", marginRight: "8px" }}
                            alt="lang-icon"
                          />
                          {submissionLanguage || "Read-Only"}
                        </>
                      }
                      disabled
                    >
                      <Dropdown.Item>Teacher Mode</Dropdown.Item>
                    </DropdownButton>
                  </div>
                <div className="compiler-header-border"></div>
              </div>

              <div>
                <textarea
                  className="code-editor w-100"
                  value={activeFile.content || ""}
                  placeholder="Read-only code"
                  disabled
                />
              </div>

              <div className="compiler-bottom">
                {/* Disabled run/check for teacher */}
                <Button className="run" disabled>
                  <FontAwesomeIcon icon={faCirclePlay} className="run-icon" />
                  Run Code
                </Button>
                <Button className="check" disabled>
                  <FontAwesomeIcon icon={faCheck} className="check-icon" />
                  Check Code
                </Button>
              </div>
            </div>
          </Col>

          {/* RIGHT COLUMN: Test Container & Summaries */}
          <Col>
            <div className="item-navigation">
              <div>
                <p>
                  Item Navigation <i className="bi bi-info-circle"></i>
                </p>
                {items.map((it, idx) => (
                  <Button
                    key={it.itemID}
                    className={`item-button ${
                      selectedItem === it.itemID ? "active" : ""
                    }`}
                    onClick={() => toggleItem(it.itemID)}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
              <div>
                <Button className="finish" onClick={handleFinishAttempt}>
                  Finish attempt...
                </Button>

                {/* Summary Modal */}
                <Modal
                  show={showFinishModal}
                  onHide={() => setShowFinishModal(false)}
                  backdrop="static"
                  keyboard={false}
                  size="md"
                  className="activity-summary"
                >
                  <Modal.Header closeButton>
                    <Modal.Title>Activity Summary (Teacher)</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <h3>{activityName}</h3>
                    <p>
                      Total Activity Score: {computeTotalScore()}/{maxPoints}
                    </p>
                    {items.map((it, idx) => (
                      <div
                        key={it.itemID}
                        className="item-summary"
                        style={{ cursor: "pointer" }}
                      >
                        <p>{`Item ${idx + 1}: ${it.itemName}`}</p>
                        <p>
                          Score: {computeItemScore(it.itemID)}/
                          {it.actItemPoints || 0}
                        </p>
                      </div>
                    ))}
                    <div className="submit-finish">
                      <Button onClick={handleSubmitAllAndFinish}>
                        Submit all and Finish
                      </Button>
                    </div>
                  </Modal.Body>
                </Modal>

                {/* Final Result Modal */}
                <Modal
                  show={showFinalModal}
                  onHide={() => setShowFinalModal(false)}
                  backdrop="static"
                  keyboard={false}
                  size="md"
                  className="activity-score"
                >
                  <Modal.Body>
                    <Row>
                      <Col className="col-robot">
                        <div className="robot">
                          <img src="/src/assets/robot 1.png" alt="robot" />
                        </div>
                      </Col>
                      <Col className="col-activity-details">
                        <div className="activity-details">
                          <h4>{finalTitle}</h4>
                          <p>{activityName}</p>
                        </div>
                        <div className="activity-item-score">
                          <p>Test Cases</p>
                          <p>{finalTestCases}</p>
                        </div>
                        <Button onClick={() => setShowFinalModal(false)}>
                          Home
                        </Button>
                      </Col>
                    </Row>
                    <div className="activity-standing">
                      <Row className="g-0">
                        <Col className="activity-standing-button">
                          <p>Overall Score</p>
                          <button disabled>{finalScoreText}</button>
                        </Col>
                        <Col className="activity-standing-button">
                          <p>Speed</p>
                          <button disabled>{finalSpeed}</button>
                        </Col>
                      </Row>
                    </div>
                  </Modal.Body>
                </Modal>
              </div>
            </div>

            {/* Test Cases Container */}
            <div className="test-container">
              <div className="test-header">
                Tests <i className="bi bi-info-circle"></i>
              </div>
              {selectedItem &&
                items
                  .filter(it => it.itemID === selectedItem)
                  .map(it => {
                    if (!it.testCases || it.testCases.length === 0) {
                      return <p key="no-tc">No testcases found.</p>;
                    }
                    const tcr = testCaseResults[it.itemID] || {};
                    return it.testCases.map((tc, idx) => {
                      // testCaseID must match what was used in the student's final submission
                      const res = tcr[tc.testCaseID] || {
                        latestPass: null,
                        latestPoints: 0,
                        latestOutput: "",
                        bestPass: null,
                        bestPoints: 0,
                        bestOutput: ""
                      };

                      let passFail = "untested";
                      if (res.latestPass === true) passFail = "pass";
                      else if (res.latestPass === false) passFail = "fail";

                      return (
                        <div key={tc.testCaseID}>
                          <div onClick={() =>
                              setExpandedTestCases(prev => ({
                                ...prev,
                                [tc.testCaseID]: !prev[tc.testCaseID]
                              }))
                            }
                            className="test-case"
                          >
                            <Button
                              style={{
                                width: "25px",
                                height: "25px",
                                borderRadius: "50%",
                                border: "none",
                                marginRight: "10px",
                                backgroundColor:
                                  passFail === "pass" ? "green"
                                  : passFail === "fail" ? "red"
                                  : "#D9D9D9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              disabled
                            >
                              {passFail === "pass" && (
                                <FontAwesomeIcon icon={faCheck} style={{ color: "#fff" }} />
                              )}
                              {passFail === "fail" && (
                                <FontAwesomeIcon icon={faTimes} style={{ color: "#fff" }} />
                              )}
                              {passFail === "untested" && (
                                <FontAwesomeIcon icon={faQuestion} style={{ color: "#fff" }} />
                              )}
                            </Button>
                            <p>{`Test Case ${idx + 1}`}</p>
                            <i className="bi bi-play-circle" style={{ cursor: "not-allowed", marginLeft: "auto" }}></i>
                          </div>
                          {expandedTestCases[tc.testCaseID] && (
                            <div className="test-case-details mt-1">
                              {tc.isHidden ? (
                                <p>This test case is hidden</p>
                              ) : (
                                <>
                                  <p>Your Output: {res.latestOutput || "none"}</p>
                                  <p>Expected Output: {tc.expectedOutput}</p>
                                  <p>
                                    Points: {finalScorePolicy === "highest_score"
                                      ? (res.bestPoints || 0)
                                      : (res.latestPoints || 0)
                                    }/{tc.testCasePoints}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })}
              <div className="test-footer">
                <p>
                  Score: {selectedItem ? computeItemScore(selectedItem) : 0}/
                  {selectedItem
                    ? items.find(x => x.itemID === selectedItem)?.testCaseTotalPoints || 0
                    : 0}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Terminal Modal (Teacher read-only) */}
      {showTerminal && (
        <Modal
          show={showTerminal}
          onHide={() => {}}
          size="lg"
          backdrop="static"
          keyboard={false}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>NEUDev Terminal (Teacher)</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: "#1e1e1e", color: "#fff" }}>
            <div style={{ padding: "10px", fontFamily: "monospace", minHeight: "300px", overflowY: "auto" }}>
              {lines.map((line, idx) => (
                <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
                  {line}
                </div>
              ))}
              <div style={{ whiteSpace: "pre-wrap" }}>
                <span>{prompt}</span>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default TeacherReviewComponent;