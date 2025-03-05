const API_LINK = import.meta.env.VITE_API_URL;
// Base API URL for backend

console.log("🔍 API_URL:", API_LINK);

//////////////////////////////////////////
// LOGIN/SIGNUP/LOGOUT FUNCTIONS
//////////////////////////////////////////

// Function to register a user (student or teacher)
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

// Function to log out a user
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
        sessionStorage.clear();
        localStorage.clear();
        return { message: "Logout successful" };
    }
    return { error: "Logout failed. Try again." };
}

// Function to verify password
async function verifyPassword(email, password) {
    try {
      const response = await fetch(`${API_LINK}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" }
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

// Function to get user info
async function getUserInfo() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    const data = await safeFetch(`${API_LINK}/user`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

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

// Function to get the stored user role
function getUserRole() {
    return sessionStorage.getItem("user_type") || null;
}

//////////////////////////////////////////
// PROFILE PAGE FUNCTIONS
//////////////////////////////////////////

async function getProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    if (!token || !role || !userID) {
        return { error: "Unauthorized access: Missing credentials" };
    }

    const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;

    const response = await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.error) {
        const instructorName = `${response.firstname} ${response.lastname}`;
        sessionStorage.setItem("instructor_name", instructorName);
    }
    return response;
}

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
  
    try {
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
    } catch (error) {
      console.error("API Error:", error);
      return { error: "Something went wrong." };
    }
}

async function deleteProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    if (!token || !role || !userID) return { error: "Unauthorized access" };

    const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;

    const response = await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.error) {
        sessionStorage.clear();
        return { message: "Profile deleted successfully" };
    }
    return { error: "Failed to delete profile" };
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

//////////////////////////////////////////
// CLASS FUNCTIONS (STUDENTS)
//////////////////////////////////////////

async function enrollInClass(classID) {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID");
    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/student/class/${classID}/enroll`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ studentID })
    });
}

async function unenrollFromClass(classID) {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID");
    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/class/${classID}/unenroll`, {
        method: "DELETE",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}

async function getStudentClasses() {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID");
    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/student/classes`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    }).then(response => {
        if (!response.error) {
            return response.map(cls => ({
                classID: cls.classID,
                className: cls.className,
                classSection: cls.classSection,
                teacherName: cls.teacherName
            }));
        }
        return response;
    });
}

//////////////////////////////////////////
// CLASS FUNCTIONS (TEACHERS)
//////////////////////////////////////////

async function getClasses() {
    const token = sessionStorage.getItem("access_token");
    const teacherID = sessionStorage.getItem("userID");
    if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

    return await safeFetch(`${API_LINK}/teacher/classes`, { 
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    }).then(response => {
        if (!response.error) {
            return response.filter(cls => cls.teacherID == teacherID);
        }
        return response;
    });
}

async function createClass(classData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    console.log("📤 Sending Class Data to Backend:", JSON.stringify(classData, null, 2));
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
    });
}

async function deleteClass(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}

async function updateClass(classID, updatedData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            className: updatedData.className.trim(),
            classSection: updatedData.classSection.trim()
        })
    });
}

async function getClassInfo(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class-info/${classID}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getClassStudents(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}/students`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function unenrollStudent(classID, studentID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}/unenroll/${studentID}`, {
        method: "DELETE",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}

//////////////////////////////////////////
// ACTIVITY FUNCTIONS
//////////////////////////////////////////

async function getStudentActivities() {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/student/activities`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function createActivity(activityData) {
    const token = sessionStorage.getItem("access_token");
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
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    try {
        const response = await fetch(`${API_LINK}/teacher/activities/${actID}`, {
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
        const response = await fetch(`${API_LINK}/teacher/activities/${actID}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
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

    const response = await safeFetch(`${API_LINK}/teacher/class/${classID}/activities`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("🟢 API Response from getClassActivities:", response);
    return response;
}

async function getActivityDetails(actID) {
    const token = sessionStorage.getItem("access_token"); 
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
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/student/activities/${actID}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getActivityLeaderboardByStudent(actID) {
    const token = sessionStorage.getItem("access_token"); 
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
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getActivityLeaderboardByTeacher(actID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/leaderboard`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getActivitySettingsTeacher(actID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function updateActivitySettingsTeacher(actID, settings) {
    const token = sessionStorage.getItem("access_token");
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

// ✅ Fetch available item types dynamically
async function getItemTypes() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/itemTypes`, { 
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

/**
 * Fetch items by itemTypeID, optionally including query parameters
 * such as scope=personal/global and teacherID=1, etc.
 *
 * Usage:
 *   getItems(1, { scope: "personal", teacherID: "1" })
 */
async function getItems(itemTypeID, query = {}) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };
  
    // Construct the base URL
    let url = `${API_LINK}/teacher/items/itemType/${itemTypeID}`;
  
    // Convert the query object to a query string
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
  

// Fetch all items for a specific item type.
async function getItemsByItemType(itemTypeID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/items/itemType/${itemTypeID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// Fetch a specific item (with test cases).
async function getItemDetails(itemID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// Create a new item (with test cases).
async function createItem(itemData) {
    const token = sessionStorage.getItem("access_token");
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

// Update an existing item.
async function updateItem(itemID, itemData) {
    const token = sessionStorage.getItem("access_token");
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

// Delete an item.
async function deleteItem(itemID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/items/${itemID}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getProgrammingLanguages() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/programmingLanguages`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

//////////////////////////////////////////
// EXPORT FUNCTIONS
//////////////////////////////////////////

export { 
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
    getProgrammingLanguages
};