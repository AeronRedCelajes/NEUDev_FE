import React, { useState, useEffect } from "react";
import { Dropdown, Navbar, Tab, Tabs } from "react-bootstrap";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../../style/teacher/cmNavigationBar.css";
import { getProfile, logout } from "../api/API"; // ✅ Import API function

const TeacherCMNavigationBarComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams(); // ✅ Get classID from URL
  const [profileImage, setProfileImage] = useState("/src/assets/noy.png"); // Default image

  // ✅ Fetch teacher's profile image on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const response = await getProfile();
    if (!response.error) {
      setProfileImage(response.profileImage || "/src/assets/noy.png");
    }
  };

  // ✅ Determine active tab based on current pathname
  const getActiveTab = () => {
    if (location.pathname.includes("activity")) return "activity";
    if (location.pathname.includes("classrecord")) return "classrecord";
    if (location.pathname.includes("class-participants")) return "class-participants";
    if (location.pathname.includes("teacher-bulletin")) return "teacher-bulletin";
    return "activities"; // Default to activities
  };

  // ✅ Navigate between class management tabs
  const handleSelect = (key) => {
    navigate(`/teacher/class/${classID}/${key}`);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
        alert("✅ Logout successful");
        window.location.href = "/home";
    } else {
        alert("❌ Logout failed. Try again.");
    }
  };

  return (
    <Navbar expand="lg" className="class-navbar-top">
    <i
      className="bi bi-arrow-left-circle"
      onClick={() => {
        if (location.pathname.includes("create-activity")) {
          navigate(`/teacher/class/${classID}/activity`); // Back to Class Management
        } else {
          navigate("/teacher/dashboard"); // Back to Dashboard
        }
      }}
    ></i>
    <p>{location.pathname.includes("create-activity") ? "Back" : "Dashboard"}</p>

      {/* ✅ Navigation Tabs */}
      <div className="navbar-center">
        <Tabs activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs" fill>
          <Tab eventKey="activity" title="Activities"></Tab>
          <Tab eventKey="class-participants" title="Class Participants"></Tab>
          <Tab eventKey="classrecord" title="Class Record"></Tab>
          <Tab eventKey="teacher-bulletin" title="Bulletin"></Tab>
        </Tabs>
      </div>

      {/* ✅ Profile & Logout */}
      <div className="dashboard-navbar">
        <span className="ping">20 ms</span>
        <a href="#"><i className="bi bi-moon"></i></a>
        <span className="student-badge">Teacher</span>
        <Dropdown align="end">
          <Dropdown.Toggle variant="transparent" className="profile-dropdown">
            <img src={profileImage} className="profile-image" alt="Profile" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => navigate("/teacher/profile")}>Profile</Dropdown.Item>
            <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </Navbar>
  );
};

export default TeacherCMNavigationBarComponent;