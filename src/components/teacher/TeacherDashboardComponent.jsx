import { faBars, faDesktop, faLaptopCode, faEllipsisV, faBell, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import { Button, Card, Dropdown, Form, Modal, Nav, Navbar, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/teacher/dashboard.css';

import { 
  logout, 
  getProfile, 
  createClass, 
  getClasses, 
  updateClass, 
  deleteClass, 
  verifyPassword, 
  getSessionData, 
  setSessionData,
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification 
} from '../api/API.js';

export const TeacherDashboardComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [className, setClassName] = useState("");
  const [classSection, setClassSection] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [classes, setClasses] = useState([]);
  const [instructorName, setInstructorName] = useState("");

  // State for editing a class (including cover photo)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClassData, setEditClassData] = useState({
    id: null,
    className: "",
    classSection: "",
    // Will hold the File object if a new file is chosen, or a URL if already stored.
    classCoverPhoto: "",
    // For preview display in the modal
    classCoverPreview: ""
  });
  const [isEditing, setIsEditing] = useState(false);

  // State for deleting a class
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClassData, setDeleteClassData] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  // State for archiving a class
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveClassData, setArchiveClassData] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // [CHANGED] State for notifications
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false); // controls dropdown visibility

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        console.log("🔍 API Response (Profile):", response);
        if (response) {
          setProfileImage(response.profileImage || defaultProfileImage);
          setInstructorName(`${response.firstname} ${response.lastname}`);
        }
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
      }
    };

    const fetchClasses = async () => {
      const response = await getClasses();
      console.log("📥 Fetched Classes (Filtered for Teacher):", response);
      if (!response.error) {
        const updatedClasses = response.map(cls => ({
          ...cls,
          instructorName: instructorName
        }));
        setClasses(updatedClasses);
      } else {
        console.error("❌ Failed to fetch classes:", response.error);
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
    fetchClasses();
    fetchUserNotifications();

    // POLLING: setInterval to fetch notifications every 10 seconds
    const interval = setInterval(() => {
      fetchUserNotifications();
    }, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);

  }, [instructorName]);

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

  const handleClassCreate = async (e) => {
    e.preventDefault();
    if (!className.trim() || !classSection.trim()) {
      alert("⚠️ Please enter both class name and section.");
      return;
    }
    setIsCreating(true);
    const classData = { className, classSection };
    console.log("📤 Sending Class Data:", classData);
    const response = await createClass(classData);
    if (response.error) {
      alert(`❌ Class creation failed: ${response.error}`);
    } else {
      alert("✅ Class created successfully!");
      setShowCreateClass(false);
      setClassName("");
      setClassSection("");
      setClasses([...classes, { ...response, instructorName }]);
    }
    setIsCreating(false);
  };

  // Open the edit modal and load class data including cover photo
  const handleEditClass = (classItem, event) => {
    event.stopPropagation();
    setEditClassData({
      id: classItem.id || classItem.classID,
      className: classItem.className,
      classSection: classItem.classSection,
      // Use the stored relative path if available, fallback to a default cover.
      classCoverPhoto: classItem.classCoverImage || '/src/assets/defaultCover.png',
      classCoverPreview: classItem.classCoverImage || '/src/assets/defaultCover.png'
    });
    setShowEditModal(true);
  };

  // Save changes including the updated cover photo
  const handleEditClassSave = async (e) => {
    e.preventDefault();
    if (!editClassData.className.trim() || !editClassData.classSection.trim()) {
      alert("⚠️ Please enter both class name and section.");
      return;
    }
    setIsEditing(true);
  
    // Call updateClass and wait for the response. The response includes the updated cover image URL.
    const response = await updateClass(editClassData.id, editClassData);
    if (response.error) {
      alert(`❌ Failed to update class: ${response.error}`);
      setIsEditing(false);
      return;
    }
  
    // Update the state using the response (which has the updated classCoverImage URL)
    const updatedClasses = classes.map((cls) => {
      if ((cls.id || cls.classID) === editClassData.id) {
        return { ...cls, ...response, instructorName };
      }
      return cls;
    });
    setClasses(updatedClasses);
  
    alert("✅ Class updated successfully!");
    setShowEditModal(false);
    setIsEditing(false);
  };

  // Open the delete modal and set the class to delete
  const handleDeleteClass = (classItem, event) => {
    event.stopPropagation();
    setDeleteClassData(classItem);
    setShowDeleteModal(true);
  };

  // Delete the class after verifying the teacher's password
  const handleDeleteClassConfirm = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      alert("⚠️ Please enter your password to confirm deletion.");
      return;
    }
    const sessionData = getSessionData();
    const teacherEmail = sessionData.email;
    const verifyResponse = await verifyPassword(teacherEmail, deletePassword);
    if (verifyResponse.error) {
      alert(`❌ Password verification failed: ${verifyResponse.error}`);
      return;
    }
    const classID = deleteClassData.id || deleteClassData.classID;
    const deleteResponse = await deleteClass(classID);
    if (deleteResponse.error) {
      alert(`❌ Failed to delete class: ${deleteResponse.error}`);
      return;
    }
    const updatedClasses = classes.filter(cls => (cls.id || cls.classID) !== classID);
    setClasses(updatedClasses);
    alert(`✅ ${deleteClassData.className} deleted successfully!`);
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteClassData(null);
  };

  // Open the archive modal and set the class to archive
  const handleArchiveClass = (classItem, event) => {
    event.stopPropagation();
    setArchiveClassData(classItem);
    setShowArchiveModal(true);
  };

  // Confirm archive action – update activeClass field to false
  const handleArchiveClassConfirm = async (e) => {
    e.preventDefault();
    if (!archiveClassData) return;
    setIsArchiving(true);
    const classID = archiveClassData.id || archiveClassData.classID;
    const archiveData = {
      className: archiveClassData.className,
      classSection: archiveClassData.classSection,
      activeClass: false
    };
    const response = await updateClass(classID, archiveData);
    if (response.error) {
      alert(`❌ Failed to archive class: ${response.error}`);
      setIsArchiving(false);
      return;
    }
    alert("✅ Class archived successfully!");
    const updatedClasses = classes.filter(cls => (cls.id || cls.classID) !== classID);
    setClasses(updatedClasses);
    setShowArchiveModal(false);
    setArchiveClassData(null);
    setIsArchiving(false);
  };

  return (
    <div className='dashboard'>
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <Nav className='flex-column sidebar-content'>
          <Nav.Item className="nav-item active" onClick={() => navigate('/teacher/dashboard')}>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> My Classes
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className='nav-item' onClick={() => navigate('/teacher/sandbox')}>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Sandbox
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className='nav-item' onClick={() => navigate('/teacher/item')}>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Item Bank
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className='nav-item' onClick={() => navigate('/teacher/archived')}>
            <Nav.Link href='#' className='nav-link'>
              <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Archived Classes
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
            <span className='student-badge'>Teacher</span>

                        {/* [CHANGED] Notification Bell */}
                        <div className='notification-bell' style={{ position: 'relative', marginRight: '20px' }}>
              <FontAwesomeIcon
                icon={faBell}
                size='lg'
                style={{ cursor: 'pointer' }}
                onClick={handleBellClick}
              />
              {unreadCount > 0 && (
                <Badge bg='danger' pill style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px'
                }}>
                  {unreadCount}
                </Badge>
              )}
              {/* Dropdown Panel */}
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
                          style={{
                            padding: '10px',
                            borderBottom: '1px solid #ccc',
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
                <Dropdown.Item onClick={() => navigate('/teacher/profile')}>Profile Account</Dropdown.Item>
                <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Navbar>

        <div className='container dashboard-body'>
          <h4>Active Classes</h4>
          <div className='classes-container'>
            {classes.map((classItem, index) => (
              <Card className='class-card' key={index}
                onClick={() => {
                  const sessionData = getSessionData();
                  sessionData.selectedClassID = classItem.id || classItem.classID;
                  setSessionData(sessionData);
                  navigate(`/teacher/class/${classItem.id || classItem.classID}/activity`);
                }}
                style={{ position: 'relative', cursor: 'pointer' }}>
                {/* When rendering the class cover image, prepend the storage URL */}
                  <Card.Img variant='top' src={classItem.classCoverImage || '/src/assets/univ.png'} />

                <div className="card-options" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Dropdown onClick={(e) => e.stopPropagation()}>
                    <Dropdown.Toggle
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: '0'
                      }}
                      id={`dropdown-${index}`}>
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={(e) => handleEditClass(classItem, e)}>Edit</Dropdown.Item>
                      <Dropdown.Item onClick={(e) => handleArchiveClass(classItem, e)}>Archive</Dropdown.Item>
                      <Dropdown.Item onClick={(e) => handleDeleteClass(classItem, e)}>Delete</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                <Card.Body>
                  <Card.Text>
                    <strong><h6>{classItem.className}</h6></strong>
                    <strong>Section:</strong> {classItem.classSection} <br />
                    <strong>Teacher:</strong> {classItem.instructorName || instructorName}
                  </Card.Text>
                </Card.Body>
              </Card>
            ))}

            <Button variant='transparent' className='create-class' onClick={() => setShowCreateClass(true)}>
              + Create a Class
            </Button>
          </div>
        </div>

        {/* Create Class Modal */}
        <Modal className='modal-create-class' show={showCreateClass} onHide={() => setShowCreateClass(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Class Creation</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleClassCreate}>
              <Form.Group controlId='formClassName'>
                <Form.Label>Class Name</Form.Label>
                <Form.Control
                  type='text'
                  placeholder='Enter class name'
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group controlId='formClassSection' className='mt-3'>
                <Form.Label>Class Section</Form.Label>
                <Form.Control
                  type='text'
                  placeholder='Enter class section'
                  value={classSection}
                  onChange={(e) => setClassSection(e.target.value)}
                  required
                />
              </Form.Group>
              <Button variant='primary' className='mt-3' type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Class"}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Edit Class Modal */}
        <Modal className='modal-edit-class' show={showEditModal} onHide={() => setShowEditModal(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Edit Class</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleEditClassSave}>
              <Form.Group controlId='formEditClassName'>
                <Form.Label>Class Name</Form.Label>
                <Form.Control
                  type='text'
                  placeholder='Enter class name'
                  value={editClassData.className}
                  onChange={(e) => setEditClassData({ ...editClassData, className: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group controlId='formEditClassSection' className='mt-3'>
                <Form.Label>Class Section</Form.Label>
                <Form.Control
                  type='text'
                  placeholder='Enter class section'
                  value={editClassData.classSection}
                  onChange={(e) => setEditClassData({ ...editClassData, classSection: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group controlId='formEditClassCoverPhoto' className='mt-3'>
                <Form.Label>Class Cover Photo</Form.Label>
                <Button variant="secondary" as="label" htmlFor="class-cover-upload">
                  Upload Cover Photo
                </Button>
                <input
                  id="class-cover-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditClassData({ 
                        ...editClassData, 
                        classCoverPhoto: file,
                        classCoverPreview: URL.createObjectURL(file)
                      });
                    }
                  }}
                />
                {editClassData.classCoverPreview && (
                  <div className="mt-2">
                    <img
                      src={editClassData.classCoverPreview}
                      alt="Class Cover"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </Form.Group>
              <Button variant='primary' className='mt-3' type="submit" disabled={isEditing}>
                {isEditing ? "Saving..." : "Save Changes"}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Delete Class Modal */}
        <Modal className='modal-delete-class' show={showDeleteModal} onHide={() => setShowDeleteModal(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Please enter your password to confirm deletion of <strong>{deleteClassData?.className}</strong>.</p>
            <Form onSubmit={handleDeleteClassConfirm}>
              <Form.Group controlId='formDeletePassword'>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type='password'
                  placeholder='Enter your password'
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                />
              </Form.Group>
              <div className='d-flex justify-content-end mt-3'>
                <Button variant='secondary' onClick={() => setShowDeleteModal(false)} className='me-2'>
                  Cancel
                </Button>
                <Button variant='danger' type="submit">
                  Delete Class
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Archive Class Modal */}
        <Modal className='modal-archive-class' show={showArchiveModal} onHide={() => setShowArchiveModal(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Archive</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to archive <strong>{archiveClassData?.className}</strong>?</p>
            <div className='d-flex justify-content-end mt-3'>
              <Button variant='secondary' onClick={() => setShowArchiveModal(false)} className='me-2'>
                Cancel
              </Button>
              <Button variant='warning' onClick={handleArchiveClassConfirm} disabled={isArchiving}>
                {isArchiving ? "Archiving..." : "Archive Class"}
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default TeacherDashboardComponent;
