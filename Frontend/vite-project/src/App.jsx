import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import Calendar from "./components/Calendar";
import SharedCalendar from "./components/SharedCalendar";
import AuthGuard from "./components/AuthGuard";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<AuthForm />} />
                <Route
                    path="/calendar"
                    element={
                        <AuthGuard>
                            <Calendar />
                        </AuthGuard>
                    }
                />
                <Route path="/book/:userId" element={<SharedCalendar />} />
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
        </BrowserRouter>
    );
}