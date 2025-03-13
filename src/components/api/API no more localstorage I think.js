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

// Generate or retrieve a unique ID for the current tab
function getTabId() {
  let tabId = sessionStorage.getItem("tabId");
  if (!tabId) {
    tabId = '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("tabId", tabId);
  }
  return tabId;
}

// Save session data for the current tab in localStorage
function setSessionData(data) {
  const tabId = getTabId();
  localStorage.setItem("session_" + tabId, JSON.stringify(data));
}

// Retrieve session data for the current tab from localStorage
function getSessionData() {
  const tabId = getTabId();
  const sessionData = localStorage.getItem("session_" + tabId);
  return sessionData ? JSON.parse(sessionData) : {};
}

// Clear session data for the current tab
function clearSessionData() {
  const tabId = getTabId();
  localStorage.removeItem("session_" + tabId);
  sessionStorage.removeItem("tabId");
}

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
    console.log("API Response:", data);

    if (!response.ok) {
      return { error: data.message || "Login failed" };
    }

    // Save auth data for this tab's session in localStorage
    // Note: We no longer store user_email since it can be fetched from the DB later.
    const sessionData = {
      access_token: data.access_token,
      user_type: data.user_type,
      userID: data.user_type === "student" ? data.studentID : data.teacherID
    };
    setSessionData(sessionData);
    return data;
  } catch (error) {
    console.error("Login Error:", error.message);
    return { error: "Something went wrong during login." };
  }
}

/*
  Logout: Clears only the session data for the current tab.
*/
async function logout() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "No user is logged in." };

  const response = await fetch(`${API_LINK}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (response.ok) {
    clearSessionData();
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

// Function to check if user is logged in
function hasAccessToken() {
  const sessionData = getSessionData();
  return sessionData.access_token !== undefined;
}

// Function to get the stored user role
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
  This can update fields such as user_email if needed.
*/
async function getUserInfo() {
  const sessionData = getSessionData();
  const token = sessionData.access_token;
  if (!token) return { error: "Unauthorized access: No token found" };

  const response = await safeFetch(`${API_LINK}/user`, {
    method: "GET"
  });
  const data = await response.json();
  console.log("🔍 User Info Response:", data);
  if (!data.error) {
    // Merge fresh data into the session. For example, if the backend returns an email:
    const updatedData = {
      ...sessionData,
      user_type: data.user_type,
      userID: data.user_type === "student" ? data.studentID : data.teacherID,
      // Optionally: email: data.email
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
  const response = await safeFetch(`${API_LINK}/${endpoint}`, {
    method: "GET"
  });
  const data = await response.json();
  if (!data.error) {
    const instructorName = `${data.firstname} ${data.lastname}`;
    // Optionally update the session with instructor name
    const updatedData = { ...sessionData, instructor_name: instructorName };
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
  const response = await safeFetch(`${API_LINK}/${endpoint}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const data = await response.json();
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
  const token = localStorage.getItem("access_token");
  const studentID = localStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await safeFetch(`${API_LINK}/student/class/${classID}/enroll`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ studentID })
  }).then(res => res.json());
}

async function unenrollFromClass(classID) {
  const token = localStorage.getItem("access_token");
  const studentID = localStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await safeFetch(`${API_LINK}/class/${classID}/unenroll`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }).then(res => res.json());
}

async function getStudentClasses() {
  const token = localStorage.getItem("access_token");
  const studentID = localStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await safeFetch(`${API_LINK}/student/classes`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(async response => {
    const data = await response.json();
    if (!data.error) {
      return data; // Return all fields for each class object
    }
    return data;
  });
}


//////////////////////////////////////////
// CLASS FUNCTIONS (TEACHERS)
//////////////////////////////////////////

async function getClasses() {
  const token = localStorage.getItem("access_token");
  const teacherID = localStorage.getItem("userID");
  if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

  return await safeFetch(`${API_LINK}/teacher/classes`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(async response => {
    const data = await response.json();
    if (!data.error) {
      // Filter out classes that are not active (activeClass false)
      return data.filter(cls => cls.teacherID == teacherID && cls.activeClass);
    }
    return data;
  });
}

async function getArchivedClasses() {
  const token = localStorage.getItem("access_token");
  const teacherID = localStorage.getItem("userID");
  if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

  // Append the query parameter "archived=1" so that the backend returns archived classes.
  return await safeFetch(`${API_LINK}/teacher/classes?archived=1`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(async response => {
    const data = await response.json();
    if (!data.error) {
      // Although the server should now return only inactive classes,
      // you can further filter if needed:
      return data.filter(cls => cls.teacherID == teacherID && !cls.activeClass);
    }
    return data;
  });
}

async function createClass(classData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/class`, {
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
  }).then(res => res.json());
}

async function deleteClass(classID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }).then(res => res.json());
}

async function updateClass(classID, updatedData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

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
    method: "POST", // Use POST with _method override for PUT
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
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/class-info/${classID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getClassStudents(classID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/class/${classID}/students`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function unenrollStudent(classID, studentID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/class/${classID}/unenroll/${studentID}`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }).then(res => res.json());
}

//////////////////////////////////////////
// BULLETIN FUNCTIONS (Teachers & Concerns)
//////////////////////////////////////////

async function getBulletinPosts(classID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/class/${classID}/bulletin`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createBulletinPost(classID, title, message) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/bulletin`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ classID, title, message })
  }).then(res => res.json());
}

async function deleteBulletinPost(postID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await safeFetch(`${API_LINK}/teacher/bulletin/${postID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// CONCERN FUNCTIONS
//////////////////////////////////////////

export const getConcerns = async (classID) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await safeFetch(`${API_LINK}/concerns/${classID}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

export const getConcernDetail = async (concernID) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await safeFetch(`${API_LINK}/concerns/detail/${concernID}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

export const createConcern = async (concernData) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await safeFetch(`${API_LINK}/concerns`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(concernData)
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

export const updateConcern = async (concernID, updateData) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await safeFetch(`${API_LINK}/concerns/${concernID}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteConcern = async (concernID) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await safeFetch(`${API_LINK}/concerns/${concernID}`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log("Delete response:", data);
    return data;
  } catch (error) {
    console.error("Error in deleteConcern:", error);
    return { error: error.message };
  }
};

//////////////////////////////////////////
// ACTIVITY FUNCTIONS
//////////////////////////////////////////

async function getStudentActivities() {
  const token = localStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createActivity(activityData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
    
  return await safeFetch(`${API_LINK}/teacher/activities`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(activityData)
  }).then(res => res.json());
}

async function editActivity(actID, updatedData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedData)
    });
    const data = await response.json();
    return response.ok ? data : { error: data.message || "Failed to update activity", details: data };
  } catch (error) {
    console.error("❌ API Error (Edit Activity):", error);
    return { error: "Something went wrong while updating the activity." };
  }
}

async function deleteActivity(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    const data = await response.json();
    return response.ok ? { message: "Activity deleted successfully" } : { error: data.message || "Failed to delete activity" };
  } catch (error) {
    console.error("❌ API Error (Delete Activity):", error);
    return { error: "Something went wrong while deleting the activity." };
  }
}


async function getClassActivities(classID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  const response = await safeFetch(`${API_LINK}/teacher/class/${classID}/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("🟢 API Response from getClassActivities:", response);
  return await response.json();
}

async function getActivityDetails(actID) {
  const token = localStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (STUDENT)
//////////////////////////////////////////

async function getActivityItemsByStudent(actID) {
  const token = localStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivityLeaderboardByStudent(actID) {
  const token = localStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/student/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (TEACHERS)
//////////////////////////////////////////

async function getActivityItemsByTeacher(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivityLeaderboardByTeacher(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivitySettingsTeacher(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function updateActivitySettingsTeacher(actID, settings) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  }).then(res => res.json());
}

//////////////////////////////////////////
// ITEM & TEST CASES MANAGEMENT
//////////////////////////////////////////

async function getItemTypes() {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/itemTypes`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

/**
 * Fetch items by itemTypeID, optionally including query parameters.
 */
async function getItems(itemTypeID, query = {}) {
  const token = localStorage.getItem("access_token");
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
  }).then(res => res.json());
}

async function getItemsByItemType(itemTypeID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/itemType/${itemTypeID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getItemDetails(itemID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createItem(itemData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(itemData)
  }).then(res => res.json());
}

async function updateItem(itemID, itemData) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(itemData)
  }).then(res => res.json());
}

async function deleteItem(itemID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getProgrammingLanguages() {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await safeFetch(`${API_LINK}/teacher/programmingLanguages`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY ASSESSMENT FUNCTIONS
//////////////////////////////////////////

async function finalizeSubmission(actID, submissionData) {
  console.log("Submitting Data:", submissionData);
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await safeFetch(`${API_LINK}/student/activities/${actID}/submission`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(submissionData)
    });
    const data = await response.json();
    console.log("Submission Response:", data);
    return response.ok ? data : { error: data.message || "Failed to finalize submission", details: data };
  } catch (error) {
    console.error("Finalize Submission Error:", error);
    return { error: "Something went wrong while finalizing submission." };
  }
}

async function updateSubmission(actID, submissionID, submissionData) {
  console.log("Updating Submission:", submissionData);
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await safeFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(submissionData)
    });
    const data = await response.json();
    console.log("Update Submission Response:", data);
    return response.ok ? data : { error: data.message || "Failed to update submission", details: data };
  } catch (error) {
    console.error("Update Submission Error:", error);
    return { error: "Something went wrong while updating submission." };
  }
}

async function deleteSubmission(actID, submissionID) {
  console.log("Deleting Submission ID:", submissionID);
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await safeFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    const data = await response.json();
    console.log("Delete Submission Response:", data);
    return response.ok ? data : { error: data.message || "Failed to delete submission", details: data };
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
  const role = localStorage.getItem("user_type");
  if (role === "teacher") {
    return `${API_LINK}/teacher/activities/${actID}/progress`;
  }
  return `${API_LINK}/student/activities/${actID}/progress`;
}

async function getActivityProgress(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await safeFetch(endpoint, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function saveActivityProgress(actID, progressData) {
  const token = localStorage.getItem("access_token");
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
  }).then(res => res.json());
}

async function clearActivityProgress(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await safeFetch(endpoint, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY SUBMISSIONS FUNCTIONS
//////////////////////////////////////////

async function reviewSubmissions(actID) {
  const token = localStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  return await safeFetch(`${API_LINK}/teacher/activities/${actID}/review`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// EXPORT FUNCTIONS
//////////////////////////////////////////

export { 
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