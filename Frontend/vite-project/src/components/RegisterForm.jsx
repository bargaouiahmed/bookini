import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/AuthService";
import { CheckIcon, XIcon } from "./Icons";

export default function RegisterForm() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });
    const [enableSubmit, setEnableSubmit] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [has8Chars, setHas8Chars] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);
    const [hasUppercase, setHasUppercase] = useState(false);
    const [hasSymbol, setHasSymbol] = useState(false);

    const registerUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await AuthService.register(formData);
            setSuccess(true);
            setError(null);
            setTimeout(() => navigate("/login"), 1500);
        } catch (e) {
            setError(e);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const onChange = (e) => {
        const newFormData = { ...formData, [e.target.name]: e.target.value };
        setFormData(newFormData);

        const password = newFormData.password;
        const hasLength = password.length >= 8;
        const hasNum = /\d/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasSym = /[!@#$%^&*()_+[\]{}|;:',.<>?/`~]/.test(password);

        setHas8Chars(hasLength);
        setHasNumber(hasNum);
        setHasUppercase(hasUpper);
        setHasSymbol(hasSym);
        setEnableSubmit(hasLength && hasNum && hasUpper && hasSym);
    };

    const renderRequirement = (isValid, text) => (
        <li className={isValid ? "valid" : "invalid"}>
            {isValid ? <CheckIcon size={14} /> : <XIcon size={14} />}
            <span>{text}</span>
        </li>
    );

    return (
        <form onSubmit={registerUser} className="auth-form">
            <div className="form-group">
                <label htmlFor="reg-username">Username</label>
                <input
                    type="text"
                    id="reg-username"
                    name="username"
                    value={formData.username}
                    onChange={onChange}
                    placeholder="Choose a username"
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                    type="password"
                    id="reg-password"
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    placeholder="Create a password"
                    required
                />
            </div>
            <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                    {renderRequirement(has8Chars, "At least 8 characters")}
                    {renderRequirement(hasNumber, "At least one number")}
                    {renderRequirement(hasUppercase, "At least one uppercase letter")}
                    {renderRequirement(hasSymbol, "At least one special symbol")}
                </ul>
            </div>
            <button type="submit" className="auth-submit" disabled={!enableSubmit || loading}>
                {loading ? "Creating account..." : "Register"}
            </button>
            {error && <p className="auth-error">{error.response?.data?.message || "Registration failed"}</p>}
            {success && <p className="auth-success">Account created! Redirecting to login...</p>}
        </form>
    );
}