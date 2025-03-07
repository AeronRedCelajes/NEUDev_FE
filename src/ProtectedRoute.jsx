import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
    const userRole = sessionStorage.getItem("user_type");

    if (!userRole || !allowedRoles.includes(userRole)) {
        return <Navigate to="/signin" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
