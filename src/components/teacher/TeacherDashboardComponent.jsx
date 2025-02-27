import { faBars, faDesktop, faLaptopCode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import { Button, Card, Dropdown, Form, Modal, Nav, Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/teacher/dashboard.css';

import { logout, getProfile, createClass, getClasses } from '../api/API.js';

export const TeacherDashboardComponent = () => {
    const defaultProfileImage = '/src/assets/noy.png';
    const [profileImage, setProfileImage] = useState(defaultProfileImage);
    const [className, setClassName] = useState("");
    const [classSection, setClassSection] = useState(""); // ✅ Added state for class section
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [classes, setClasses] = useState([]); 
    const [instructorName, setInstructorName] = useState(""); 

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

        fetchProfile();
        fetchClasses();
    }, [instructorName]);

    const handleLogout = async () => {
        const result = await logout();
        if (!result.error) {
            window.location.href = "/home";
        } else {
            alert("❌ Logout failed. Try again.");
        }
    };

    const navigate = useNavigate();

    const handleClassCreate = async (e) => {
        e.preventDefault();
    
        if (!className.trim() || !classSection.trim()) {
            alert("⚠️ Please enter both class name and section.");
            return;
        }
    
        setIsCreating(true);
    
        const classData = {
            className: className,
            classSection: classSection, // ✅ Added classSection field
            classDesc: "" 
        };
    
        console.log("📤 Sending Class Data:", classData);
    
        const response = await createClass(classData);
    
        if (response.error) {
            alert(`❌ Class creation failed: ${response.error}`);
        } else {
            alert("✅ Class created successfully!");
            setShowCreateClass(false);
            setClassName(""); 
            setClassSection(""); // ✅ Reset classSection field
    
            // ✅ Ensure instructor name is added correctly
            setClasses([...classes, { ...response, instructorName }]); 
        }
    
        setIsCreating(false);
    };    

    return (
        <div className='dashboard'>
            <div className={`sidebar open`}>
                <Nav className='flex-column sidebar-content'>
                    <Nav.Item className="nav-item active">
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> My Classes
                        </Nav.Link>
                    </Nav.Item>

                    <Nav.Item className='nav-item' onClick={() => navigate('/teacher/sandbox')}>
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Sandbox
                        </Nav.Link>
                    </Nav.Item>

                    <Nav.Item className='nav-item' onClick={() => navigate('/teacher/question')}>
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Question Bank
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
            </div>

            <div className='dashboard-content'>
                <Navbar expand='lg' fixed='top' className='navbar-top'>
                    <Button variant='transparent' className='toggle-btn'>
                        <FontAwesomeIcon icon={faBars} />
                    </Button>

                    <div className='dashboard-navbar'>
                        <span className='ping'>20 ms</span>
                        <a href='#'><i className='bi bi-moon'></i></a>
                        <span className='student-badge'>Teacher</span>
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
                    <h5>Active Classes</h5>

                    <div className='classes-container'>
                        {classes.map((classItem, index) => (
                            <Card className='class-card' key={index} 
                                onClick={() => {
                                    sessionStorage.setItem("selectedClassID", classItem.id || classItem.classID);
                                    navigate(`/teacher/class/${classItem.id || classItem.classID}/activity`);
                                }} 
                                style={{ cursor: 'pointer' }}>
                            <Card.Img variant='top' src='/src/assets/univ.png' />
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

                            {/* ✅ Added Class Section Input */}
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

                            <Button 
                                variant='primary' 
                                className='mt-3' 
                                type="submit" 
                                disabled={isCreating}
                            >
                                {isCreating ? "Creating..." : "Create Class"}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};
