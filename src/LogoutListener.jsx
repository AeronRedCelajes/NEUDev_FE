import { useEffect } from "react";
import { getCurrentUserID, clearSessionData } from "./components/api/API";

const LogoutListener = () => {
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key && event.key.startsWith("logout_")) {
                const loggedOutUserID = event.key.replace("logout_", ""); // Extract userID
                const currentUserID = String(getCurrentUserID());
                // Only log out if the current tab's user matches the logout event
                if (loggedOutUserID === currentUserID) {
                    console.log(`🚨 Logout detected for user ${currentUserID}. Clearing session...`);
                    clearSessionData();
                    window.location.href = "/signin"; // Redirect to sign-in page
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    return null;
};

export default LogoutListener;