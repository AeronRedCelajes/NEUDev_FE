import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import TeacherCMNavigationBarComponent from "./TeacherCMNavigationBarComponent";
import {
  // Instead of getClassStudents, we call the new function below:
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
  sumOfScores,
  sumOfMaxPoints,
  avatarUrl,
  onUnenrollClick
}) => {
  // If totalMaxPoints is 0, we avoid dividing by zero
  let scoreString = "0/0";
  if (sumOfMaxPoints > 0) {
    scoreString = `${sumOfScores}/${sumOfMaxPoints}`;
  }

  return (
    <tr>
      <td>{index}</td> {/* Numbering Column */}
      <td>
        <div className="avatar-name">
          <div className="avatar">
            <img
              src={avatarUrl || "/src/assets/profile_default.png"}
              alt="Avatar"
              className="avatar-image"
            />
          </div>
          <span className="student-name">{name}</span>
        </div>
      </td>
      <td>{studentNumber}</td>
      <td>
        {/* Show "21/60" style instead of a percentage */}
        <div className="score-circle">{scoreString}</div>
      </td>
      <td className="unenroll-cell">
        <Button variant="danger" size="sm" onClick={onUnenrollClick}>
          Unenroll
        </Button>
      </td>
    </tr>
  );
};

const ClassRecord = () => {
  const { classID } = useParams();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [sortCriteria, setSortCriteria] = useState("lastname"); 
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch data from API.
  const fetchAllData = async () => {
    if (!classID) return;

    const fetchClassInfo = async () => {
      try {
        const classInfoResponse = await getClassInfo(classID);
        if (!classInfoResponse.error) {
          setClassName(classInfoResponse.className);
        } else {
          console.error("Error fetching class info:", classInfoResponse.error);
        }
      } catch (error) {
        console.error("API Fetch Error:", error);
      }
    };

    const fetchStudentsWithScores = async () => {
      try {
        // Updated to call the new endpoint
        const response = await getClassStudentsWithOverallScores(classID);
        if (!response.error) {
          // The response is an array of students, each with
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

    fetchClassInfo();
    fetchStudentsWithScores();
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

      // Filter out the unenrolled student
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
      // Because we have firstname/lastname, we can do sorted by e.g. "lastname"
      sorted.sort((a, b) => {
        const aLast = a.lastname.toLowerCase();
        const bLast = b.lastname.toLowerCase();
        if (sortOrder === "asc") {
          return aLast.localeCompare(bLast);
        } else {
          return bLast.localeCompare(aLast);
        }
      });
    } else if (criteria === "averageScore") {
      // We'll interpret averageScore as sumOfScores
      sorted.sort((a, b) => {
        const aScore = a.sumOfScores || 0;
        const bScore = b.sumOfScores || 0;
        return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
      });
    }

    setStudents(sorted);
    setSortCriteria(criteria);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc"); // Toggle sorting order
  };

  // Export to CSV
  const exportToExcel = () => {
    // 1) Build the header row
    const headers = ["Student Name"];
    activities.forEach((act, index) => {
      headers.push(`Activity #${index + 1} Name`);
      headers.push(`Activity #${index + 1} Score`);
    });
    headers.push("Total Score", "Avg Score Percentage");

    // 2) Build CSV lines
    const csvLines = [];
    csvLines.push(headers.join(",")); // e.g. "Student Name,Activity #1 Name,Activity #1 Score,..."

    students.forEach((student) => {
      const rowData = [];
      // Student name
      rowData.push(`"${student.lastname}, ${student.firstname}"`);

      // For each activity: name + score
      activities.forEach((act, index) => {
        rowData.push(`"${act.actTitle}"`);
        const record = student.activities
          ? student.activities.find((a) => a.actID === act.actID)
          : null;
        const actualScore = record ? (record.overallScore ?? record.finalScore) : null;
        const scoreStr =
          actualScore !== null && actualScore !== undefined
            ? `${actualScore}/${act.maxPoints}`
            : "-";
        rowData.push(`"${scoreStr}"`);
      });

      // Total Score
      let totalScoreStr = "-";
      if (
        student.totalScore !== undefined &&
        student.totalMaxScore !== undefined
      ) {
        totalScoreStr = `${student.totalScore}/${student.totalMaxScore}`;
      }

      // Average Percentage
      let avgPerc = "0.00%"; // Default to "0.00%" if no score
      if (
        student.totalScore !== undefined &&
        student.totalMaxScore !== undefined &&
        student.totalMaxScore > 0
      ) {
        const percent = (student.totalScore / student.totalMaxScore) * 100;
        avgPerc = `${percent.toFixed(2)}%`;
      }

      rowData.push(`"${totalScoreStr}"`, `"${avgPerc}"`);
      csvLines.push(rowData.join(","));
    });

    // 3) Combine lines into a single CSV string, add BOM for Excel
    const csvString = "\uFEFF" + csvLines.join("\r\n");

    // 4) Create a Blob from the CSV and download it
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `${className || "class_record"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Optionally revoke the object URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <div className="leaderboard-body">
      <TeacherAMNavigationBarComponent />
      <div className="class-wrapper"></div>
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">Students in {className || "Loading..."}</h1>

          {/* Sorting Buttons */}
          <div className="sorting-buttons">
            <Button variant="primary" onClick={() => sortStudents("lastname")}>
              Sort by Last Name {sortCriteria === "lastname" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>
            <Button variant="success" className="ms-2" onClick={() => sortStudents("averageScore")}>
              Sort by Score{" "}
              {sortCriteria === "averageScore" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>
          </div>
          {loading ? (
            <p>Loading class record...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th> {/* Numbering Column Header */}
                  <th>Student Name</th>
                  <th>Student Number</th>
                  <th>Overall Score</th> {/* Now “21/60” */}
                  <th>Unenroll</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <LeaderboardItem
                      key={student.studentID}
                      index={index + 1}
                      name={`${student.lastname}, ${student.firstname}`}
                      studentNumber={student.studentNumber}
                      avatarUrl={student.profileImage}
                      sumOfScores={student.sumOfScores}
                      sumOfMaxPoints={student.sumOfMaxPoints}
                      onUnenrollClick={() => handleUnenrollClick(student)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
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
        show={showUnenrollModal}
        onHide={() => setShowUnenrollModal(false)}
        backdrop="static"
        keyboard={false}
        size="lg"
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
            {errorMessage && <p className="text-danger mt-2">{errorMessage}</p>}
            <Button variant="danger" type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Unenroll"}
            </Button>
            <Button variant="secondary" onClick={() => setShowUnenrollModal(false)}>
              Cancel
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TeacherClassManagementClassRecordComponent;