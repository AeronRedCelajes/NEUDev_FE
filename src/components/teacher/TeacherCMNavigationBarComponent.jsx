import React, { useState, useEffect } from "react";
import { Dropdown, Navbar, Tab, Tabs, Nav, Button, Badge } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faLaptopCode, faBars, faBell, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../../style/teacher/cmNavigationBar.css";
import { getProfile, logout, markNotificationAsRead, deleteNotification } from "../api/API"; // ✅ Import API function
import { useAlert } from "../AlertContext"; 

const TeacherCMNavigationBarComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams(); // ✅ Get classID from URL
  const [profileImage, setProfileImage] = useState("/src/assets/noy.png"); // Default image
  const { openAlert } = useAlert();
  //Notification
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
        //alert("✅ Logout successful");
        openAlert({
          message: "Logout successful",
          imageUrl: "/src/assets/profile_default2.png",
          autoCloseDelay: 2000,
          onAfterClose: () => { window.location.href = "/home";
          },
        });
       
      } else {
        //alert("❌ Logout failed. Try again.");
        openAlert({
          message: "Logout failed. Try again.",
          imageUrl: "/src/assets/profile_default2.png",
          autoCloseDelay: 3000,
          onAfterClose: () => {
          },
        });
      }
    };

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

  /**
   * Delete a notification entirely.
   */
  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // prevent parent onClick from firing
    const resp = await deleteNotification(notificationId);
    if (!resp.error) {
      // Remove from local state
      const updatedList = notifications.filter(n => n.id !== notificationId);
      setNotifications(updatedList);

      // Recalculate unread
      const newUnreadCount = updatedList.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
    } else {
      console.error('Failed to delete notification:', resp.error);
    }
  };

  return (
    <>
      {/* <Navbar className="class-navbar-top">
        <div className="navbar-left">
          <i className="bi bi-arrow-left-circle" onClick={() => {
              if (location.pathname.includes("create-activity")) {
                navigate(`/teacher/class/${classID}/activity`); // Back to Class Management
              } else {
                navigate("/teacher/dashboard"); // Back to Dashboard
              }
            }}
          ></i>
          <p>{location.pathname.includes("create-activity") ? "Back" : "Dashboard"}</p>
        </div>

        <div className="dashboard-navbar">
          <span className="ping">20 ms</span>
          <span className="student-badge">Teacher</span>
          <Dropdown align="end">
            <Dropdown.Toggle variant="transparent" className="dropdown-desgin">
              <img src={profileImage} className="profile-image" alt="Profile" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => navigate("/teacher/profile")}>Profile</Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Navbar>
        
      <div className="navbar-center">
        <Tabs activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs" fill>
          <Tab eventKey="activity" title="Activities"></Tab>
          <Tab eventKey="class-participants" title="Class Participants"></Tab>
          <Tab eventKey="classrecord" title="Class Record"></Tab>
          <Tab eventKey="teacher-bulletin" title="Bulletin"></Tab>
        </Tabs>
      </div> */}

      <div className='class-navbar'>
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <Nav className='flex-column sidebar-content' activeKey={getActiveTab()} onSelect={handleSelect} id="cm-tabs">
            <Nav.Item className={`nav-item ${getActiveTab() === "dashboard" ? "active" : ""}`} onClick={() => navigate("/teacher/dashboard")}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> Dashboard
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "activity" ? "active" : ""}`} onClick={() => navigate(`/teacher/class/${classID}/activity`)}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Activities
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "class-participants" ? "active" : ""}`} onClick={() => navigate(`/teacher/class/${classID}/class-participants`)}>
              <Nav.Link href='#' className='nav-link' >
                <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Class Participants
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "classrecord" ? "active" : ""}`} onClick={() => navigate(`/teacher/class/${classID}/classrecord`)}>
              <Nav.Link href='#' className='nav-link'>
                <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Class Record
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={`nav-item ${getActiveTab() === "teacher-bulletin" ? "active" : ""}`} onClick={() => navigate(`/teacher/class/${classID}/teacher-bulletin`)}>
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
              <span className='teacher-badge'>Teacher</span>

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

                {showNotifications && (
                  <div className='notification-dropdown'>
                    <div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '10px', backgroundColor:"" }}>No Notifications</div>
                      ) : (
                        notifications.map((notif) => {
                          const parsedData = JSON.parse(notif.data || '{}');
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
                              <div 
                                onClick={(e) => handleDeleteNotification(e, notif.id)}
                                style={{ marginLeft: '8px', cursor: 'pointer' }}
                              >
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
              <Dropdown align='end'>
                <Dropdown.Toggle variant='transparent' className='profile-dropdown'>
                  <img src={profileImage} className='profile-image' alt="Profile" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate('/teacher/profile')}>Profile Account</Dropdown.Item>
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

export default TeacherCMNavigationBarComponent;