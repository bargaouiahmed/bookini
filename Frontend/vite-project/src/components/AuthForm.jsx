import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import "./Auth.css";

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-tabs">
                    <button 
                        className={`auth-tab ${isLogin ? "active" : ""}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button 
                        className={`auth-tab ${!isLogin ? "active" : ""}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </button>
                </div>
                <div className="auth-content">
                    {isLogin ? <LoginForm /> : <RegisterForm />}
                </div>
            </div>
        </div>
    );
}
