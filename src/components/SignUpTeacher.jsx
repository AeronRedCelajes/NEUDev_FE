import React, { useState } from "react";
import "../style/signup.css";
import { useNavigate } from "react-router-dom";
import { register } from "./api/API.js";

export const SignUpTeacher = () => {
  const navigate = useNavigate();
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // New states for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!email.endsWith("@neu.edu.ph")) {
      alert("Invalid email format! Use '@neu.edu.ph'.");
      return;
    }

    // Check that password is at least 8 characters
    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await register(firstname, lastname, email, null, null, password);
      console.log("API Response:", response);

      if (response.access_token) {
        alert("Registration successful!");
        navigate("/signin");
      } else {
        alert(response.message || "Registration unsuccessful. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex p-0 st-signup-form">
      <div className="col-md-7 d-none d-md-block p-0">
        <img src="/src/assets/univ.png" alt="University" className="w-100 h-100" style={{ objectFit: "cover" }} />
      </div>

      <div className="col-12 col-md-5 d-flex align-items-center justify-content-center signup-form-container">
        <div className="form-container">
          <div className="d-flex justify-content-center">
            <img src="/src/assets/HANR_LOGO-4.png" alt="University" className="w-50 h-50" />
          </div>

          <h3 className="text-center mb-3">Teacher Sign Up</h3>

          <form className="signup-form" onSubmit={handleSignUp}>
            <div className="form-group">
              <label htmlFor="firstname">First Name</label>
              <input
                type="text"
                id="firstname"
                className="form-control"
                placeholder="ex. Angelica Mae"
                required
                value={firstname}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastname">Last Name</label>
              <input
                type="text"
                id="lastname"
                className="form-control"
                placeholder="ex. Manliguez"
                required
                value={lastname}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">NEU Email</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="user@neu.edu.ph"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="d-flex align-items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="form-control"
                  placeholder="*********"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                >
                  {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="d-flex align-items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  className="form-control"
                  placeholder="*********"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                >
                  {showConfirmPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                </span>
              </div>
            </div>

            <button type="submit" className="custom-button w-100">
              Sign Up
            </button>

            <p className="text-center mt-3">
              Already have an account?{" "}
              <a href="#" onClick={() => navigate("/signin")}>
                Sign In
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};