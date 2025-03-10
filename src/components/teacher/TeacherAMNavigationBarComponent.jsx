import React, { useState, useEffect } from "react";
import { Dropdown, Navbar, Tab, Tabs } from "react-bootstrap";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../../style/teacher/activityItems.css";
import { getProfile, logout } from "../api/API"; // ✅ Import API function

const TeacherAMNavigationBarComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID, actID } = useParams(); // ✅ Get classID and actID from URL
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
    if (location.pathname.includes("leaderboard")) return "leaderboard";
    if (location.pathname.includes("items")) return "items";
    if (location.pathname.includes("settings")) return "settings";
    
    return "leaderboard"; // Default to leaderboard
  };

  // ✅ Navigate between activity management tabs
  const handleSelect = (key) => {
    navigate(`/teacher/class/${classID}/activity/${actID}/${key}`);
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
      {/* ✅ Back to Class Page */}
      <i className="bi bi-arrow-left-circle" onClick={() => navigate(`/teacher/class/${classID}/activity`)}></i>
      <p>Go Back</p>

      {/* ✅ Navigation Tabs */}
      <div className="navbar-center">
        <Tabs activeKey={getActiveTab()} onSelect={handleSelect} id="am-tabs" fill>
          <Tab eventKey="leaderboard" title="Leaderboard"></Tab>
          <Tab eventKey="items" title="Items"></Tab>
          <Tab eventKey="settings" title="Settings"></Tab>
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

export default TeacherAMNavigationBarComponent;