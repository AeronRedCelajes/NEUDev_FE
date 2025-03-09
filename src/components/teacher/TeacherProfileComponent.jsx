import React, { useState, useEffect } from 'react';
import { ProfilePlaygroundNavbarComponent } from '../ProfilePlaygroundNavbarComponent.jsx';
import { Modal, Button } from 'react-bootstrap';
import { getProfile, updateProfile, deleteProfile } from '../api/API.js'; // Import API functions
import '/src/style/student/profile.css';

export const TeacherProfileComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const defaultCoverImage = '/src/assets/univ.png';

  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState({
    firstname: '',
    lastname: '',
    profileImage: '',
    coverImage: '',
    newPassword: ''
  });

  const [newProfileImage, setNewProfileImage] = useState(null);
  const [newCoverImage, setNewCoverImage] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      if (!data.error) {
        setProfile({
          ...data,
          profileImage: data.profileImage || defaultProfileImage,
          coverImage: data.coverImage || defaultCoverImage,
        });
      } else {
        console.error("Failed to fetch profile:", data.error);
      }
    };
    fetchProfile();
  }, []);

  // Handle input changes
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

  // Save profile changes using FormData
  const handleSaveChanges = async () => {
    // Build the updatedProfile object and call updateProfile (as before)
    const updatedProfile = { ...profile };
    if (newProfileImage) {
      updatedProfile.profileImage = newProfileImage;
    }
    if (newCoverImage) {
      updatedProfile.coverImage = newCoverImage;
    }
    Object.keys(updatedProfile).forEach((key) => {
      if (updatedProfile[key] === "") {
        delete updatedProfile[key];
      }
    });
  
    const response = await updateProfile(updatedProfile);
    if (!response.error) {
      alert("Profile updated successfully!");
      setShowEditModal(false);
      // Force a full page reload to get the latest data and images
      window.location.reload();
    } else {
      alert("Failed to update profile: " + response.error);
    }
  };  

    // Handle profile deletion
    const handleDeleteProfile = async () => {
        // Confirm deletion with the user
        const confirmDelete = window.confirm("Are you sure you want to delete your profile? This action cannot be undone.");
        if (!confirmDelete) return;
    
        const response = await deleteProfile();
        if (!response.error) {
          alert("Profile deleted successfully!");
          // Clear session or redirect to home
          window.location.href = "/home";
        } else {
          alert("Failed to delete profile: " + response.error);
        }
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

            <div className='uploaded-image'>
              <img src={newCoverImage ? URL.createObjectURL(newCoverImage) : profile.coverImage} className='preview-image' alt="Cover Preview" />
            </div>

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
            
            <div className='uploaded-image'>
              <img src={newProfileImage ? URL.createObjectURL(newProfileImage) : profile.profileImage} className='preview-image' alt="Profile Preview" />
            </div>

            {/* Profile Details Edit */}
            <div className='edit-details'>
              <label>First Name:</label>
              <input type='text' name='firstname' value={profile.firstname} onChange={handleInputChange} className='form-control' />

              <label>Last Name:</label>
              <input type='text' name='lastname' value={profile.lastname} onChange={handleInputChange} className='form-control' />

              {/* New Password (Editable) */}
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
                <i
                  className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                ></i>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="danger" onClick={handleDeleteProfile}>Delete Profile</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </Modal.Footer>
        </Modal>

        {/* Profile Display Section */}
        <div className='profile-container'>
          <div className='row'>
            <div className='col-12 col-md-5 col-lg-4'>
              <div className='container info-container'>
                <div className="profile-picture-container" style={{ backgroundImage: `url(${profile.profileImage})` }}></div>
                <div>
                  <p className='name'>{profile.firstname} {profile.lastname}</p>
                  <p className='program'><b>Role:</b> Instructor</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};