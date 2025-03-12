import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Dropdown, Nav, Card, Button, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLaptopCode, faDesktop, faBars } from '@fortawesome/free-solid-svg-icons';
import '/src/style/student/dashboard.css';

import { logout, getProfile, enrollInClass, getStudentClasses } from '../api/API.js'; // Import API functions

export const StudentDashboardComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [studentName, setStudentName] = useState("");
  const [classes, setClasses] = useState([]); // Store enrolled classes
  const [classCode, setClassCode] = useState(""); // Input for class code
  const [isJoining, setIsJoining] = useState(false); // Disable button while joining
  const [showJoinClass, setShowJoinClass] = useState(false); // Modal visibility

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // 📌 Fetch profile and enrolled classes on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const response = await getProfile();
      if (!response.error) {
        setProfileImage(response.profileImage || defaultProfileImage);
        setStudentName(`${response.firstname} ${response.lastname}`);
      } else {
        console.error("❌ Failed to fetch profile:", response.error);
      }
    };

    const fetchStudentClasses = async () => {
      const response = await getStudentClasses(); // ✅ Fetch only enrolled classes
      console.log("📥 Fetched Enrolled Classes:", response);
      if (!response.error) {
        // Filter only classes with activeClass set to true (or 1 or "1")
        const activeClasses = response.filter(cls =>
          cls.activeClass === true || cls.activeClass === 1 || cls.activeClass === "1"
        );
        setClasses(activeClasses);
      } else {
        console.error("❌ Failed to fetch enrolled classes:", response.error);
      }
    };

    fetchProfile();
    fetchStudentClasses();
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
      alert("✅ Logout successful");
      window.location.href = "/home";
    } else {
      alert("❌ Logout failed. Try again.");
    }
  };

  // 📌 Function to join a class
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) {
      alert("⚠️ Please enter a valid class code.");
      return;
    }

    setIsJoining(true);
    const response = await enrollInClass(classCode);

    if (response.error) {
      alert(`❌ Failed to join class: ${response.error}`);
    } else {
      alert("✅ Successfully joined the class!");
      setShowJoinClass(false);
      setClassCode("");

      // ✅ Re-fetch classes after joining and filter for active classes
      const classesResponse = await getStudentClasses();
      if (!classesResponse.error) {
        const activeClasses = classesResponse.filter(cls =>
          cls.activeClass === true || cls.activeClass === 1 || cls.activeClass === "1"
        );
        setClasses(activeClasses);
      }
    }

    setIsJoining(false);
  };

  return (
    <div className='dashboard'>
      {/* 📌 Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <Nav className='flex-column sidebar-content'>
          <Nav.Item className='nav-item active'>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> My Classes
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className='nav-item' onClick={() => navigate('/student/sandbox')}>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Sandbox
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* 📌 Dashboard Content */}
      <div className={`dashboard-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar expand='lg' fixed='top' className='navbar-top'>
          <Button variant='transparent' className='toggle-btn' onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </Button>

          <div className='dashboard-navbar'>
            <span className='ping'>20 ms</span>
            <a href='#'><i className='bi bi-moon'></i></a>
            <span className='student-badge'>Student</span>
            <Dropdown align='end'>
              <Dropdown.Toggle variant='transparent' className='profile-dropdown'>
                <img src={profileImage} className='profile-image' alt="Profile" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => navigate('/student/profile')}>Profile Account</Dropdown.Item>
                <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Navbar>

        <div className='container-fluid'>
          <h4>Enrolled Classes</h4>

          <div className='container classes-container'>
            {/* ✅ Dynamically Render Enrolled Classes */}
            {classes.length > 0 ? (
              classes.map((classItem, index) => (
                <Card className='class-card' key={index}
                  onClick={() => {
                    sessionStorage.setItem("selectedClassID", classItem.classID);
                    navigate(`/student/class/${classItem.classID}/activity`);
                  }}
                  style={{ cursor: 'pointer' }}>
                   <Card.Img variant='top' src={classItem.classCoverImage || '/src/assets/univ.png'} />
                  <Card.Body>
                    <Card.Text>
                      <strong><h6>{classItem.className}</h6></strong>
                      <strong>Section:</strong> {classItem.classSection} <br />
                      <strong>Teacher:</strong> {classItem.teacherName}
                    </Card.Text>
                  </Card.Body>
                </Card>
              ))
            ) : (
              <div className="no-classes-container">
                <p>No enrolled classes yet.</p>
                <Button variant='transparent' className='join-class' onClick={() => setShowJoinClass(true)}>
                  + Join a Class
                </Button>
              </div>
            )}

            {classes.length > 0 && (
              <Button variant='transparent' className='join-class' onClick={() => setShowJoinClass(true)}>
                + Join a Class
              </Button>
            )}
          </div>
        </div>

        {/* Join Class Modal */}
        <Modal show={showJoinClass} onHide={() => setShowJoinClass(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header className='modal-class-header' closeButton>Join Class</Modal.Header>
          <Modal.Body className='modal-class-body'>
            <p>Enter the class code given to you by your teacher.</p>
            <Form onSubmit={handleJoinClass}>
              <Form.Group controlId='formClassCode'>
                <Form.Control 
                  type='text' 
                  placeholder='ex. 123456' 
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  required
                />
              </Form.Group>
              <Button className="mt-3" type="submit" disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Class"}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};
