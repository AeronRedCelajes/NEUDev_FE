import React, { useState, useEffect } from 'react';
import { ProfilePlaygroundNavbarComponent } from '../ProfilePlaygroundNavbarComponent.jsx';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { getProfile, updateProfile, deleteProfile, verifyPassword } from '../api/API.js';
import '/src/style/student/profile.css';

export const TeacherProfileComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const defaultCoverImage = '/src/assets/univ.png';

  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState({
    firstname: '',
    lastname: '',
    email: '',
    profileImage: '',
    coverImage: '',
    newPassword: ''
  });

  const [newProfileImage, setNewProfileImage] = useState(null);
  const [newCoverImage, setNewCoverImage] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // State for the deletion confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Fetch teacher profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      if (!data.error) {
        setProfile({
          ...data,
          email: data.email || '',
          profileImage: data.profileImage || defaultProfileImage,
          coverImage: data.coverImage || defaultCoverImage,
        });
      } else {
        console.error("Failed to fetch profile:", data.error);
      }
    };
    fetchProfile();
  }, []);

  // Handle input changes for text fields
  const handleInputChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle file uploads: store the file object
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'profile') {
        setNewProfileImage(file);
      } else if (type === 'cover') {
        setNewCoverImage(file);
      }
    }
  };

  // Save profile changes using FormData.
  // Also check that the email format is valid.
  const handleSaveChanges = async () => {
    // Validate email format
    if (!profile.email.endsWith("@neu.edu.ph")) {
      alert("Invalid email format! Use '@neu.edu.ph'.");
      return;
    }
    // Only check password if at least one field is filled.
    if (profile.newPassword || confirmNewPassword) {
      if (profile.newPassword !== confirmNewPassword) {
        alert("New Password and Confirm New Password do not match.");
        return;
      }
    } else {
      // Remove newPassword so that it isn't updated to empty
      delete profile.newPassword;
    }

    const updatedProfile = { ...profile };
    if (newProfileImage) {
      updatedProfile.profileImage = newProfileImage;
    }
    if (newCoverImage) {
      updatedProfile.coverImage = newCoverImage;
    }
    // Remove keys with empty values
    Object.keys(updatedProfile).forEach((key) => {
      if (updatedProfile[key] === "") {
        delete updatedProfile[key];
      }
    });

    const response = await updateProfile(updatedProfile);
    if (!response.error) {
      alert("Profile updated successfully!");
      setShowEditModal(false);
      window.location.reload();
    } else {
      alert("Failed to update profile: " + response.error);
    }
  };

  // Open deletion confirmation modal
  const handleDeleteProfile = () => {
    setShowDeleteModal(true);
  };

  // Confirm deletion: verify password then delete profile
  const handleConfirmDeleteProfile = async () => {
    const userEmail = sessionStorage.getItem("user_email");
    if (!userEmail) {
      alert("No user email found. Please log in again.");
      return;
    }
    const verification = await verifyPassword(userEmail, deletePassword);
    if (verification.error) {
      alert(verification.error);
      return;
    }
    const response = await deleteProfile();
    if (!response.error) {
      alert("Profile deleted successfully!");
      window.location.href = "/home";
    } else {
      alert("Failed to delete profile: " + response.error);
    }
    setShowDeleteModal(false);
    setDeletePassword("");
  };

  return (
    <>
      <ProfilePlaygroundNavbarComponent />
      <div className='profile'>
        {/* Cover Image Section */}
        <div className='cover-container' style={{ backgroundImage: `url(${profile.coverImage})` }}>
          <button type="button" className='btn' onClick={() => setShowEditModal(true)}>
            Edit Profile <i className="bi bi-pencil"></i>
          </button>
        </div>

        {/* Edit Profile Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} backdrop='static' keyboard={false} size='lg' className='modal-profile'>
          <Modal.Header closeButton>
            <p className='modal-title w-100'>Edit Profile</p>
          </Modal.Header>
          <Modal.Body>
            {/* Cover Image Upload */}
            <div className='edit-button'>
              <span>Cover Photo</span>
              <Button>
                <label htmlFor='cover-upload' className='upload-label'>
                  Upload Photo
                  <input id='cover-upload' type='file' accept='image/*' hidden onChange={(e) => handleFileChange(e, 'cover')} />
                </label>
              </Button>
            </div>
            <img src={newCoverImage ? URL.createObjectURL(newCoverImage) : profile.coverImage} className='preview-image' alt="Cover Preview" />

            {/* Profile Image Upload */}
            <div className='edit-button'>
              <span>Profile Photo</span>
              <Button>
                <label htmlFor='profile-upload' className='upload-label'>
                  Upload Photo
                  <input id='profile-upload' type='file' accept='image/*' hidden onChange={(e) => handleFileChange(e, 'profile')} />
                </label>
              </Button>
            </div>
            <img src={newProfileImage ? URL.createObjectURL(newProfileImage) : profile.profileImage} className='preview-image' alt="Profile Preview" />

            {/* Profile Details Edit */}
            <div className='edit-details'>
              <label>First Name:</label>
              <input
                type='text'
                name='firstname'
                value={profile.firstname}
                onChange={handleInputChange}
                className='form-control'
              />

              <label>Last Name:</label>
              <input
                type='text'
                name='lastname'
                value={profile.lastname}
                onChange={handleInputChange}
                className='form-control'
              />

              <label>Email:</label>
              <input
                type='email'
                name='email'
                value={profile.email}
                onChange={handleInputChange}
                className='form-control'
              />

              {/* New Password Field with toggle */}
              <label>New Password:</label>
              <div className="password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={profile.newPassword || ""}
                  onChange={handleInputChange}
                  className='form-control'
                  placeholder="Enter new password"
                />
                <FontAwesomeIcon
                  icon={showNewPassword ? faEyeSlash : faEye}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ cursor: "pointer", marginLeft: "5px" }}
                />
              </div>

              {/* Confirm New Password Field with toggle */}
              <label>Confirm New Password:</label>
              <div className="password-field">
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className='form-control'
                  placeholder="Re-enter new password"
                />
                <FontAwesomeIcon
                  icon={showConfirmNewPassword ? faEyeSlash : faEye}
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  style={{ cursor: "pointer", marginLeft: "5px" }}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="danger" onClick={handleDeleteProfile}>Delete Profile</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation Modal with password visibility toggle */}
        <Modal
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setDeletePassword("");
          }}
          backdrop='static'
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label>Enter your password to confirm deletion:</label>
            <div className="d-flex align-items-center">
              <input
                type={showDeletePassword ? "text" : "password"}
                className="form-control"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <FontAwesomeIcon
                icon={showDeletePassword ? faEyeSlash : faEye}
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                style={{ cursor: "pointer", marginLeft: "5px" }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteProfile}>
              Delete Profile
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Profile Display Section */}
        <div className='profile-container'>
          <div className='row'>
            <div className='col-4'>
              <div className='container info-container'>
                <div className="profile-picture-container" style={{ backgroundImage: `url(${profile.profileImage})` }}></div>
                <div>
                  <p className='name'>{profile.firstname} {profile.lastname}</p>
                  <p><b>Role:</b> Teacher</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default TeacherProfileComponent;