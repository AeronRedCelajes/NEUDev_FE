import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Navbar, Dropdown, Badge, Button, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell, faArrowLeft, faTimes, faDesktop, faLaptopCode } from '@fortawesome/free-solid-svg-icons';
import '/src/style/TeacherNavbar.css';
import { 
  getProfile, 
  logout, 
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification
} from './api/API';
import { useAlert } from "./AlertContext"; 

export const TeacherNavbar = () => {
  const defaultProfileImage = "/src/assets/profile_default.png";
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [teacherName, setTeacherName] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { openAlert } = useAlert();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { classID, actID } = useParams();

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await getProfile();
      if (!response.error) {
        setProfileImage(response.profileImage || defaultProfileImage);
        setTeacherName(`${response.firstname} ${response.lastname}`);
      } else {
        console.error("❌ Failed to fetch profile:", response.error);
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
    fetchUserNotifications();

    // POLLING: setInterval to fetch notifications every 10 seconds
    const interval = setInterval(() => {
        fetchUserNotifications();
    }, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  // Toggle sidebar state (for dashboard only)
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Determine the appropriate back link based on the current URL and parameters.
  const getBackLink = () => {
    const path = location.pathname;
    // If on dashboard or profile, no back link is needed.
    if (path === '/teacher/dashboard' || path === '/teacher/profile') return null;

    // If inside a class route:
    if (classID && path.includes(`/teacher/class/${classID}`)) {
      // If you're in an activity detail page (assessment, leaderboard, or items)
      if (path.includes('/activity/') && actID) {
        return `/teacher/class/${classID}/activity`;
      }
      // If on the bulletin page, go back to the class's activity list
      if (path.includes('teacher-bulletin')) {
        return `/teacher/class/${classID}/activity`;
      }
    }

    // Fallback to the teacher dashboard
    return '/teacher/dashboard';
  };

  const handleBack = () => {
    const backLink = getBackLink();
    navigate(backLink || '/teacher/dashboard');
  };

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

  /**
   * Log the user out.
   */
  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
      //alert("✅ Logout successful");
      openAlert({
        message: "Logout successful",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
        onAfterClose: () => {  navigate('/home');
        },
      });
    
    } else {
      //alert("❌ Logout failed. Try again.");
      openAlert({
        message: "Logout failed. Try again.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 3000,
      });
    }
  };

  return (
    <>
      {/* Render sidebar only when on the dashboard page */}
      {location.pathname === '/teacher/dashboard' && (
        <>
          <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <Nav className='flex-column sidebar-content'>
              <Nav.Item className='nav-item active'>
                <Nav.Link href='#' className='nav-link'>
                  <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> My Classes
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className='nav-item' onClick={() => navigate('/teacher/sandbox')}>
                <Nav.Link href='#' className='nav-link'>
                  <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Sandbox
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
          {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        </>
      )}

      <Navbar expand='lg' fixed='top' className='profile-student-navbar'>
        {/* Show the sidebar toggle (faBars) if on /teacher/dashboard; otherwise, show a back arrow */}
        {location.pathname === '/teacher/dashboard' ? (
          <Button variant='transparent' className='toggle-btn' onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </Button>
        ) : (
          <a href='#'>
            <i className='bi bi-arrow-left-circle' onClick={handleBack}></i>
          </a>
        )}

        <div className='dashboard-student-navbar'>
          <span className='ping'>20 ms</span>
          <a href='#'><i className='bi bi-moon'></i></a>
          <span className='student-badge'>Teacher</span>

          {/* Notification Bell */}
          <div className='notification-bell' style={{ position: 'relative', marginRight: '20px' }}>
            <FontAwesomeIcon
              icon={faBell}
              size='lg'
              style={{ cursor: 'pointer' }}
              onClick={handleBellClick}
            />
            {unreadCount > 0 && (
              <Badge bg='danger' pill style={{ position: 'absolute', top: '-5px', right: '-5px' }}>
                {unreadCount}
              </Badge>
            )}

            {showNotifications && (
              <div
                className='notification-dropdown'
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '30px',
                  width: '300px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  zIndex: 9999
                }}
              >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '10px' }}>No Notifications</div>
                  ) : (
                    notifications.map((notif) => {
                      const parsedData = JSON.parse(notif.data || '{}');
                      return (
                        <div
                          key={notif.id}
                          style={{
                            padding: '10px',
                            borderBottom: '1px solid #ccc',
                            // If isRead is false => highlight with #eaf3ff, else #f9f9f9
                            backgroundColor: notif.isRead ? '#f9f9f9' : '#eaf3ff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }}
                          onClick={() => handleNotificationClick(notif.id)}
                        >
                          <div>
                            <div><strong>{notif.type}</strong></div>
                            <div>{parsedData.message}</div>
                            <small style={{ color: '#666' }}>
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
              <Dropdown.Item onClick={() => navigate('/teacher/profile')}>
                Profile Account
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>
                Log Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Navbar>
    </>
  );
};