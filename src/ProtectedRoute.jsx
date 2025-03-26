import { Navigate, Outlet } from "react-router-dom";
import { getSessionData, clearSessionData } from "./components/api/API";

const ProtectedRoute = ({ allowedRoles }) => {
    // 🟢 Use **per-tab session data** instead of global session data
    const sessionData = getSessionData(); 
    console.log("Session Data:", sessionData);
    const userRole = sessionData.user_type;
    const token = sessionData.access_token;

    // 🔴 If session data is missing or role is incorrect, force logout & redirect
    if (!userRole || !allowedRoles.includes(userRole) || !token) {
        clearSessionData(); // Prevents users from getting stuck in invalid states
        return <Navigate to="/signin" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;