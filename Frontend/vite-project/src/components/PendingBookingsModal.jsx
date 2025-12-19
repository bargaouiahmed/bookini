import { useState } from "react";
import CalendarService from "../services/CalendarService";
import { CheckIcon, XIcon, WarningIcon, LocationIcon } from "./Icons";
import "./PendingBookingsModal.css";

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        }),
        time: date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })
    };
}

function formatDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function PendingBookingsModal({ bookings, onClose, onResponded }) {
    const [respondingId, setRespondingId] = useState(null);
    const [error, setError] = useState(null);

    const handleRespond = async (bookingId, accept) => {
        setRespondingId(bookingId);
        setError(null);

        try {
            await CalendarService.respondToBooking(bookingId, accept);
            onResponded(bookingId, accept);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to respond");
        } finally {
            setRespondingId(null);
        }
    };

    return (
        <div className="pending-backdrop" onClick={onClose}>
            <div className="pending-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pending-header">
                    <h3>Pending Booking Requests</h3>
                    <span className="pending-count">{bookings.length}</span>
                    <button className="close-btn" onClick={onClose}><XIcon size={18} /></button>
                </div>

                <div className="pending-content">
                    {bookings.length === 0 ? (
                        <div className="pending-empty">
                            <CheckIcon size={40} color="#40826D" />
                            <p>No pending requests</p>
                        </div>
                    ) : (
                        <div className="pending-list">
                            {bookings.map((booking) => {
                                const start = formatDateTime(booking.startTime);
                                const end = formatDateTime(booking.endTime);
                                const duration = formatDuration(booking.startTime, booking.endTime);
                                const isResponding = respondingId === booking.id;

                                return (
                                    <div key={booking.id} className={`pending-item ${isResponding ? "responding" : ""} ${booking.hasConflict ? "has-conflict" : ""}`}>
                                        <div className="booking-info">
                                            <div className="booking-title">
                                                {booking.title}
                                                {booking.hasConflict && (
                                                    <span className="conflict-indicator" title="Conflicts with another pending booking"><WarningIcon size={16} /></span>
                                                )}
                                            </div>
                                            {booking.madeBy && (
                                                <div className="booking-from">From: {booking.madeBy}</div>
                                            )}
                                            <div className="booking-time">
                                                <span className="booking-date">{start.date}</span>
                                                <span className="booking-hours">
                                                    {start.time} - {end.time}
                                                </span>
                                                <span className="booking-duration">{duration}</span>
                                            </div>
                                            {booking.location && (
                                                <div className="booking-location"><LocationIcon size={12} /> {booking.location}</div>
                                            )}
                                            {booking.hasConflict && (
                                                <div className="conflict-warning">
                                                    <WarningIcon size={12} /> This overlaps with another pending request
                                                </div>
                                            )}
                                        </div>
                                        <div className="booking-actions">
                                            <button
                                                className="action-btn accept"
                                                onClick={() => handleRespond(booking.id, true)}
                                                disabled={isResponding}
                                            >
                                                {isResponding ? "..." : <CheckIcon size={14} />}
                                            </button>
                                            <button
                                                className="action-btn decline"
                                                onClick={() => handleRespond(booking.id, false)}
                                                disabled={isResponding}
                                            >
                                                {isResponding ? "..." : <XIcon size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && <div className="pending-error">{error}</div>}
                </div>
            </div>
        </div>
    );
}
