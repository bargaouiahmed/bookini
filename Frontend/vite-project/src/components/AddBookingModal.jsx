import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CalendarService from "../services/CalendarService";
import { CheckIcon, XIcon, LockIcon, ArrowRightIcon, CalendarIcon } from "./Icons";
import "./AddTaskModal.css";

function TimeSpinner({ value, max, onChange, label }) {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        onChange((value + delta + max) % max);
    };

    const handleTouchStart = (e) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        startValue.current = value;
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const diff = startY.current - e.touches[0].clientY;
        const steps = Math.round(diff / 30);
        const newValue = (startValue.current + steps + max) % max;
        onChange(newValue);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startValue.current = value;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const diff = startY.current - e.clientY;
        const steps = Math.round(diff / 30);
        const newValue = (startValue.current + steps + max) % max;
        onChange(newValue);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    const increment = () => onChange((value + 1) % max);
    const decrement = () => onChange((value - 1 + max) % max);

    const getPrevValue = () => (value - 1 + max) % max;
    const getNextValue = () => (value + 1) % max;

    return (
        <div className="spinner-container">
            <span className="spinner-label">{label}</span>
            <button type="button" className="spinner-arrow up" onClick={increment}>&lsaquo;</button>
            <div
                className="spinner-track"
                ref={containerRef}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                <div className="spinner-item faded">{getPrevValue().toString().padStart(2, "0")}</div>
                <div className="spinner-item active">{value.toString().padStart(2, "0")}</div>
                <div className="spinner-item faded">{getNextValue().toString().padStart(2, "0")}</div>
            </div>
            <button type="button" className="spinner-arrow down" onClick={decrement}>&lsaquo;</button>
        </div>
    );
}

export default function AddBookingModal({ userId, date, onClose, onBookingAdded }) {
    const navigate = useNavigate();
    const now = new Date();
    const [startHour, setStartHour] = useState(now.getHours());
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState((now.getHours() + 1) % 24);
    const [endMinute, setEndMinute] = useState(0);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const isLoggedIn = !!localStorage.getItem("accessToken");

    const formatDateHeader = () => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLoggedIn) {
            navigate("/login", { state: { returnTo: `/book/${userId}` } });
            return;
        }

        if (!title.trim()) {
            setError("Please enter a title for your booking");
            return;
        }

        const startTime = new Date(date);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMinute, 0, 0);

        if (endTime <= startTime) {
            setError("End time must be after start time");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await CalendarService.addBooking(userId, title, startTime, endTime);
            setSuccess(true);
            setTimeout(() => {
                onBookingAdded?.();
                onClose();
            }, 1500);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to request booking");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="add-task-backdrop" onClick={onClose}>
                <div className="add-task-modal booking-success" onClick={(e) => e.stopPropagation()}>
                    <div className="success-content">
                        <div className="success-icon"><CheckIcon size={40} color="#fff" /></div>
                        <h3>Booking Requested!</h3>
                        <p>Your booking request has been sent and is pending approval.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="add-task-backdrop" onClick={onClose}>
                <div className="add-task-modal booking" onClick={(e) => e.stopPropagation()}>
                    <div className="add-task-header booking">
                        <h3>Login Required</h3>
                        <button className="close-btn" onClick={onClose}><XIcon size={18} /></button>
                    </div>
                    <div className="login-required-content">
                        <div className="login-icon"><LockIcon size={40} color="#40826D" /></div>
                        <p>You need to be logged in to request a booking.</p>
                        <button
                            className="add-task-submit booking"
                            onClick={() => navigate("/login", { state: { returnTo: `/book/${userId}` } })}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="add-task-backdrop" onClick={onClose}>
            <div className="add-task-modal booking" onClick={(e) => e.stopPropagation()}>
                <div className="add-task-header booking">
                    <h3>Request Booking</h3>
                    <span className="add-task-date">{formatDateHeader()}</span>
                    <button className="close-btn" onClick={onClose}><XIcon size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="add-task-form">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="What's this booking for?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="time-pickers">
                        <div className="time-picker-group">
                            <span className="time-picker-label">Start</span>
                            <div className="time-picker">
                                <TimeSpinner
                                    value={startHour}
                                    max={24}
                                    onChange={setStartHour}
                                    label="Hour"
                                />
                                <span className="time-separator">:</span>
                                <TimeSpinner
                                    value={startMinute}
                                    max={60}
                                    onChange={setStartMinute}
                                    label="Min"
                                />
                            </div>
                        </div>

                        <div className="time-arrow"><ArrowRightIcon size={20} /></div>

                        <div className="time-picker-group">
                            <span className="time-picker-label">End</span>
                            <div className="time-picker">
                                <TimeSpinner
                                    value={endHour}
                                    max={24}
                                    onChange={setEndHour}
                                    label="Hour"
                                />
                                <span className="time-separator">:</span>
                                <TimeSpinner
                                    value={endMinute}
                                    max={60}
                                    onChange={setEndMinute}
                                    label="Min"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="booking-note">
                        <span><CalendarIcon size={14} /></span> Your request will be sent for approval
                    </div>

                    {error && <div className="add-task-error">{error}</div>}

                    <button type="submit" className="add-task-submit booking" disabled={loading}>
                        {loading ? "Sending..." : "Request Booking"}
                    </button>
                </form>
            </div>
        </div>
    );
}
