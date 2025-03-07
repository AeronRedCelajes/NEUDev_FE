import React from 'react'
import { useNavigate } from 'react-router-dom';
import '../style/navbar.css';

export const LandingNavbarComponent = () => {

  const navigate_signin = useNavigate();
  const handleSignInClick = () => {
    navigate_signin('/signin');
  };

  const navigate_signup = useNavigate();
  const handleSignUpClick = () => {
    navigate_signup('/signup');
  }

  return (
    <>
        <nav className="landing-navbar">
          <ul className="nav-list">
              <li className="nav-item">
                <a className="hanori_logo" href="#home"><img src='src/assets/navbar_logo3.png' alt='logo'/></a> 
              </li>
              <div className="auth-buttons"> 
                <button className="sign-in" onClick={handleSignInClick}>
                    Sign In
                </button>
                <button className="sign-up" onClick={handleSignUpClick}>
                    Sign Up
                </button>
              </div>
          </ul>
        </nav>
    </>

  )
}