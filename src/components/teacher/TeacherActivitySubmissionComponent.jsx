import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import "../../style/teacher/leaderboard.css";
import { getActivitySubmissionByTeacher } from "../api/API";

// Helper function to convert seconds to HH:MM:SS format
const convertSecondsToHMS = (seconds) => {
  if (typeof seconds !== "number") return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
};

const TeacherActivitySubmissionComponent = () => {
  // Retrieve both classID and actID from the URL parameters.
  const { classID, actID } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await getActivitySubmissionByTeacher(actID);
      if (!response.error) {
        // Ensure submissions is an array.
        setSubmissions(response.submissions || []);
      } else {
        console.error("Error fetching submissions:", response.error);
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Network error:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="submission-body">
      <TeacherAMNavigationBarComponent />
      <div className="submission-container">
        <div className="submission-header">
          <h1 className="submission-title">Activity Submissions</h1>
          {loading ? (
            <p>Loading submissions...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="leaderboard-column-titles">Student Name</th>
                  <th className="leaderboard-column-titles">Program</th>
                  <th className="leaderboard-column-titles">Final Score</th>
                  <th className="leaderboard-column-titles">Time Spent</th>
                  <th className="leaderboard-column-titles">Attempts</th>
                </tr>
              </thead>
              <tbody className="leaderboard-students">
                {submissions.length > 0 ? (
                  submissions.map((submission, index) => (
                    <SubmissionItem
                      key={index}
                      submission={submission}
                      actID={actID}
                      classID={classID}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No submissions available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const SubmissionItem = ({ submission, actID, classID }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="submission-summary" onClick={toggleExpanded}>
        <td>
          <div className="avatar-name">
            <div className="avatar">
              <img
                src={
                  submission.profileImage &&
                  submission.profileImage.trim() !== ""
                    ? submission.profileImage
                    : "/src/assets/noy.png"
                }
                alt="Avatar"
                className="avatar-image"
              />
            </div>
            <span className="student-name">{submission.studentName}</span>
          </div>
        </td>
        <td>{submission.program}</td>
        <td>{submission.overallScore}</td>
        <td>{convertSecondsToHMS(submission.overallTimeSpent)}</td>
        <td>
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "Hide Attempts" : "Show Attempts"}
          </button>
        </td>
      </tr>
      {expanded && submission.attempts && (
        <tr className="submission-details">
          <td colSpan="5">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Attempt #</th>
                  <th>Score</th>
                  <th>Time Spent</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {submission.attempts.map((attempt, idx) => (
                  <tr key={idx}>
                    <td>{attempt.attemptNo}</td>
                    <td>{attempt.totalScore}</td>
                    <td>{convertSecondsToHMS(attempt.totalTimeSpent)}</td>
                    <td>
                      <button
                        className="review-btn"
                        onClick={() => {
                          // Navigate to the review page route:
                          // /teacher/class/:classID/activity/:actID/review
                          // Passing studentID and attemptNo as query parameters.
                          navigate(
                            `/teacher/class/${classID}/activity/${actID}/review?studentID=${submission.studentID}&attemptNo=${attempt.attemptNo}`
                          );
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
};

export default TeacherActivitySubmissionComponent;