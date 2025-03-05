import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../../style/teacher/leaderboard.css";
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import { getActivityLeaderboardByTeacher } from "../api/API"; // ✅ Import API function

const TeacherActivityLeaderboardComponent = () => {
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
    <div className="leaderboard-body">
      <TeacherAMNavigationBarComponent />
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">Leaderboard</h1>
          {loading ? (
            <p>Loading students...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="leaderboard-column-titles">Student Name</th>
                  <th className="leaderboard-column-titles">Program</th>
                  <th className="leaderboard-column-titles">Score</th>
                  <th className="leaderboard-column-titles">Rank</th>
                </tr>
              </thead>
              <tbody className="leaderboard-students">
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

export default TeacherActivityLeaderboardComponent;