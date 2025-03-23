import React, { useState, useEffect } from "react";
import { Dropdown, Navbar, Tab, Tabs } from "react-bootstrap";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../../style/teacher/cmNavigationBar.css"; // ✅ Adjusted path for student styles
import { getProfile, logout} from "../api/API"; // ✅ Import API function

const StudentCMNavigationBarComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams(); // ✅ Get classID from URL
  const [profileImage, setProfileImage] = useState("/src/assets/profile_default.png"); // Default profile image

  // ✅ Fetch student profile image on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const response = await getProfile();
    if (!response.error) {
      setProfileImage(response.profileImage || "/src/assets/profile_default.png");
    }
  };

  // ✅ Determine active tab based on the URL
  const getActiveTab = () => {
    if (location.pathname.includes("activity")) return "activity";
    if (location.pathname.includes("student-bulletin")) return "student-bulletin";
    return "activities"; // Default to activities
  };

  // ✅ Handle tab navigation
  const handleSelect = (key) => {
    navigate(`/student/class/${classID}/${key}`);
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
    <>
      <Navbar className="class-navbar-top">
        {/* ✅ Back to Class List */}
        <i className="bi bi-arrow-left-circle" onClick={() => navigate("/student/dashboard")}></i>
        <p>Dashboard</p>

        {/* ✅ Profile & Logout */}
        <div className="dashboard-navbar">
          <span className="ping">20 ms</span>
          <a href="#"><i className="bi bi-moon"></i></a>
          <span className="student-badge">Student</span>
          <Dropdown align="end">
            <Dropdown.Toggle variant="transparent" className="profile-dropdown">
              <img src={profileImage} className="profile-image" alt="Profile" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => navigate("/student/profile")}>Profile</Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Navbar>
      
      {/* ✅ Navigation Tabs */}
      <div className="navbar-center">
        <Tabs activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs" fill>
          <Tab eventKey="activity" title="Activities"></Tab>
          <Tab eventKey="student-bulletin" title="Bulletin"></Tab>
        </Tabs>
      </div>
    </>
  );
};

export default StudentCMNavigationBarComponent;