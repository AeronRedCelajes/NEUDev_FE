const API_LINK = import.meta.env.VITE_API_URL;
// Base API URL for backend

console.log("🔍 API_URL:", API_LINK);

//////////////////////////////////////////
// LOGIN/SIGNUP/LOGOUT FUNCTIONS
//////////////////////////////////////////

/**
 * Global API fetch wrapper that automatically adds the Authorization header
 * and intercepts 401 responses to force a logout.
 */
async function apiFetch(url, options = {}) {
  // Get token from sessionStorage
  const token = sessionStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // If unauthorized, clear sessionStorage
  if (response.status === 401) {
    sessionStorage.clear();

    alert("Your session has ended because your account was logged in elsewhere.");
    window.location.href = "/signin";
    throw new Error("Unauthorized. Forced logout.");
  }

  return response;
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

// Function to log in a user
// (Public endpoint: token not needed)
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

    // Save auth data in sessionStorage only
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("user_email", email);
    sessionStorage.setItem("user_type", data.user_type);
    if (data.user_type === "student" && data.studentID) {
      sessionStorage.setItem("userID", data.studentID);
    } else if (data.user_type === "teacher" && data.teacherID) {
      sessionStorage.setItem("userID", data.teacherID);
    }
    return data;
  } catch (error) {
    console.error("Login Error:", error.message);
    return { error: "Something went wrong during login." };
  }
}

// Function to log out a user (when clicking the logout button)
async function logout() {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "No user is logged in." };

  const response = await fetch(`${API_LINK}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (response.ok) {
    // Clear only sessionStorage when logging out explicitly
    sessionStorage.clear();
    return { message: "Logout successful" };
  }
  return { error: "Logout failed. Try again." };
}

// Function to verify password
async function verifyPassword(email, password) {
  const token = sessionStorage.getItem("access_token");
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

// Function to check if user is logged in
function hasAccessToken() {
    return sessionStorage.getItem("access_token") !== null;
}

// Function to get the stored user role
function getUserRole() {
    return sessionStorage.getItem("user_type") || null;
}

//////////////////////////////////////////
// OTHER PROTECTED FUNCTIONS (Use apiFetch)
//////////////////////////////////////////

// Function to get user info (protected)
async function getUserInfo() {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  const response = await apiFetch(`${API_LINK}/user`, {
    method: "GET"
  });
  const data = await response.json();
  console.log("🔍 User Info Response:", data);
  if (!data.error) {
    sessionStorage.setItem("user_type", data.user_type);
    if (data.user_type === "student" && data.studentID) {
      sessionStorage.setItem("userID", data.studentID);
    } else if (data.user_type === "teacher" && data.teacherID) {
      sessionStorage.setItem("userID", data.teacherID);
    } else {
      return { error: "User data is incomplete" };
    }
  }
  return data;
}

// Function to get user profile (protected)
async function getProfile() {
  const token = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_type");
  const userID = sessionStorage.getItem("userID");

  if (!token || !role || !userID) {
    return { error: "Unauthorized access: Missing credentials" };
  }

  const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  const response = await apiFetch(`${API_LINK}/${endpoint}`, {
    method: "GET"
  });
  const data = await response.json();
  if (!data.error) {
    const instructorName = `${data.firstname} ${data.lastname}`;
    sessionStorage.setItem("instructor_name", instructorName);
  }
  return data;
}

// Function to update user profile (protected)
async function updateProfile(profileData) {
  const token = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_type");
  const userID = sessionStorage.getItem("userID");

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

// Function to delete user profile (protected)
async function deleteProfile() {
  const token = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_type");
  const userID = sessionStorage.getItem("userID");

  if (!token || !role || !userID) return { error: "Unauthorized access" };

  const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  const response = await apiFetch(`${API_LINK}/${endpoint}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const data = await response.json();
  if (!data.error) {
    sessionStorage.clear();
    return { message: "Profile deleted successfully" };
  }
  return { error: "Failed to delete profile" };
}

//////////////////////////////////////////
// CLASS FUNCTIONS (STUDENTS) - Protected
//////////////////////////////////////////

async function enrollInClass(classID) {
  const token = sessionStorage.getItem("access_token");
  const studentID = sessionStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await apiFetch(`${API_LINK}/student/class/${classID}/enroll`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ studentID })
  }).then(res => res.json());
}

async function unenrollFromClass(classID) {
  const token = sessionStorage.getItem("access_token");
  const studentID = sessionStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await apiFetch(`${API_LINK}/class/${classID}/unenroll`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }).then(res => res.json());
}

async function getStudentClasses() {
  const token = sessionStorage.getItem("access_token");
  const studentID = sessionStorage.getItem("userID");
  if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

  return await apiFetch(`${API_LINK}/student/classes`, {
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
// CLASS FUNCTIONS (TEACHERS) - Protected
//////////////////////////////////////////

async function getClasses() {
  const token = sessionStorage.getItem("access_token");
  const teacherID = sessionStorage.getItem("userID");
  if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

  return await apiFetch(`${API_LINK}/teacher/classes`, { 
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
  const token = sessionStorage.getItem("access_token");
  const teacherID = sessionStorage.getItem("userID");
  if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

  // Append the query parameter "archived=1" so that the backend returns archived classes.
  return await apiFetch(`${API_LINK}/teacher/classes?archived=1`, { 
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/class`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/class/${classID}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }).then(res => res.json());
}

async function updateClass(classID, updatedData) {
  const token = sessionStorage.getItem("access_token");
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/class-info/${classID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getClassStudents(classID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/class/${classID}/students`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function unenrollStudent(classID, studentID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/class/${classID}/unenroll/${studentID}`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await apiFetch(`${API_LINK}/teacher/class/${classID}/bulletin`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createBulletinPost(classID, title, message) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await apiFetch(`${API_LINK}/teacher/bulletin`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ classID, title, message })
  }).then(res => res.json());
}

async function deleteBulletinPost(postID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access" };

  return await apiFetch(`${API_LINK}/teacher/bulletin/${postID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// CONCERN FUNCTIONS
//////////////////////////////////////////

export const getConcerns = async (classID) => {
  try {
    const token = sessionStorage.getItem("access_token");
    const response = await apiFetch(`${API_LINK}/concerns/${classID}`, {
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
    const token = sessionStorage.getItem("access_token");
    const response = await apiFetch(`${API_LINK}/concerns/detail/${concernID}`, {
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
    const token = sessionStorage.getItem("access_token");
    const response = await apiFetch(`${API_LINK}/concerns`, {
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
    const token = sessionStorage.getItem("access_token");
    const response = await apiFetch(`${API_LINK}/concerns/${concernID}`, {
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
    const token = sessionStorage.getItem("access_token");
    const response = await apiFetch(`${API_LINK}/concerns/${concernID}`, {
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
  const token = sessionStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/student/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createActivity(activityData) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
    
  return await apiFetch(`${API_LINK}/teacher/activities`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await apiFetch(`${API_LINK}/teacher/activities/${actID}`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await apiFetch(`${API_LINK}/teacher/activities/${actID}`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  const response = await apiFetch(`${API_LINK}/teacher/class/${classID}/activities`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("🟢 API Response from getClassActivities:", response);
  return await response.json();
}

async function getActivityDetails(actID) {
  const token = sessionStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/activities/${actID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (STUDENT)
//////////////////////////////////////////

async function getActivityItemsByStudent(actID) {
  const token = sessionStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/student/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivityLeaderboardByStudent(actID) {
  const token = sessionStorage.getItem("access_token"); 
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/student/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (TEACHERS)
//////////////////////////////////////////

async function getActivityItemsByTeacher(actID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/activities/${actID}/items`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivityLeaderboardByTeacher(actID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/activities/${actID}/leaderboard`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getActivitySettingsTeacher(actID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function updateActivitySettingsTeacher(actID, settings) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/itemTypes`, { 
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

/**
 * Fetch items by itemTypeID, optionally including query parameters.
 */
async function getItems(itemTypeID, query = {}) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  let url = `${API_LINK}/teacher/items/itemType/${itemTypeID}`;
  const queryString = new URLSearchParams(query).toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  console.log("📥 Fetching items from:", url);
  return await apiFetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getItemsByItemType(itemTypeID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/items/itemType/${itemTypeID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getItemDetails(itemID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function createItem(itemData) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/items`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(itemData)
  }).then(res => res.json());
}

async function deleteItem(itemID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/items/${itemID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function getProgrammingLanguages() {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  return await apiFetch(`${API_LINK}/teacher/programmingLanguages`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// ACTIVITY ASSESSMENT FUNCTIONS
//////////////////////////////////////////

async function finalizeSubmission(actID, submissionData) {
  console.log("Submitting Data:", submissionData);
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await apiFetch(`${API_LINK}/student/activities/${actID}/submission`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await apiFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };

  try {
    const response = await apiFetch(`${API_LINK}/student/activities/${actID}/submission/${submissionID}`, {
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
  const role = sessionStorage.getItem("user_type");
  if (role === "teacher") {
    return `${API_LINK}/teacher/activities/${actID}/progress`;
  }
  return `${API_LINK}/student/activities/${actID}/progress`;
}

async function getActivityProgress(actID) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await apiFetch(endpoint, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

async function saveActivityProgress(actID, progressData) {
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await apiFetch(endpoint, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  const endpoint = getProgressEndpoint(actID);
  return await apiFetch(endpoint, {
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
  const token = sessionStorage.getItem("access_token");
  if (!token) return { error: "Unauthorized access: No token found" };
  return await apiFetch(`${API_LINK}/teacher/activities/${actID}/review`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  }).then(res => res.json());
}

//////////////////////////////////////////
// EXPORT FUNCTIONS
//////////////////////////////////////////

export { 
  apiFetch,
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