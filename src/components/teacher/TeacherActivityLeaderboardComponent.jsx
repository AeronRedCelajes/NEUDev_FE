import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../../style/teacher/leaderboard.css";
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import { getActivityLeaderboardByTeacher } from "../api/API";

// Helper function to convert seconds to HH:MM:SS format
const convertSecondsToHMS = (seconds) => {
  if (typeof seconds !== "number") return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map(unit => String(unit).padStart(2, "0"))
    .join(":");
};

const TeacherActivityLeaderboardComponent = () => {
  const { actID } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the leaderboard
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await getActivityLeaderboardByTeacher(actID);
      if (!response.error) {
        setLeaderboard(response.leaderboard);
      } else {
        console.error("❌ Error fetching leaderboard:", response.error);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
    } finally {
      setLoading(false);
    }
  };

  // On mount or when actID changes
  useEffect(() => {
    fetchLeaderboard();
  }, [actID]);

  return (
    <div className="table-body">
      <TeacherAMNavigationBarComponent />
      <div className="table-container">
        <h1 className="table-title">Leaderboard <i className="bi bi-arrow-clockwise" onClick={fetchLeaderboard}></i></h1>

          {loading ? (
            <p>Loading students...</p>
          ) : (
            <table className="table-content">
              <thead>
                <tr>
                  <th className="table-column-titles">Student Name</th>
                  <th className="table-column-titles">Program</th>
                  <th className="table-column-titles">Score</th>
                  <th className="table-column-titles">Time Spent</th>
                  <th className="table-column-titles">Rank</th>
                </tr>
              </thead>
              <tbody className="table-column-students">
                {leaderboard.length > 0 ? (
                  leaderboard.map((student, index) => (
                    <LeaderboardItem
                      key={index}
                      name={student.studentName}
                      program={student.program}
                      score={student.score}
                      timeSpent={convertSecondsToHMS(student.timeSpent)}
                      rank={student.rank}
                      profileImage={student.profileImage}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No students attempted yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
  );
};

const LeaderboardItem = ({ name, program, score, timeSpent, rank, profileImage }) => {
  const defaultProfileImage = "/src/assets/noy.png";
  const imageToShow =
    profileImage && profileImage.trim() !== "" ? profileImage : defaultProfileImage;

  return (
    <tr>
      <td>
        <div className="avatar">
          <img src={imageToShow} alt="Avatar" className="avatar-image" />
          <span className="student-name">{name}</span>
        </div>
      </td>
      <td>{program}</td>
      <td>
        <div className="score-circle">{score}</div>
      </td>
      <td>{timeSpent}</td>
      <td>
        <div className="score-circle">{rank}</div>
      </td>
    </tr>
  );
};

export default TeacherActivityLeaderboardComponent;