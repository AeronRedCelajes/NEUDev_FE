import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../../style/teacher/leaderboard.css";
import TeacherAMNavigationBarComponent from "./TeacherAMNavigationBarComponent";
import { getActivityLeaderboardByTeacher } from "../api/API";

const TeacherActivityLeaderboardComponent = () => {
  const { actID } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await getActivityLeaderboardByTeacher(actID);
      if (!response.error) {
        // Expecting each item to include:
        // { studentName, program, score, timeSpent, rank, profileImage }
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
                  <th className="leaderboard-column-titles">Time Spent</th>
                  <th className="leaderboard-column-titles">Rank</th>
                </tr>
              </thead>
              <tbody className="leaderboard-students">
                {leaderboard.length > 0 ? (
                  leaderboard.map((student, index) => (
                    <LeaderboardItem
                      key={index}
                      name={student.studentName}
                      program={student.program}
                      score={student.score}
                      timeSpent={student.timeSpent}
                      rank={student.rank}
                      profileImage={student.profileImage}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No students available
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

const LeaderboardItem = ({ name, program, score, timeSpent, rank, profileImage }) => {
  // Use the profile image from the student if provided; otherwise, fall back to the default.
  const defaultProfileImage = "/src/assets/noy.png";
  const imageToShow = profileImage && profileImage.trim() !== "" ? profileImage : defaultProfileImage;

  return (
    <tr>
      <td>
        <div className="avatar-name">
          <div className="avatar">
            <img
              src={imageToShow}
              alt="Avatar"
              className="avatar-image"
            />
          </div>
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