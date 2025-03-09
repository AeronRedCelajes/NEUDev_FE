import React, { useState, useEffect } from 'react';
import { ProfilePlaygroundNavbarComponent } from '../ProfilePlaygroundNavbarComponent.jsx';
import { Modal, Button } from 'react-bootstrap';
import { getProfile, updateProfile, deleteProfile } from '../api/API.js'; // Import API functions
import '/src/style/student/profile.css';

export const StudentProfileComponent = () => {
  const defaultProfileImage = '/src/assets/noy.png';
  const defaultCoverImage = '/src/assets/univ.png';

  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState({
    firstname: '',
    lastname: '',
    student_num: '',
    program: '',
    profileImage: '',
    coverImage: '',
    newPassword: ''
  });

  const [newProfileImage, setNewProfileImage] = useState(null);
  const [newCoverImage, setNewCoverImage] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // -------------------- Helper: Format student number --------------------
  // This function formats the student number as "xx-xxxxx-xxx"
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

  // -------------------- Fetch Profile --------------------
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

  // -------------------- Handle Input Changes --------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "student_num") {
      setProfile({ ...profile, student_num: formatStudentNumber(value) });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  // -------------------- Handle File Changes --------------------
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

  // -------------------- Save Profile Changes --------------------
  const handleSaveChanges = async () => {
    // Build the updatedProfile object
    const updatedProfile = { ...profile };
    if (newProfileImage) {
      updatedProfile.profileImage = newProfileImage;
    }
    if (newCoverImage) {
      updatedProfile.coverImage = newCoverImage;
    }
    // Remove empty fields
    Object.keys(updatedProfile).forEach((key) => {
      if (updatedProfile[key] === "") {
        delete updatedProfile[key];
      }
    });

    const response = await updateProfile(updatedProfile);
    if (!response.error) {
      alert("Profile updated successfully!");
      setShowEditModal(false);
      // Optionally, refresh the profile data
      window.location.reload();
    } else {
      alert("Failed to update profile: " + response.error);
    }
  };

  // -------------------- Handle Profile Deletion --------------------
  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete your profile? This action cannot be undone.");
    if (!confirmDelete) return;

    const response = await deleteProfile();
    if (!response.error) {
      alert("Profile deleted successfully!");
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

              <label>Student #:</label>
              <input
                type='text'
                name='student_num'
                value={profile.student_num}
                onChange={handleInputChange}
                className='form-control'
                placeholder="xx-xxxxx-xxx"
              />

              <label>Program:</label>
              <select name="program" value={profile.program} onChange={handleInputChange} className="form-control">
                <option value="">Select Program</option>
                <option value="BSCS">BSCS</option>
                <option value="BSIT">BSIT</option>
                <option value="BSEMC">BSEMC</option>
                <option value="BSIS">BSIS</option>
              </select>

              {/* New Password (Editable) */}
              <label>New Password:</label>
              <div className="password-field">
                <input type={showNewPassword ? "text" : "password"} name="newPassword" value={profile.newPassword || ""} onChange={handleInputChange} className='form-control' placeholder="Enter new password" />
                <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`} onClick={() => setShowNewPassword(!showNewPassword)}></i>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className='custom-modal-footer'>
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
                  <p className='student-no'>Student # {profile.student_num}</p>
                  <p className='program'><b>Program:</b> {profile.program}</p>
                </div>
              </div>
            </div>

            <div className='col-12 col-md-7 col-lg-8'>
              <div className='container performance-container'>
                <div className='performance-content'>   
                  <p className='title'>Performance</p>
                  <span className='border border-dark'></span>
                  <div className='analysis'>
                    <h4>Graph Analysis</h4>
                    <div className='row graph'>
                      <div className='col-7 linear'>
                        <img src='/src/assets/graph.png' alt='graph'/>
                      </div>
                      <div className='col-3 bar'>
                        <img src='/src/assets/bar.png' alt='bar'/>
                      </div>
                    </div>
                    <h6>Strengths</h6>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                    <h6>Weaknesses</h6>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </>
  );
};