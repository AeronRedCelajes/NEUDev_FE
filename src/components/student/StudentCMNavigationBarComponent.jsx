import React, { useState, useEffect } from "react";
import { Dropdown, Navbar, Tab, Tabs, Nav, Button, Badge } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faLaptopCode, faBars, faBell, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../../style/teacher/cmNavigationBar.css";
import { getProfile, logout, getStudentClasses, markNotificationAsRead, deleteNotification, getNotifications } from "../api/API"; // ✅ Import API function

const StudentCMNavigationBarComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams(); // ✅ Get classID from URL

  const defaultProfileImage = '/src/assets/default.png';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [studentName, setStudentName] = useState("");
  const [classes, setClasses] = useState([]);

  // [CHANGED] State for notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false); // controls dropdown visibility

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);


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
      {/* <Navbar className="class-navbar-top">
        <i className="bi bi-arrow-left-circle" onClick={() => navigate("/student/dashboard")}></i>
        <p>Dashboard</p>

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
      
      <div className="navbar-center">
        <Tabs activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs" fill>
          <Tab eventKey="activity" title="Activities"></Tab>
          <Tab eventKey="student-bulletin" title="Bulletin"></Tab>
        </Tabs>
      </div> */}

<div className='class-navbar'>
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <Nav className='flex-column sidebar-content' activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs">
            <Nav.Item className={`nav-item ${getActiveTab() === "dashboard" ? "active" : ""}`} onClick={() => navigate("/student/dashboard")}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> Dashboard
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "activity" ? "active" : ""}`} onClick={() => navigate(`/student/class/${classID}/activity`)}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Activities
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "student-bulletin" ? "active" : ""}`} onClick={() => navigate(`/student/class/${classID}/student-bulletin`)}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Bulletin
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

        <div>
          <Navbar expand='lg' fixed='top' className='navbar-top'>
            <Button variant='transparent' className='toggle-btn' onClick={toggleSidebar}>
              <FontAwesomeIcon icon={faBars} />
            </Button>
            <div className='dashboard-navbar'>
              <span className='ping'>20 ms</span>
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
                  <div className='notification-dropdown'>
                    <div>
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
                <Dropdown.Toggle variant='transparent' className='dropdown-desgin'>
                  <img src={profileImage} className='profile-image' alt="Profile" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate('/student/profile')}>Profile Account</Dropdown.Item>
                  <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Navbar>
        </div>
      </div>
    </>
  );
};

export default StudentCMNavigationBarComponent;