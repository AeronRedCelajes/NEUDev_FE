import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Dropdown, Nav, Card, Button, Modal, Form, Badge } from 'react-bootstrap'; // [CHANGED]
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLaptopCode, faDesktop, faBars, faBell, faTimes } from '@fortawesome/free-solid-svg-icons'; // [CHANGED]
import '/src/style/student/dashboard.css';

import {
  logout,
  getProfile,
  enrollInClass,
  getStudentClasses,
  getSessionData,
  setSessionData,
  // [CHANGED] Import notification functions
  getNotifications,
  markNotificationAsRead,
  deleteNotification
} from '../api/API.js';

export const StudentDashboardComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [studentName, setStudentName] = useState("");
  const [classes, setClasses] = useState([]); 
  const [classCode, setClassCode] = useState(""); 
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinClass, setShowJoinClass] = useState(false);

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // [CHANGED] State for notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false); // controls dropdown visibility

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
      const response = await getStudentClasses();
      console.log("📥 Fetched Enrolled Classes:", response);
      if (!response.error) {
        const activeClasses = response.filter(cls =>
          cls.activeClass === true || cls.activeClass === 1 || cls.activeClass === "1"
        );
        setClasses(activeClasses);
      } else {
        console.error("❌ Failed to fetch enrolled classes:", response.error);
      }
    };

    // Fetch notifications on mount
    const fetchUserNotifications = async () => {
      const resp = await getNotifications();
      if (!resp.error && Array.isArray(resp)) {
        // Store all notifications in state
        setNotifications(resp);
        // Count unread by checking isRead === false
        const unread = resp.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    };

    fetchProfile();
    fetchStudentClasses();
    fetchUserNotifications();

    // POLLING: setInterval to fetch notifications every 10 seconds
    const interval = setInterval(() => {
      fetchUserNotifications();
    }, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);


// THIS IS THE FUNCTION IF YOU WANT TO MAKE ALL NOTIF TO BE CONSIDERED ALL READ
//   const handleBellClick = async () => {
//     setShowNotifications(!showNotifications);
//     if (!showNotifications && unreadCount > 0) {
//       // Mark all unread notifications as read
//       for (let n of notifications) {
//         if (!n.isRead) {
//           await markNotificationAsRead(n.id);
//         }
//       }
//       const resp = await getNotifications();
//       if (!resp.error && Array.isArray(resp)) {
//         setNotifications(resp);
//       }
//       setUnreadCount(0);
//     }
//   };

  // THIS IS THE FUNCTION TO JUST SIMPLY SHOW THE NOTIFICATION WITHOUT MAKING THEM AS READ
  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };


  /**
   * Mark a single notification as read, then update state.
   */
  const handleNotificationClick = async (notificationId) => {
    // Mark as read on the server
    await markNotificationAsRead(notificationId);

    // Update local state to set isRead = true
    const updatedList = notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotifications(updatedList);

    // Recalculate how many are unread
    const newUnreadCount = updatedList.filter(n => !n.isRead).length;
    setUnreadCount(newUnreadCount);

    // (Optional) If you want to do something else, like navigate somewhere:
    // navigate('/some-other-page');
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
      {/* Sidebar */}
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

      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <div className={`dashboard-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar expand='lg' fixed='top' className='navbar-top'>
          <Button variant='transparent' className='toggle-btn' onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </Button>

          <div className='dashboard-navbar'>
            <span className='ping'>20 ms</span>
            <a href='#'><i className='bi bi-moon'></i></a>
            <span className='student-badge'>Student</span>

            {/* [CHANGED] Notification Bell */}
            <div className='notification-bell'>
              <FontAwesomeIcon
                icon={faBell}
                size='lg'
                style={{ cursor: 'pointer' }}
                onClick={handleBellClick}
              />
              {unreadCount > 0 && (
                <Badge bg='danger' pill className='notification-badge'>
                  {unreadCount}
                </Badge>
              )}
              {/* Dropdown Panel */}
              {showNotifications && (
                <div className='notification-dropdown' >
                <div style={{  }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '10px' }}>No Notifications</div>
                  ) : (
                    notifications.map((notif) => {
                      // Parse notif.data from string to object
                      const parsedData = JSON.parse(notif.data || '{}');

                      // [CHANGED] A function to handle deleting the notification
                      const handleDelete = async (e) => {
                        e.stopPropagation(); // prevent parent onClick from firing
                        const resp = await deleteNotification(notif.id);
                        if (!resp.error) {
                          // Remove this notification from state
                          const updatedList = notifications.filter(n => n.id !== notif.id);
                          setNotifications(updatedList);

                          // Recount unread
                          const unread = updatedList.filter(n => !n.read_at).length;
                          setUnreadCount(unread);
                        } else {
                          console.error('Failed to delete notification:', resp.error);
                        }
                      };

                      return (
                        <div
                          key={notif.id}
                          className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                          onClick={() => handleNotificationClick(notif.id)}
                        >
                          <div>
                            <div><strong>{notif.type}</strong></div>
                            <div>{parsedData.message}</div>
                            <small className={`notification-item-dt ${notif.isRead ? 'read' : 'unread'}`}>
                              {new Date(notif.created_at).toLocaleString()}
                            </small>
                          </div>

                          {/* [CHANGED] Delete (X) icon/button */}
                          <div onClick={handleDelete} style={{ marginLeft: '8px', cursor: 'pointer' }}>
                            <FontAwesomeIcon icon={faTimes} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                </div>
              )}
            </div>
            {/* END Notification Bell */}

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
            {classes.length > 0 ? (
              classes.map((classItem, index) => (
                <Card className='class-card' key={index}
                  onClick={() => {
                    const sessionData = getSessionData();
                    sessionData.selectedClassID = classItem.classID;
                    setSessionData(sessionData);
                    navigate(`/student/class/${classItem.classID}/activity`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
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