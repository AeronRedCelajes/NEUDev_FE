import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import TeacherCMNavigationBarComponent from "./TeacherCMNavigationBarComponent";
import {
  getClassStudentsWithOverallScores,
  getClassInfo,
  unenrollStudent,
  verifyPassword,
  getSessionData
} from "../api/API";
import "../../style/teacher/leaderboard.css";
import { Modal, Button, Form } from "react-bootstrap";

const LeaderboardItem = ({
  index,
  name,
  studentNumber,
  avatarUrl,
  onUnenrollClick
}) => {
  return (
    <tr>
      <td>{index}</td> {/* Numbering Column */}
      <td>
        <div className="avatar">
          <img src={avatarUrl || "/src/assets/profile_default.png"} alt="Avatar" className="avatar-image" />
          <span className="student-name">{name}</span>
        </div>
      </td>
      <td>{studentNumber}</td>
      <td className="unenroll-cell">
        <Button variant="danger" onClick={onUnenrollClick}>
          Unenroll
        </Button>
      </td>
    </tr>
  );
};

const TeacherClassManagementClassParticipantsComponent = () => {
  const { classID } = useParams();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [sortCriteria, setSortCriteria] = useState("lastname"); 
  const [sortOrder, setSortOrder] = useState("asc");

  /**
   * Fetch all data needed for this component (class info + students).
   */
  const fetchAllData = async () => {
    if (!classID) return;
    setLoading(true);
    try {
      // 1) Fetch class info
      const classInfoResponse = await getClassInfo(classID);
      if (!classInfoResponse.error) {
        setClassName(classInfoResponse.className);
      } else {
        console.error("Error fetching class info:", classInfoResponse.error);
      }

      // 2) Fetch students with overall scores
      const response = await getClassStudentsWithOverallScores(classID);
      if (!response.error) {
        // Expected response is an array of students with fields:
        // { studentID, firstname, lastname, studentNumber, profileImage, sumOfScores, sumOfMaxPoints }
        setStudents(response);
      } else {
        console.error("Error fetching students:", response.error);
      }
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * On mount or when classID changes, fetch data.
   */
  useEffect(() => {
    fetchAllData();
  }, [classID]);

  // Called when user clicks "Unenroll"
  const handleUnenrollClick = (student) => {
    setSelectedStudent(student);
    setShowUnenrollModal(true);
    setPassword("");
    setErrorMessage("");
  };

  const handleConfirmUnenroll = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!password) {
      setErrorMessage("Please enter your password.");
      setIsProcessing(false);
      return;
    }

    try {
      const sessionData = getSessionData();
      const teacherEmail = sessionData.email;
      if (!teacherEmail) {
        setErrorMessage("No teacher email found. Please log in again.");
        setIsProcessing(false);
        return;
      }

      const verifyResponse = await verifyPassword(teacherEmail, password);
      if (verifyResponse.error) {
        setErrorMessage("Incorrect password. Please try again.");
        setIsProcessing(false);
        return;
      }

      const unenrollResponse = await unenrollStudent(classID, selectedStudent.studentID);
      if (unenrollResponse.error) {
        setErrorMessage(unenrollResponse.error);
        setIsProcessing(false);
        return;
      }

      // Filter out the unenrolled student.
      setStudents(students.filter((s) => s.studentID !== selectedStudent.studentID));
      setShowUnenrollModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Unenroll Error:", error);
      setErrorMessage("An error occurred while unenrolling the student.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sorting
  const sortStudents = (criteria) => {
    let sorted = [...students];

    if (criteria === "lastname") {
      sorted.sort((a, b) => {
        const aLast = a.lastname.toLowerCase();
        const bLast = b.lastname.toLowerCase();
        return sortOrder === "asc" ? aLast.localeCompare(bLast) : bLast.localeCompare(aLast);
      });
    } else if (criteria === "averageScore") {
      // Interpreting averageScore as sumOfScores.
      sorted.sort((a, b) => {
        const aScore = a.sumOfScores || 0;
        const bScore = b.sumOfScores || 0;
        return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
      });
    }

    setStudents(sorted);
    setSortCriteria(criteria);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div className="table-body">
      <TeacherCMNavigationBarComponent />
      <div className="table-container">
        <div className="table-header">
          <h1 className="table-title">
            Students in {className || "Loading..."}
          </h1>

          {/* Add a Refresh button here */}
          <div className='sort-section mb-3'>
            <Button variant="link" onClick={() => sortStudents("lastname")}>
              Sort by Last Name{" "}
              {sortCriteria === "lastname" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>

            <i className="bi bi-arrow-clockwise" onClick={fetchAllData}></i>
          </div>

          {loading ? (
            <p className="text-center">Loading students...</p>
          ) : (
            <table className="table-content">
              <thead>
                <tr>
                  <th className="table-column-titles">#</th> {/* Numbering Column */}
                  <th className="table-column-titles">Student Name</th>
                  <th className="table-column-titles">Student Number</th>
                  <th className="table-column-titles">Unenroll</th>
                </tr>
              </thead>
              <tbody className="table-column-students">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <LeaderboardItem
                      key={student.studentID}
                      index={index + 1}
                      name={`${student.lastname}, ${student.firstname}`}
                      studentNumber={student.studentNumber}
                      avatarUrl={student.profileImage}
                      onUnenrollClick={() => handleUnenrollClick(student)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No students enrolled in this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Unenroll Confirmation Modal */}
      <Modal
        className="modal-design"
        show={showUnenrollModal}
        onHide={() => setShowUnenrollModal(false)}
        backdrop="static"
        keyboard={false}
        size="md"
      >
        <Modal.Header closeButton>
          <Modal.Title>Unenroll Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to unenroll{" "}
            <strong>
              {selectedStudent?.firstname} {selectedStudent?.lastname}
            </strong>
            ?
          </p>
          <Form onSubmit={handleConfirmUnenroll}>
            <Form.Group>
              <Form.Label>Enter your password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            
        <Modal.Footer>
          {errorMessage && <p className="text-danger mt-2">{errorMessage}</p>}
          <Button variant="danger" type="submit" disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Unenroll"}
          </Button>
          <Button variant="secondary" onClick={() => setShowUnenrollModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
        </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TeacherClassManagementClassParticipantsComponent;