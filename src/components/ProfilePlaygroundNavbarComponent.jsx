import React, { useEffect, useState } from 'react';
import { Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/ProfilePlaygroundNavbar.css';

export const ProfilePlaygroundNavbarComponent = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState(null);

    useEffect(() => {
        // Get user type from sessionStorage (or localStorage if you prefer)
        const storedUserType = sessionStorage.getItem("user_type"); 
        setUserType(storedUserType);
    }, []);

    const handleBackClick = () => {
        navigate(-1);
    };

    return (
        <>
            <Navbar className='profile-playground-navbar'>
                <a href='#'><i className='bi bi-arrow-left-circle' onClick={handleBackClick}></i></a>
                <p>Back</p>

                <div className='right-navbar'>
                    <span className='ping'>20 ms</span>
                    <a href='#'><i className='bi bi-moon'></i></a>
                </div>
            </Navbar>
        </>
    );
};