import { Navigate } from "react-router-dom";

export default function AuthGuard({ children }) {
    const isAuthenticated = () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const expiry = payload.exp * 1000;
            return Date.now() < expiry;
        } catch {
            return false;
        }
    };

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
