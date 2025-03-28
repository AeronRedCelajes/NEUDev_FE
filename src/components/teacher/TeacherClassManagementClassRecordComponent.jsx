import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import TeacherCMNavigationBarComponent from "./TeacherCMNavigationBarComponent";
import {
  getClassRecord,
  getClassInfo,
  getClassActivities
} from "../api/API";
import "../../style/teacher/leaderboard.css";
import { Button } from "react-bootstrap";

const TeacherClassManagementClassRecordComponent = () => {
  const { classID } = useParams();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCriteria, setSortCriteria] = useState("lastname"); 
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch data from API.
  const fetchAllData = async () => {
    if (!classID) return;
    setLoading(true);
    try {
      // 1) Get class info.
      const classInfoResponse = await getClassInfo(classID);
      if (!classInfoResponse.error) {
        setClassName(classInfoResponse.className);
      } else {
        console.error("Error fetching class info:", classInfoResponse.error);
      }
  
      // 2) Get dynamic activities for the class.
      const activitiesResponse = await getClassActivities(classID);
      let activitiesArray = [];
      if (Array.isArray(activitiesResponse)) {
        activitiesArray = activitiesResponse;
      } else if (
        activitiesResponse && 
        typeof activitiesResponse === "object" &&
        ("ongoing" in activitiesResponse || "completed" in activitiesResponse)
      ) {
        // Combine ongoing and completed activities.
        activitiesArray = [
          ...(activitiesResponse.ongoing || []),
          ...(activitiesResponse.completed || [])
        ];
      } else {
        console.error("Unexpected activities response format:", activitiesResponse);
      }
      setActivities(activitiesArray);
  
      // 3) Get the class record (students with pivot data).
      const studentsResponse = await getClassRecord(classID);
      if (!studentsResponse.error) {
        setStudents(studentsResponse);
      } else {
        console.error("Error fetching class record:", studentsResponse.error);
      }
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [classID]);

  // Sorting function: sort by lastname or total score.
  const sortStudents = (criteria) => {
    const sorted = [...students];
    if (criteria === "lastname") {
      sorted.sort((a, b) => {
        const aLast = a.lastname.toLowerCase();
        const bLast = b.lastname.toLowerCase();
        return sortOrder === "asc"
          ? aLast.localeCompare(bLast)
          : bLast.localeCompare(aLast);
      });
    } else if (criteria === "averageScore") {
      sorted.sort((a, b) => {
        const aScore = a.totalScore || 0;
        const bScore = b.totalScore || 0;
        return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
      });
    }
    setStudents(sorted);
    setSortCriteria(criteria);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
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
    <div className="table-body">
      <TeacherCMNavigationBarComponent />
      <div className="table-record-container">
        <div className="table-header">
          <h1 className="table-title">
            Class Record for {className || "Loading..."}
          </h1>

          <div className='sort-section mb-3'>
            <Button variant="link" onClick={exportToExcel}>
              Export to Excel
            </Button>

            <Button variant="link" onClick={() => sortStudents("lastname")}>
              Sort by Last Name{" "}
              {sortCriteria === "lastname" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>

            <i className="bi bi-arrow-clockwise" onClick={fetchAllData}></i>
          </div>

          {loading ? (
            <p className="text-center">Loading class record...</p>
          ) : (
            <div className="horizontal-scrollbar">
              <table className="table-content">
                <thead>
                  <tr>
                    <th className="table-column-titles">#</th>
                    <th className="table-column-titles">Student Name</th>
                    <th className="table-column-titles">Item Name</th>
                    <th className="table-column-titles">Item Score</th>
                    <th className="table-column-titles">Total Score</th>
                    <th className="table-column-titles">Avg Score Percentage</th>
                  </tr>
                </thead>
                <tbody className="table-column-students">
                  {students.length > 0 ? (
                    students.map((student, index) => {
                      // e.g. 19/30
                      let totalScoreStr = "-";
                      if (
                        student.totalScore !== undefined &&
                        student.totalMaxScore !== undefined
                      ) {
                        totalScoreStr = `${student.totalScore}/${student.totalMaxScore}`;
                      }

                      // e.g. 63.33%
                      let avgPerc = "0.00%";
                      if (
                        student.totalScore !== undefined &&
                        student.totalMaxScore !== undefined &&
                        student.totalMaxScore > 0
                      ) {
                        const percent = (student.totalScore / student.totalMaxScore) * 100;
                        avgPerc = `${percent.toFixed(2)}%`;
                      }

                      return (
                        <tr key={student.studentID}>
                          <td data-label="#"> {index + 1} </td>
                          <td data-label="Student Name:">
                            <div className="avatar">
                              <img src={student.profileImage || "/src/assets/profile_default.png"} alt="Avatar" className="avatar-image" />
                              <span className="student-name">{student.lastname}, {student.firstname}</span>
                            </div>
                          </td>
                          {/* Merge all activities inside a single column */}
                          <td className="item-border" data-label="Item Name:">
                            {activities.map((act) => {
                              return (
                                <div className="item-block" key={act.actID}>
                                  <span>{act.actTitle}</span>
                                </div>
                              );
                            })}
                          </td>
                          {/* Merge all scores inside a single column */}
                          <td className="item-border" data-label="Item Score:">
                            {activities.map((act, actIndex) => {
                              const record = student.activities
                                ? student.activities.find((a) => a.actID === act.actID)
                                : null;
                              const actualScore = record
                                ? record.overallScore ?? record.finalScore
                                : null;
                              const scoreStr =
                                actualScore !== null && actualScore !== undefined
                                  ? `${actualScore}/${act.maxPoints}`
                                  : "-";

                              return (
                                <div className="item-block" key={act.actID}>
                                  <span>{scoreStr}</span>
                                </div>
                              );
                            })}
                          </td>
                          <td data-label="Total Score:">{totalScoreStr}</td>
                          <td data-label="Avg. Score Percentage:">{avgPerc}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={activities.length * 2 + 2}
                        style={{ textAlign: "center" }}
                      >
                        No students enrolled in this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherClassManagementClassRecordComponent;