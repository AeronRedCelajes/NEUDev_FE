import { useEffect } from "react";
import { clearSessionData, getSessionData } from "./components/api/API";

const LogoutListener = () => {
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key && event.key.startsWith("logout_")) {
                const loggedOutKey = event.key.replace("logout_", ""); // e.g., "student_2" or "teacher_1"
                const session = getSessionData();
                const currentKey = session.user_type && session.userID ? `${session.user_type}_${session.userID}` : null;
                if (loggedOutKey === currentKey) {
                    console.log(`🚨 Logout detected for ${currentKey}. Clearing session...`);
                    clearSessionData();
                    window.location.href = "/signin";
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
