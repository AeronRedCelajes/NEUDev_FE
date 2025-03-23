import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../../style/teacher/leaderboard.css";
import StudentAMNavigationBarComponent from "../student/StudentAMNavigationBarComponent";
import { getActivityLeaderboardByTeacher } from "../api/API"; // ✅ Import API function

const StudentActivityLeaderboardComponent = () => {
  const { actID } = useParams(); // ✅ Get actID from URL
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await getActivityLeaderboardByTeacher(actID);
      if (!response.error) {
        setStudents(response);
      } else {
        console.error("❌ Error fetching leaderboard:", response.error);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="table-body">
      <StudentAMNavigationBarComponent />
      <div className="table-container">
        <div className="table-header">
          <h1 className="table-title">Leaderboard</h1>
          {loading ? (
            <p className="text-center">Loading students...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="table-column-titles">Student Name</th>
                  <th className="table-column-titles">Program</th>
                  <th className="table-column-titles">Average Score</th>
                  <th className="table-column-titles">Rank</th>
                </tr>
              </thead>
              <tbody className="table-column-students">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <LeaderboardItem
                      key={index}
                      name={student.studentName}
                      program={student.program}
                      averageScore={student.averageScore}
                      rank={student.rank}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-data">No students available</td>
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

// ✅ Updated Leaderboard Item Component
const LeaderboardItem = ({ name, program, averageScore, rank }) => {
  return (
    <tr>
      <td>
        <div className="avatar-name">
          <div className="avatar">
            <img src="src/assets/avatar.png" alt="Avatar" className="avatar-image" />
          </div>
          <span className="student-name">{name}</span>
        </div>
      </td>
      <td>{program}</td>
      <td>
        <div className="score-circle">{averageScore}</div>
      </td>
      <td>
        <div className="score-circle">{rank}</div>
      </td>
    </tr>
  );
};

export default StudentActivityLeaderboardComponent;