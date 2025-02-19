const API_LINK = "http://127.0.0.1:8000/api"; // Base API URL for backend

// Function to register a user (student or teacher)
async function register(firstname, lastname, email, student_num, program, password) {
    try {
        let endpoint = `${API_LINK}/register/teacher`; // Default to teacher registration
        let payload = { firstname, lastname, email, password }; // Ensure password is always included

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
        console.log("API Response:", data); // Debugging output

        if (!response.ok) {
            return { error: data.message || "Login failed" };
        }

        // Extract and store authentication details
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_email", email);
        sessionStorage.setItem("user_type", data.user_type);

        // Store the correct ID based on userType
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

// Function to check if user is logged in
function hasAccessToken() {
    return sessionStorage.getItem("access_token") !== null;
}

// Function to get user info (used for determining role)
async function getUserInfo() {
    const token = sessionStorage.getItem("access_token");

    if (!token) return { error: "Unauthorized access: No token found" };

    const data = await safeFetch(`${API_LINK}/user`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("🔍 User Info Response:", data); // Debugging

    if (!data.error) {
        sessionStorage.setItem("user_type", data.user_type);

        // Store correct user ID
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

// Function to fetch the user's profile (Student or Teacher)
async function getProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    console.log("🔍 Access Token:", token);
    console.log("🔍 User Role:", role);
    console.log("🔍 User ID:", userID);

    if (!token || !role || !userID) return { error: "Unauthorized access: Missing credentials" };

    const endpoint = role === "student" ? `profile/student/${userID}` : `profile/teacher/${userID}`;

    return await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// Function to update the user's profile (Student or Teacher)
async function updateProfile(profileData) {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");
  
    if (!token || !role || !userID) return { error: "Unauthorized access" };
  
    // Determine endpoint based on user type
    const endpoint = role === "student" ? `profile/student/${userID}` : `profile/teacher/${userID}`;
  
    // Build FormData from profileData.
    // Make sure to include the _method override.
    const formData = new FormData();
    
    // Append the method override so PHP treats it as a PUT.
    formData.append("_method", "PUT");
  
    // Append text fields.
    Object.keys(profileData).forEach((key) => {
      if (key === "profileImage" || key === "coverImage") return; // Skip file fields for now.
      if (key === "newPassword") {
        // Map newPassword to password
        if (profileData.newPassword && profileData.newPassword.trim() !== "") {
          formData.append("password", profileData.newPassword);
        }
      } else {
        if (profileData[key] !== "" && profileData[key] !== null && profileData[key] !== undefined) {
          formData.append(key, profileData[key]);
        }
      }
    });
  
    // Append file fields if they exist and are File objects.
    if (profileData.profileImage && profileData.profileImage instanceof File) {
      formData.append("profileImage", profileData.profileImage);
    }
    if (profileData.coverImage && profileData.coverImage instanceof File) {
      formData.append("coverImage", profileData.coverImage);
    }
  
    try {
      const response = await fetch(`${API_LINK}/${endpoint}`, {
        // Use POST method since we include _method=PUT
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json" // Let the browser set the Content-Type automatically.
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


// Function to delete a user's profile
async function deleteProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    if (!token || !role || !userID) return { error: "Unauthorized access" };

    const endpoint = role === "student" ? `profile/student/${userID}` : `profile/teacher/${userID}`;

    const response = await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.error) {
        sessionStorage.clear(); // Clear session on deletion
        return { message: "Profile deleted successfully" };
    }

    return { error: "Failed to delete profile" };
}


// Helper function for safe API calls
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);

        // Check if the response has content before parsing as JSON
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            return { error: data?.message || `Request failed with status ${response.status}`, details: data };
        }

        return data;
    } catch (error) {
        console.error("❌ API Error:", error);
        return { error: "Network error or invalid response." };
    }
}

// Exporting functions for use in other files
export { 
    register, 
    login, 
    logout, 
    hasAccessToken, 
    getUserRole, 
    getProfile, 
    updateProfile, 
    deleteProfile, 
    getUserInfo 
};