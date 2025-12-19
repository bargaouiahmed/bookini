import { useState, useRef, useEffect } from "react";
import CalendarService from "../services/CalendarService";
import "./AddTaskModal.css";

function TimeSpinner({ fetchMonthData ,value, max, onChange, label }) {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    const items = Array.from({ length: max }, (_, i) => i);

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
            <button className="spinner-arrow up" onClick={increment}>‹</button>
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
            <button className="spinner-arrow down" onClick={decrement}>‹</button>
        </div>
    );
}

export default function AddTaskModal({ date, onClose, onTaskAdded }) {
    const now = new Date();
    const [startHour, setStartHour] = useState(now.getHours());
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState((now.getHours() + 1) % 24);
    const [endMinute, setEndMinute] = useState(0);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const formatDateHeader = () => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError("Please enter a title");
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
            await CalendarService.addTask(title, startTime, endTime);
            onTaskAdded?.();
            onClose();

        } catch (e) {
            setError(e.response?.data?.message || "Failed to add task");
        } finally {
            setLoading(false);
            fetchMonthData();
        }
    };

    return (
        <div className="add-task-backdrop" onClick={onClose}>
            <div className="add-task-modal" onClick={(e) => e.stopPropagation()}>
                <div className="add-task-header">
                    <h3>New Task</h3>
                    <span className="add-task-date">{formatDateHeader()}</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="add-task-form">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Task title..."
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

                        <div className="time-arrow">→</div>

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

                    {error && <div className="add-task-error">{error}</div>}

                    <button type="submit" className="add-task-submit" disabled={loading}>
                        {loading ? "Adding..." : "Add Task"}
                    </button>
                </form>
            </div>
        </div>
    );
}