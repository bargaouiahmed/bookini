import { useState } from "react";
import "./DayModal.css";
import AddBookingModal from "./AddBookingModal";
import { PlusIcon, XIcon } from "./Icons";

function formatTime(date) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getEventPosition(event, dayStart) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    const dayStartTime = new Date(dayStart);
    dayStartTime.setHours(0, 0, 0, 0);
    const dayEndTime = new Date(dayStart);
    dayEndTime.setHours(23, 59, 59, 999);

    const clampedStart = new Date(Math.max(eventStart.getTime(), dayStartTime.getTime()));
    const clampedEnd = new Date(Math.min(eventEnd.getTime(), dayEndTime.getTime()));

    const startMinutes = clampedStart.getHours() * 60 + clampedStart.getMinutes();
    const endMinutes = clampedEnd.getHours() * 60 + clampedEnd.getMinutes();

    const top = (startMinutes / 1440) * 100;
    const height = ((endMinutes - startMinutes) / 1440) * 100;

    return { top, height, startMinutes, endMinutes };
}

export default function SharedDayModal({ userId, dayData, date, onClose, onBookingAdded }) {
    const [showAddBooking, setShowAddBooking] = useState(false);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const formatDateHeader = () => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    };

    const handleBookingAdded = () => {
        setShowAddBooking(false);
        if (onBookingAdded) {
            onBookingAdded();
        }
    };

    return (
        <div className="day-modal-backdrop" onClick={onClose}>
            <div className="day-modal" onClick={(e) => e.stopPropagation()}>
                <div className="day-modal-header">
                    <h3>{formatDateHeader()}</h3>
                    <div className="day-modal-stats">
                        <span className="stat-item">{dayData.count} event{dayData.count !== 1 ? "s" : ""}</span>
                        <span className="stat-item">{Number.parseInt(dayData.freeHours)} free hours</span>
                    </div>
                    <button className="add-task-btn book" onClick={() => setShowAddBooking(true)}><PlusIcon size={20} /></button>
                    <button className="close-btn" onClick={onClose}><XIcon size={18} /></button>
                </div>
                <div className="day-modal-content">
                    <div className="timeline-container">
                        <div className="time-labels">
                            {hours.map(hour => (
                                <div key={hour} className="time-label">
                                    <span>{hour.toString().padStart(2, "0")}:00</span>
                                </div>
                            ))}
                        </div>
                        <div className="timeline-grid">
                            {hours.map(hour => (
                                <div key={hour} className="hour-row">
                                    <div className="hour-line"></div>
                                </div>
                            ))}
                            <div className="events-layer">
                                {dayData.events.map((event, idx) => {
                                    const pos = getEventPosition(event, date);
                                    const eventStart = new Date(event.startTime);
                                    const eventEnd = new Date(event.endTime);
                                    const durationHours = (pos.endMinutes - pos.startMinutes) / 60;
                                    const minHeightPx = Math.max(durationHours * 50, 50);
                                    return (
                                        <div
                                            key={idx}
                                            className="timeline-event busy"
                                            style={{
                                                top: `${pos.top}%`,
                                                minHeight: `${minHeightPx}px`
                                            }}
                                        >
                                            <div className="event-time">
                                                {formatTime(eventStart)} - {formatTime(eventEnd)}
                                            </div>
                                            <div className="event-title">Busy</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showAddBooking && (
                <AddBookingModal
                    userId={userId}
                    date={date}
                    onClose={() => setShowAddBooking(false)}
                    onBookingAdded={handleBookingAdded}
                />
            )}
        </div>
    );
}
