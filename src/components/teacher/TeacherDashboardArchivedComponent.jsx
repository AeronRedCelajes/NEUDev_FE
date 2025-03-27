import { faBars, faDesktop, faLaptopCode, faEllipsisV, faBell, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import { Button, Card, Dropdown, Form, Modal, Nav, Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/teacher/dashboard.css';
import { useAlert } from "../AlertContext"; 

import { logout, getProfile, createClass, getArchivedClasses, updateClass, deleteClass, verifyPassword, 
  markNotificationAsRead, 
  deleteNotification, getSessionData } from '../api/API.js';


export const TeacherDashboardArchivedComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [className, setClassName] = useState("");
  const [classSection, setClassSection] = useState("");
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [classes, setClasses] = useState([]);
  const [instructorName, setInstructorName] = useState("");
  const { openAlert } = useAlert();
  const [isClicked, setIsClicked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  //Notification
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // State for editing a class (including cover photo)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClassData, setEditClassData] = useState({
    id: null,
    className: "",
    classSection: "",
    classCoverPhoto: "",
    classCoverPreview: ""
  });

  // State for deleting a class
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClassData, setDeleteClassData] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  // State for unarchiving a class
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveClassData, setArchiveClassData] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
      // Get archived classes (i.e. inactive)
      const response = await getArchivedClasses();
      console.log("📥 Fetched Archived Classes:", response);
      if (!response.error) {
        const updatedClasses = response.map(cls => ({
          ...cls,
          instructorName: instructorName
        }));
        setClasses(updatedClasses);
      } else {
        console.error("❌ Failed to fetch archived classes:", response.error);
      }
    };

    fetchProfile();
    fetchClasses();
  }, [instructorName]);

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

  const handleClassCreate = async (e) => {
    e.preventDefault();
    if (!className.trim() || !classSection.trim()) {
      //alert("⚠️ Please enter both class name and section.");
      openAlert({
        message: "⚠️ Please enter both class name and section.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }
    setIsClicked(true);
    const classData = { className, classSection };
    console.log("📤 Sending Class Data:", classData);
    const response = await createClass(classData);
    if (response.error) {
      //alert(`❌ Class creation failed: ${response.error}`);
      openAlert({
        message: "❌ Class creation failed: " + response.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
    } else {
      //alert("✅ Class created successfully!");

      openAlert({
        message: "✅ Class created successfully!",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      setShowCreateClass(false);
      setClassName("");
      setClassSection("");
      setClasses([...classes, { ...response, instructorName }]);
    }
    setIsClicked(false);
  };

  // Open the edit modal and load class data
  const handleEditClass = (classItem, event) => {
    event.stopPropagation();
    setEditClassData({
      id: classItem.id || classItem.classID,
      className: classItem.className,
      classSection: classItem.classSection,
      classCoverPhoto: classItem.classCoverImage || '/src/assets/defaultCover.png',
      classCoverPreview: classItem.classCoverImage || '/src/assets/defaultCover.png'
    });
    setShowEditModal(true);
  };

  // Save changes including updated cover photo
  const handleEditClassSave = async (e) => {
    e.preventDefault();
    if (!editClassData.className.trim() || !editClassData.classSection.trim()) {
      //alert("⚠️ Please enter both class name and section.");
      openAlert({
        message: "⚠️ Please enter both class name and section.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
        onAfterClose: () => {
        },
      });
      return;
    }
    setIsClicked(true);
    const response = await updateClass(editClassData.id, editClassData);
    if (response.error) {
      //alert(`❌ Failed to update class: ${response.error}`);
      openAlert({
        message: "❌ Failed to update class: "+ response.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
        onAfterClose: () => {
        },
      });
      setIsClicked(false);
      return;
    }
    const updatedClasses = classes.map((cls) => {
      if ((cls.id || cls.classID) === editClassData.id) {
        return { ...cls, ...response, instructorName };
      }
      return cls;
    });
    setClasses(updatedClasses);
    //alert("✅ Class updated successfully!");
    openAlert({
      message: "✅ Class updated successfully!.",
      imageUrl: "/src/assets/profile_default2.png",
      autoCloseDelay: 2000,

    });
    setShowEditModal(false);
    setIsClicked(false);
  };  

  // Open the delete modal and set the class to delete
  const handleDeleteClass = (classItem, event) => {
    event.stopPropagation();
    setDeleteClassData(classItem);
    setShowDeleteModal(true);
  };

  // Delete class after verifying password
  const handleDeleteClassConfirm = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      //alert("⚠️ Please enter your password to confirm deletion.");
      openAlert({
        message: "⚠️ Please enter your password to confirm deletion.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
  
      });
      return;
    }
    setIsClicked(true);
    const sessionData = getSessionData();
    const teacherEmail = sessionData.email;

    const verifyResponse = await verifyPassword(teacherEmail, deletePassword);
    if (verifyResponse.error) {
      //alert(`❌ Password verification failed: ${verifyResponse.error}`);
      openAlert({
        message: "❌ Password verification failed: " + verifyResponse.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
  
      });
      setIsClicked(false);
      return;
    }
    const classID = deleteClassData.id || deleteClassData.classID;
    const deleteResponse = await deleteClass(classID);
    if (deleteResponse.error) {
      //alert(`❌ Failed to delete class: ${deleteResponse.error}`);
      openAlert({
        message: "❌ Failed to delete class: " + deleteResponse.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
  
      });
      setIsClicked(false);
      return;
    }
    const updatedClasses = classes.filter(cls => (cls.id || cls.classID) !== classID);
    setClasses(updatedClasses);
    //alert(`✅ ${deleteClassData.className} deleted successfully!`);
    openAlert({
      message: deleteClassData.className + " deleted successfully!",
      imageUrl: "/src/assets/profile_default2.png",
      autoCloseDelay: 2000,

    });
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteClassData(null);
  };

  // Open the unarchive modal and set the class to unarchive
  const handleArchiveClass = (classItem, event) => {
    event.stopPropagation();
    setArchiveClassData(classItem);
    setShowArchiveModal(true);
  };

  // Confirm unarchive action – update activeClass field to true
  const handleArchiveClassConfirm = async (e) => {
    e.preventDefault();
    if (!archiveClassData) return;
    setIsArchiving(true);
    const classID = archiveClassData.id || archiveClassData.classID;
    // For unarchiving, set activeClass to true
    const archiveData = {
      className: archiveClassData.className,
      classSection: archiveClassData.classSection,
      activeClass: true
    };
    const response = await updateClass(classID, archiveData);
    if (response.error) {
      //alert(`❌ Failed to unarchive class: ${response.error}`);
      openAlert({
        message: "❌ Failed to unarchive class: " + response.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      setIsArchiving(false);
      return;
    }
    //alert("✅ Class unarchived successfully!");
    openAlert({
      message: "✅ Class unarchived successfully!",
      imageUrl: "/src/assets/profile_default2.png",
      autoCloseDelay: 2000,

    });
    // Remove the class from the archived list since it is now active
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
          <Nav.Item className="nav-item" onClick={() => navigate('/teacher/dashboard')}>
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
          <Nav.Item className='nav-item active' onClick={() => navigate('/teacher/archived')}>
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
            <span className='teacher-badge'>Teacher</span>

            {/* Notification Bell */}
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
              <Dropdown.Toggle variant='transparent' className='dropdown-desgin'>
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
          <h4>Archived Classes</h4>
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
                      <Dropdown.Item onClick={(e) => handleArchiveClass(classItem, e)}>Unarchive</Dropdown.Item>
                      <Dropdown.Item onClick={(e) => handleDeleteClass(classItem, e)}>Delete</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                <Card.Body>
                  <Card.Text>
                    <strong className='class-name'>{classItem.className}</strong><br />
                    <strong>Section:</strong> {classItem.classSection} <br />
                    <strong>Teacher:</strong> {classItem.instructorName || instructorName}
                  </Card.Text>
                </Card.Body>
              </Card>
            ))}
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
              <Button variant='primary' className='mt-3' type="submit" disabled={isClicked}>
                {isClicked ? "Creating..." : "Create Class"}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Edit Class Modal */}
        <Modal className='modal-design' show={showEditModal} onHide={() => setShowEditModal(false)} backdrop='static' keyboard={false} size='md'>
          <Modal.Header closeButton>
            <Modal.Title>Edit Class</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
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
                <div className='edit-button'>
                  <span>Class Cover Photo</span>
                  <Button>
                    <label htmlFor='class-cover-upload' className='upload-label'>
                      Upload Cover Photo
                    </label>
                  </Button>
                </div>
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
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button className='success-button' onClick={handleEditClassSave} disabled={isClicked}>
              {isClicked ? "Saving..." : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Class Modal */}
        <Modal className='modal-design' show={showDeleteModal} onHide={() => setShowDeleteModal(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Please enter your password to confirm deletion of <strong>{deleteClassData?.className}</strong>.</p>
            <Form>
              <Form.Label>Password</Form.Label>
              <Form.Group controlId='formDeletePassword' className="d-flex align-items-center">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder='Enter your password'
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                >
                  {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                </span>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <div className='d-flex justify-content-end'>
              <Button variant='secondary' onClick={() => setShowDeleteModal(false)} className='me-2'>
                Cancel
              </Button>
              <Button variant='danger' onClick={handleDeleteClassConfirm} disabled={isClicked}>
                {isClicked ? "Deleting..." : "Delete Class"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Unarchive Class Modal */}
        <Modal className='modal-design' show={showArchiveModal} onHide={() => setShowArchiveModal(false)} backdrop='static' keyboard={false} size='lg'>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Unarchive</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to unarchive <strong>{archiveClassData?.className}</strong>?</p>
            
          </Modal.Body>
          <Modal.Footer>
            <div className='d-flex justify-content-end mt-3'>
              <Button variant='secondary' onClick={() => setShowArchiveModal(false)} className='me-2'>
                Cancel
              </Button>
              <Button variant='warning' onClick={handleArchiveClassConfirm} disabled={isArchiving}>
                {isArchiving ? "Unarchiving..." : "Unarchive Class"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default TeacherDashboardArchivedComponent;
