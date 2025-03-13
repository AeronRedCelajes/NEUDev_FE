import { Navigate, Outlet } from "react-router-dom";
import { getSessionData } from "./components/api/API"; 

const ProtectedRoute = ({ allowedRoles }) => {
    const sessionData = getSessionData();
    const userRole = sessionData.user_type;

    if (!userRole || !allowedRoles.includes(userRole)) {
        return <Navigate to="/signin" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
