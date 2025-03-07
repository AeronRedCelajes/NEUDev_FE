import React from "react";
import { useNavigate } from "react-router-dom";
import "../style/signup.css";

export const SignUpComponent = () => {
    const navigate = useNavigate();

    return (
        <div className="container-fluid vh-100 d-flex p-0 signup-container">
            {/* Left Side - University Image */}
            <div className="col-md-7 d-none d-md-block p-0">
                <img
                    src="/src/assets/univ.png"
                    alt="University"
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                />
            </div>

            {/* Right Side - Signup Options */}
            <div className="col-12 col-md-5 d-flex align-items-center justify-content-center signup-form-container">
                <div className="form-container">
                    {/* Logo */}
                    <div className="d-flex justify-content-center">
                        <img 
                            src="/src/assets/HANR_LOGO-4.png" 
                            alt="Hanori University Logo" 
                            className="w-50 h-50" 
                        />
                    </div>

                    {/* Title */}
                    <h3 className="text-center mb-3">Sign Up to NEUDev</h3>

                    {/* Role Selection */}
                    <p className="text-center">Are you signing up as a...</p>

                    <div className="d-flex justify-content-center">
                        <button 
                            className="custom-button mx-2" 
                            onClick={() => navigate("/signup/student")}
                            aria-label="Sign up as Student"
                        >
                            Student
                        </button>
                        <button 
                            className="custom-button mx-2" 
                            onClick={() => navigate("/signup/teacher")}
                            aria-label="Sign up as Teacher"
                        >
                            Teacher
                        </button>
                    </div>

                    {/* Sign In Link */}
                    <p className="text-center mt-3">
                            Already have an account? <a href="#" onClick={() => navigate("/signin")}>Sign In</a>
                    </p>
                </div>
            </div>
        </div>
    );
};