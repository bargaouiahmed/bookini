import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthService from "../services/AuthService";

export default function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const loginUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await AuthService.login(formData);
            if (response) {
                setError(null);
                const returnTo = location.state?.returnTo || "/calendar";
                navigate(returnTo);
            }
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={loginUser} className="auth-form">
            <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={onChange}
                    placeholder="Enter your username"
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    placeholder="Enter your password"
                    required
                />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
            </button>
            {error && <p className="auth-error">{error.response?.data?.message || "Login failed"}</p>}
        </form>
    );
}