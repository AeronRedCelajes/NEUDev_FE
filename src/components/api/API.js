const API_LINK = import.meta.env.VITE_API_URL;
// Base API URL for backend

console.log("🔍 API_URL:", API_LINK);

//////////////////////////////////////////
// LOGIN/SIGNUP/LOGOUT FUNCTIONS
//////////////////////////////////////////

// /**
//  * Global API fetch wrapper that automatically adds the Authorization header
//  * and intercepts 401 responses to force a logout.
//  */
// async function safeFetch(url, options = {}) {
//   // Get token from localStorage
//   const token = localStorage.getItem("access_token");

//   const headers = {
//     "Content-Type": "application/json",
//     ...(options.headers || {})
//   };
//   if (token) {
//     headers["Authorization"] = `Bearer ${token}`;
//   }

//   const response = await fetch(url, {
//     ...options,
//     headers
//   });

//   // If unauthorized, clear localStorage
//   if (response.status === 401) {
//     localStorage.clear();

//     alert("Your session has ended because your account was logged in elsewhere.");
//     window.location.href = "/signin";
//     throw new Error("Unauthorized. Forced logout.");
//   }

//   return response;
// }

// // Generate or retrieve a unique ID for the current tab
// function getTabId() {
//   let tabId = sessionStorage.getItem("tabId");
//   if (!tabId) {
//     tabId = '_' + Math.random().toString(36).substr(2, 9);
//     sessionStorage.setItem("tabId", tabId);
//   }
//   return tabId;
// }

// // Save session data for the current tab in localStorage
// function setSessionData(data) {
//   const tabId = getTabId();
//   localStorage.setItem("session_" + tabId, JSON.stringify(data));
// }

// // Retrieve session data for the current tab from localStorage
// function getSessionData() {
//   const tabId = getTabId();
//   const sessionData = localStorage.getItem("session_" + tabId);
//   return sessionData ? JSON.parse(sessionData) : {};
// }

// // Clear session data for the current tab
// function clearSessionData() {
//   const tabId = getTabId();
//   localStorage.removeItem("session_" + tabId);
//   sessionStorage.removeItem("tabId");
// }

// Generate or retrieve a unique ID for the current tab
function getTabId() {
  let tabId = sessionStorage.getItem("tabId");
  if (!tabId) {
    tabId = '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("tabId", tabId);
  }
  return tabId;
}

/**
 * Save session data.
 * Stores both per-tab session & per-user global session.
 */
function setSessionData(data) {
  const tabId = getTabId();
  localStorage.setItem(`session_${tabId}`, JSON.stringify(data)); // Per-tab session
  localStorage.setItem(`session_user_${data.userID}`, JSON.stringify(data)); // Global session for this user
}

/**
 * Retrieve session data for the current tab.
 * Ideally, each tab should have its own session data.
 */
function getSessionData() {
  const tabId = getTabId();
  const sessionData = localStorage.getItem(`session_${tabId}`);
  return sessionData ? JSON.parse(sessionData) : {};
}

/**
 * Get the current logged-in user's ID from the per-tab session.
 */
function getCurrentUserID() {
  const session = getSessionData();
  return session.userID || null;
}

/**
 * Clear session data only for the current tab.
 * (Do not clear global session here to avoid affecting other tabs.)
 */
function clearSessionData() {
  const tabId = getTabId();
  localStorage.removeItem(`session_${tabId}`);
  sessionStorage.removeItem("tabId");
}


//////////////////////////////////////////
// GLOBAL FETCH WRAPPER
//////////////////////////////////////////

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (response.status === 204) return { message: "Success" };
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      return { error: data?.message || `Request failed with status ${response.status}`, details: data };
    }
    return data || { message: "Success" };
  } catch (error) {
    console.error("Network/API Error:", error);
    return { error: "Network error or invalid response." };
  }
}

//////////////////////////////////////////
// LOGIN/SIGNUP/LOGOUT FUNCTIONS
//////////////////////////////////////////

// Function to register a user (student or teacher)
// (Public endpoint: token not needed)
async function register(firstname, lastname, email, student_num, program, password) {
  try {
    let endpoint = `${API_LINK}/register/teacher`; // Default to teacher registration
    let payload = { firstname, lastname, email, password };

    // If student fields are provided, switch to student registration
    if (student_num && program) {
      endpoint = `${API_LINK}/register/student`;
      payload.student_num = student_num;
      payload.program = program;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message || "Registration failed", details: data.errors || {} };
    }
    return data;
  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    return { error: "Something went wrong during registration." };
  }
}

/*
  Login:
  Instead of storing a global token in localStorage,
  we store it under a key that includes a unique tabId.
  This allows different tabs to have different sessions (different accounts)
  or share the same session if desired.
*/
async function login(email, password) {
  try {
    const response = await fetch(`${API_LINK}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message || "Login failed" };
    }

    const sessionData = {
      access_token: data.access_token,
      user_type: data.user_type,
      userID: data.user_type === "student" ? data.studentID : data.teacherID,
      email: data.email
    };

    setSessionData(sessionData);
    return data;
  } catch (error) {
    console.error("Login Error:", error.message);
    return { error: "Something went wrong during login." };
  }
}

/**
 * Logout function - logs out the current tab and broadcasts a logout event.
 */
async function logout() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const userID = sessionData.userID;

  if (!token || !userID) return { error: "No user is logged in." };

  const response = await fetch(`${API_LINK}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (response.ok) {
    // Broadcast logout event for this user
    localStorage.setItem(`logout_${userID}`, Date.now());
    clearSessionData(); // Clear only this tab's session
    return { message: "Logout successful" };
  }

  return { error: "Logout failed. Try again." };
}


/*
  Verify password using the current tab session token.
*/
async function verifyPassword(email, password) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  try {
    const response = await fetch(`${API_LINK}/verify-password`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.message || "Wrong password" };
    }
    return { success: true };
  } catch (error) {
    console.error("❌ verifyPassword Error:", error);
    return { error: "Something went wrong while verifying the password." };
  }
}

/*
  Utility functions to check authentication status using the current tab session.
*/
function hasAccessToken() {
  const sessionData = getSessionData();
  return sessionData.access_token !== undefined;
}

function getUserRole() {
  const sessionData = getSessionData();
  return sessionData.user_type || null;
}

//////////////////////////////////////////
// PROFILE FUNCTIONS
//////////////////////////////////////////

/*
  getUserInfo:
  Retrieves fresh user data from the backend and updates the current tab's session data.
  This updates fields such as email, userID, and user_type.
*/
async function getUserInfo() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  const data = await safeFetch(`${API_LINK}/user`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
});

  console.log("🔍 User Info Response:", data);
  if (!data.error) {
    // Merge fresh data into the session. Now also update the email.
    const updatedData = {
      ...sessionData,
      user_type: data.user_type,
      userID: data.user_type === "student" ? data.studentID : data.teacherID,
      email: data.email  // Update email in session data.
    };
    setSessionData(updatedData);
  }
  return data;
}

/*
  getProfile: Retrieves the user profile based on the current tab's session data.
*/
async function getProfile() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const role = sessionData.user_type;
  const userID = sessionData.userID;

  if (!token || !role || !userID) {
    return { error: "Unauthorized access: Missing credentials" };
  }

  const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  const data = await safeFetch(`${API_LINK}/${endpoint}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
});

  if (!data.error) {
    const instructorName = `${data.firstname} ${data.lastname}`;
    // Optionally update the session with instructor name.
    const updatedData = { ...sessionData, instructor_name: instructorName };
    // Optionally, update email if returned.
    if (data.email) {
      updatedData.email = data.email;
    }
    setSessionData(updatedData);
  }
  return data;
}

/*
  updateProfile: Updates the user profile for the current tab's session.
*/
async function updateProfile(profileData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const role = sessionData.user_type;
  const userID = sessionData.userID;
  if (!token || !role || !userID) return { error: "Unauthorized access" };

  const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  const formData = new FormData();
  formData.append("_method", "PUT");

  Object.keys(profileData).forEach((key) => {
    if (key === "profileImage" || key === "coverImage") return;
    if (key === "newPassword") {
      if (profileData.newPassword && profileData.newPassword.trim() !== "") {
        formData.append("password", profileData.newPassword);
      }
    } else {
      if (profileData[key] !== "" && profileData[key] !== null && profileData[key] !== undefined) {
        formData.append(key, profileData[key]);
      }
    }
  });

  if (profileData.profileImage && profileData.profileImage instanceof File) {
    formData.append("profileImage", profileData.profileImage);
  }
  if (profileData.coverImage && profileData.coverImage instanceof File) {
    formData.append("coverImage", profileData.coverImage);
  }

  const response = await fetch(`${API_LINK}/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    },
    body: formData,
    credentials: "include"
  });
  const data = await response.json();
  return response.ok ? data : { error: data.message || "Request failed", details: data };
}

/*
  deleteProfile: Deletes the user profile and clears the current tab's session.
*/
async function deleteProfile() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const role = sessionData.user_type;
  const userID = sessionData.userID;

  if (!token || !role || !userID) return { error: "Unauthorized access" };

  const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  // Using safeFetch here already returns parsed JSON.
  const data = await safeFetch(`${API_LINK}/${endpoint}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!data.error) {
    clearSessionData();
    return { message: "Profile deleted successfully" };
  }
  return { error: "Failed to delete profile" };
}

//////////////////////////////////////////
// CLASS FUNCTIONS (STUDENTS)
//////////////////////////////////////////

async function enrollInClass(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const studentID = sessionData.userID;
  if (!token || !studentID) {
    return { error: "Unauthorized access: No token or student ID found" };
  }

  const data = await safeFetch(`${API_LINK}/student/class/${classID}/enroll`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ studentID })
  });
  return data;
}

async function unenrollFromClass(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const studentID = sessionData.userID;
  if (!token || !studentID) {
    return { error: "Unauthorized access: No token or student ID found" };
  }

  const data = await safeFetch(`${API_LINK}/class/${classID}/unenroll`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  return data;
}

async function getStudentClasses() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const studentID = sessionData.userID;
  if (!token || !studentID) {
    return { error: "Unauthorized access: No token or student ID found" };
  }

  const data = await safeFetch(`${API_LINK}/student/classes`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  // Assuming the returned data is already parsed JSON containing the classes.
  return data;
}


//////////////////////////////////////////
// CLASS FUNCTIONS (TEACHERS)
//////////////////////////////////////////

async function getClasses() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const teacherID = sessionData.userID;
  if (!token || !teacherID) {
    return { error: "Unauthorized access: No token or teacher ID found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/classes`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!data.error && Array.isArray(data)) {
    // Filter out classes that are not active (activeClass false)
    return data.filter(cls => cls.teacherID == teacherID && cls.activeClass);
  }
  return data;
}

async function getArchivedClasses() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  const teacherID = sessionData.userID;
  if (!token || !teacherID) {
    return { error: "Unauthorized access: No token or teacher ID found" };
  }

  // Append the query parameter "archived=1" so that the backend returns archived classes.
  const data = await safeFetch(`${API_LINK}/teacher/classes?archived=1`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!data.error && Array.isArray(data)) {
    // Although the server should return only inactive classes,
    // you can further filter if needed:
    return data.filter(cls => cls.teacherID == teacherID && !cls.activeClass);
  }
  return data;
}

async function createClass(classData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/class`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      className: classData.className.trim(),
      classSection: classData.classSection.trim()
    })
  });
  return data;
}

async function deleteClass(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  });
  return data;
}

async function updateClass(classID, updatedData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const formData = new FormData();
  formData.append("_method", "PUT");

  // Append text fields
  if (updatedData.className && updatedData.className.trim() !== "") {
    formData.append("className", updatedData.className.trim());
  }
  if (updatedData.classSection && updatedData.classSection.trim() !== "") {
    formData.append("classSection", updatedData.classSection.trim());
  }
  // Append activeClass field (convert boolean to "1" or "0")
  if (updatedData.hasOwnProperty("activeClass")) {
    formData.append("activeClass", updatedData.activeClass ? "1" : "0");
  }

  // Append cover image: similar to how profile update works
  if (updatedData.classCoverPhoto && updatedData.classCoverPhoto instanceof File) {
    formData.append("classCoverImage", updatedData.classCoverPhoto);
  } else if (updatedData.classCoverPhoto && typeof updatedData.classCoverPhoto === "string") {
    // If the cover photo is already a URL string, send it as is
    formData.append("classCoverImage", updatedData.classCoverPhoto);
  }

  const response = await fetch(`${API_LINK}/teacher/class/${classID}`, {
    method: "POST", // Using POST with _method override for PUT
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    },
    body: formData,
    credentials: "include"
  });
  const data = await response.json();
  return response.ok ? data : { error: data.message || "Request failed", details: data };
}

async function getClassInfo(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/class-info/${classID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return data;
}

async function getClassStudents(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/class/${classID}/students`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return data;
}

async function unenrollStudent(classID, studentID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) {
    return { error: "Unauthorized access: No token found" };
  }

  const data = await safeFetch(`${API_LINK}/teacher/class/${classID}/unenroll/${studentID}`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  return data;
}

//////////////////////////////////////////
// BULLETIN FUNCTIONS (Teachers & Concerns)
//////////////////////////////////////////

async function getBulletinPosts(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/class/${classID}/bulletin`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function createBulletinPost(classID, title, message) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/bulletin`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ classID, title, message })
  });
}

async function deleteBulletinPost(postID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/bulletin/${postID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

//////////////////////////////////////////
// CONCERN FUNCTIONS
//////////////////////////////////////////

export const getConcerns = async (classID) => {
  try {
    const sessionData = getSessionData();
    const token = sessionData.access_token;
    return await safeFetch(`${API_LINK}/concerns/${classID}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (error) {
    return { error: error.message };
  }
};

export const getConcernDetail = async (concernID) => {
  try {
    const sessionData = getSessionData();
    const token = sessionData.access_token;
    return await safeFetch(`${API_LINK}/concerns/detail/${concernID}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (error) {
    return { error: error.message };
  }
};

export const createConcern = async (concernData) => {
  try {
    const sessionData = getSessionData();
    const token = sessionData.access_token;
    return await safeFetch(`${API_LINK}/concerns`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(concernData)
    });
  } catch (error) {
    return { error: error.message };
  }
};

export const updateConcern = async (concernID, updateData) => {
  try {
    const sessionData = getSessionData();
    const token = sessionData.access_token;
    return await safeFetch(`${API_LINK}/concerns/${concernID}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteConcern = async (concernID) => {
  try {
    const sessionData = getSessionData();
    const token = sessionData.access_token;
    return await safeFetch(`${API_LINK}/concerns/${concernID}`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error("Error in deleteConcern:", error);
    return { error: error.message };
  }
};

//////////////////////////////////////////
// ACTIVITY FUNCTIONS
//////////////////////////////////////////

async function getStudentActivities() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function createActivity(activityData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };
    
  return await safeFetch(`${API_LINK}/teacher/activities`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(activityData)
  });
}

async function editActivity(actID, updatedData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const result = await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedData)
    });
    // Use the result directly since it's already parsed
    if (result.error) {
      return { error: result.message || "Failed to update activity", details: result };
    }
    return result;
  } catch (error) {
    console.error("❌ API Error (Edit Activity):", error);
    return { error: "Something went wrong while updating the activity." };
  }
}

async function deleteActivity(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const result = await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    // Use the parsed result directly
    if (result.error) {
      return { error: result.message || "Failed to delete activity" };
    }
    return { message: "Activity deleted successfully" };
  } catch (error) {
    console.error("❌ API Error (Delete Activity):", error);
    return { error: "Something went wrong while deleting the activity." };
  }
}

async function getClassActivities(classID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  const result = await safeFetch(`${API_LINK}/teacher/class/${classID}/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("🟢 API Response from getClassActivities:", result);
  return result;
}

async function getActivityDetails(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token; 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (STUDENT)
//////////////////////////////////////////

async function getActivityItemsByStudent(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token; 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getActivityLeaderboardByStudent(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token; 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (TEACHERS)
//////////////////////////////////////////

async function getActivityItemsByTeacher(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getActivityLeaderboardByTeacher(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getActivitySettingsTeacher(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function updateActivitySettingsTeacher(actID, settings) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });
}

//////////////////////////////////////////
// ITEM & TEST CASES MANAGEMENT
//////////////////////////////////////////

async function getItemTypes() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/itemTypes`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

/**
 * Fetch items by itemTypeID, optionally including query parameters.
 */
async function getItems(itemTypeID, query = {}) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  let url = `${API_LINK}/teacher/items/itemType/${itemTypeID}`;
  const queryString = new URLSearchParams(query).toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  console.log("📥 Fetching items from:", url);
  return await safeFetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getItemsByItemType(itemTypeID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/itemType/${itemTypeID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getItemDetails(itemID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function createItem(itemData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(itemData)
  });
}

async function updateItem(itemID, itemData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(itemData)
  });
}

async function deleteItem(itemID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function getProgrammingLanguages() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/programmingLanguages`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

//////////////////////////////////////////
// ACTIVITY ASSESSMENT FUNCTIONS
//////////////////////////////////////////

async function finalizeSubmission(actID, submissionData) {
  console.log("Submitting Data:", submissionData);
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const result = await safeFetch(`${API_LINK}/student/activities/${actID}/submission`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(submissionData)
    });
    console.log("Submission Response:", result);
    if (result.error) {
      return { error: result.message || "Failed to finalize submission", details: result };
    }
    return result;
  } catch (error) {
    console.error("Finalize Submission Error:", error);
    return { error: "Something went wrong while finalizing submission." };
  }
}

async function updateSubmission(actID, submissionID, submissionData) {
  console.log("Updating Submission:", submissionData);
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const result = await safeFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(submissionData)
    });
    console.log("Update Submission Response:", result);
    if (result.error) {
      return { error: result.message || "Failed to update submission", details: result };
    }
    return result;
  } catch (error) {
    console.error("Update Submission Error:", error);
    return { error: "Something went wrong while updating submission." };
  }
}

async function deleteSubmission(actID, submissionID) {
  console.log("Deleting Submission ID:", submissionID);
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const result = await safeFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    console.log("Delete Submission Response:", result);
    if (result.error) {
      return { error: result.message || "Failed to delete submission", details: result };
    }
    return result;
  } catch (error) {
    console.error("Delete Submission Error:", error);
    return { error: "Something went wrong while deleting submission." };
  }
}

//////////////////////////////////////////
// ACTIVITY / ASSESSMENT FUNCTIONS
//////////////////////////////////////////

// Helper function to determine the correct progress endpoint based on user role.
function getProgressEndpoint(actID) {
  const sessionData = getSessionData();
  const role = sessionData.user_type;
  if (role === "teacher") {
    return `${API_LINK}/teacher/activities/${actID}/progress`;
  }
  return `${API_LINK}/student/activities/${actID}/progress`;
}

async function getActivityProgress(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await safeFetch(endpoint, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}

async function saveActivityProgress(actID, progressData) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await safeFetch(endpoint, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(progressData)
  });
}

async function clearActivityProgress(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await safeFetch(endpoint, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  });
}

//////////////////////////////////////////
// ACTIVITY SUBMISSIONS FUNCTIONS
//////////////////////////////////////////

async function reviewSubmissions(actID) {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };
  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/review`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
}


//////////////////////////////////////////
// EXPORT FUNCTIONS
//////////////////////////////////////////

export { 
  getTabId,
  setSessionData,
  getSessionData,
  clearSessionData,
  getCurrentUserID,
  safeFetch,
  register, 
  login, 
  logout,
  verifyPassword,
  hasAccessToken, 
  getUserRole, 
  getProfile, 
  updateProfile, 
  deleteProfile, 
  getUserInfo,
  enrollInClass, 
  unenrollFromClass,
  getStudentClasses,
  getClasses, 
  createClass, 
  deleteClass,
  updateClass,
  getClassInfo,
  getClassStudents,
  unenrollStudent,
  getBulletinPosts,
  createBulletinPost,
  deleteBulletinPost,
  getStudentActivities,
  createActivity,
  editActivity,
  deleteActivity,
  getClassActivities, 
  getActivityDetails,
  getActivityItemsByStudent, 
  getActivityLeaderboardByStudent, 
  getActivityItemsByTeacher, 
  getActivityLeaderboardByTeacher,
  getActivitySettingsTeacher, 
  updateActivitySettingsTeacher,
  getItemTypes,
  getItems,
  getItemsByItemType,
  getItemDetails,
  createItem,
  updateItem,
  deleteItem,
  getProgrammingLanguages,
  finalizeSubmission,
  updateSubmission,
  deleteSubmission,
  getActivityProgress,
  saveActivityProgress,
  clearActivityProgress,
  reviewSubmissions,
  getArchivedClasses
};