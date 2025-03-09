import React, { useEffect, useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/ProfilePlaygroundNavbar.css';

export const ProfilePlaygroundNavbarComponent = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState(null);

    useEffect(() => {
        // Get user type from sessionStorage (or localStorage if you prefer)
        const storedUserType = localStorage.getItem("user_type"); 
        setUserType(storedUserType);
    }, []);

    const handleDashboardClick = () => {
        if (userType === "teacher") {
            navigate('/teacher/dashboard');
        } else {
            navigate('/student/dashboard');
        }
    };

    return (
        <>
            <Navbar className='profile-playground-navbar'>
                <Nav>
                    <Nav.Link href='#'><i className='bi bi-arrow-left-circle' onClick={handleDashboardClick}></i> </Nav.Link>
                    <Navbar.Text>Dashboard</Navbar.Text>
                    
                    <div className='dashboard-navbar'>
                        <span className='ping'>20 ms</span>
                        <a href='#'><i className='bi bi-moon'></i></a>
                    </div>
                </Nav>
            </Navbar>
        </>
    );
};