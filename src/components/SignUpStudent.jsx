import React, { useState } from "react";
import "../style/signup.css";
import { useNavigate } from "react-router-dom";
import { register } from "./api/API.js";

export const SignUpStudent = () => {
  const navigate = useNavigate();
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [student_num, setStudentNum] = useState("");
  const [program, setProgram] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // New states to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper function to format student number as "xx-xxxxx-xxx"
  const formatStudentNumber = (value) => {
    // Remove any non-digit characters
    let digits = value.replace(/\D/g, '');
    // Limit to 10 digits (2 + 5 + 3)
    digits = digits.slice(0, 10);
    let formatted = "";
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += '-' + digits.slice(2, 7);
    }
    if (digits.length > 7) {
      formatted += '-' + digits.slice(7, 10);
    }
    return formatted;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!email.endsWith("@neu.edu.ph")) {
      alert("Invalid email format! Use '@neu.edu.ph'.");
      return;
    }

    // Check for valid student number format (xx-xxxxx-xxx)
    if (!/^\d{2}-\d{5}-\d{3}$/.test(student_num)) {
      alert("Invalid Student Number format! Example: 21-12345-678");
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
      const response = await register(firstname, lastname, email, student_num, program, password);
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
    <div className="container-fluid d-flex p-0 st-signup-form">
      <div className="col-md-7 d-none d-md-block p-0">
        <img
          src="/src/assets/univ.png"
          alt="University"
          className="w-100 h-100"
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className="col-12 col-md-5 d-flex align-items-center justify-content-center signup-form-container">
        <div className="form-container">
          <div className="d-flex justify-content-center">
            <img
              src="/src/assets/HANR_LOGO-4.png"
              alt="University"
              className="w-50 h-50"
            />
          </div>

          <h3 className="text-center mb-3">Student Sign Up</h3>

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
              <label htmlFor="student_num">Student Number</label>
              <input
                type="text"
                id="student_num"
                className="form-control"
                placeholder="ex. 21-12345-678"
                required
                value={student_num}
                onChange={(e) => setStudentNum(formatStudentNumber(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="program">Program</label>
              <select
                id="program"
                className="form-control"
                required
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                <option value="">Select Program</option>
                <option value="BSCS">BSCS</option>
                <option value="BSIT">BSIT</option>
                <option value="BSEMC">BSEMC</option>
                <option value="BSIS">BSIS</option>
              </select>
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
                  {showPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
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
                  {showConfirmPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
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