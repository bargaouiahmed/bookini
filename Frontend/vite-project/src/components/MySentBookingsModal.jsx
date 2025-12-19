import { useState, useEffect } from "react";
import CalendarService from "../services/CalendarService";
import { CheckIcon, XIcon, ClockIcon, InboxIcon } from "./Icons";
import "./MySentBookingsModal.css";

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

function getStatusColor(status) {
    switch (status) {
        case "Confirmed": return "confirmed";
        case "Declined": return "declined";
        case "Pending":
        default: return "pending";
    }
}

function getStatusIcon(status) {
    switch (status) {
        case "Confirmed": return <CheckIcon size={16} />;
        case "Declined": return <XIcon size={16} />;
        case "Pending":
        default: return <ClockIcon size={16} />;
    }
}

export default function MySentBookingsModal({ onClose }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const data = await CalendarService.getMySentBookings();
            setBookings(data);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to fetch bookings");
        } finally {
            setLoading(false);
        }
    };

    const groupedBookings = {
        pending: bookings.filter(b => b.status === "Pending"),
        confirmed: bookings.filter(b => b.status === "Confirmed"),
        declined: bookings.filter(b => b.status === "Declined")
    };

    return (
        <div className="sent-bookings-backdrop" onClick={onClose}>
            <div className="sent-bookings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sent-bookings-header">
                    <h3>My Booking Requests</h3>
                    <span className="sent-count">{bookings.length}</span>
                    <button className="close-btn" onClick={onClose}><XIcon size={18} /></button>
                </div>

                <div className="sent-bookings-content">
                    {loading ? (
                        <div className="sent-loading">Loading...</div>
                    ) : error ? (
                        <div className="sent-error">{error}</div>
                    ) : bookings.length === 0 ? (
                        <div className="sent-empty">
                            <InboxIcon size={40} color="#888" />
                            <p>No booking requests sent yet</p>
                        </div>
                    ) : (
                        <>
                            {groupedBookings.pending.length > 0 && (
                                <div className="booking-group">
                                    <div className="group-header pending">
                                        <span><ClockIcon size={14} /> Pending</span>
                                        <span className="group-count">{groupedBookings.pending.length}</span>
                                    </div>
                                    {groupedBookings.pending.map(booking => (
                                        <BookingItem key={booking.id} booking={booking} />
                                    ))}
                                </div>
                            )}

                            {groupedBookings.confirmed.length > 0 && (
                                <div className="booking-group">
                                    <div className="group-header confirmed">
                                        <span><CheckIcon size={14} /> Confirmed</span>
                                        <span className="group-count">{groupedBookings.confirmed.length}</span>
                                    </div>
                                    {groupedBookings.confirmed.map(booking => (
                                        <BookingItem key={booking.id} booking={booking} />
                                    ))}
                                </div>
                            )}

                            {groupedBookings.declined.length > 0 && (
                                <div className="booking-group">
                                    <div className="group-header declined">
                                        <span><XIcon size={14} /> Declined</span>
                                        <span className="group-count">{groupedBookings.declined.length}</span>
                                    </div>
                                    {groupedBookings.declined.map(booking => (
                                        <BookingItem key={booking.id} booking={booking} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function BookingItem({ booking }) {
    const start = formatDateTime(booking.startTime);
    const end = formatDateTime(booking.endTime);
    const statusClass = getStatusColor(booking.status);

    return (
        <div className={`sent-booking-item ${statusClass}`}>
            <div className="booking-status-icon">
                {getStatusIcon(booking.status)}
            </div>
            <div className="booking-info">
                <div className="booking-title">{booking.title}</div>
                <div className="booking-recipient">
                    To: {booking.bookedUser?.username || "User"}
                </div>
                <div className="booking-time">
                    <span className="booking-date">{start.date}</span>
                    <span className="booking-hours">{start.time} - {end.time}</span>
                </div>
            </div>
        </div>
    );
}
