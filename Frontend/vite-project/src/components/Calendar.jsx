import { getMonthRange } from "../services/CalendarService";
import CalendarService from "../services/CalendarService";
import signalRService from "../services/SignalRService";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DayModal from "./DayModal";
import PendingBookingsModal from "./PendingBookingsModal";
import MySentBookingsModal from "./MySentBookingsModal";
import NotificationToast, { useNotifications } from "./NotificationToast";
import NotificationPanel, { NotificationBell } from "./NotificationPanel";
import { InboxIcon, OutboxIcon, RefreshIcon, CalendarIcon } from "./Icons";
import "./Calendar.css";

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function isSameMonth(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function getOverlapMinutes(event, dayStart, dayEnd) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const overlapStart = Math.max(eventStart.getTime(), dayStart.getTime());
    const overlapEnd = Math.min(eventEnd.getTime(), dayEnd.getTime());
    if (overlapEnd <= overlapStart) return 0;
    return (overlapEnd - overlapStart) / (1000 * 60);
}

function doesEventOverlapDay(event, dayStart, dayEnd) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    return eventStart < dayEnd && eventEnd > dayStart;
}

export default function Calendar() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState("week");
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showSentBookingsModal, setShowSentBookingsModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const cacheRef = useRef({});
    const { notifications, addNotification, dismissNotification } = useNotifications();

    const handleLogout = () => {
        signalRService.stop();
        localStorage.clear();
        navigate("/login");
    };

    const fetchPendingBookings = useCallback(async () => {
        try {
            const data = await CalendarService.getPendingBookings();
            setPendingBookings(data);
        } catch (err) {
            console.error("Failed to fetch pending bookings", err);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await CalendarService.getNotifications();
            const unread = data.filter(n => !n.isRead).length;
            setUnreadNotifications(unread);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    }, []);

    const getVisibleRange = useCallback(() => {
        if (viewMode === "week") {
            const start = getMonday(currentDate);
            return { start, end: addDays(start, 6) };
        } else {
            return { start: getMonthStart(currentDate), end: getMonthEnd(currentDate) };
        }
    }, [viewMode, currentDate]);

    const getEventsForRange = useCallback((start, end) => {
        const events = [];
        const seen = new Set();

        for (const key of Object.keys(cacheRef.current)) {
            for (const event of cacheRef.current[key]) {
                const eventStart = new Date(event.startTime);
                const eventEnd = new Date(event.endTime);
                const eventId = `${event.startTime}-${event.endTime}-${event.title}`;

                if (!seen.has(eventId) && eventStart <= end && eventEnd >= start) {
                    seen.add(eventId);
                    events.push(event);
                }
            }
        }
        return events;
    }, []);

    const fetchMonthData = useCallback(async (date) => {
        const monthKey = getMonthKey(date);
        if (cacheRef.current[monthKey]) return;

        const monthStart = getMonthStart(date);
        const monthEnd = addDays(getMonthEnd(date), 1);

        setLoading(true);
        try {
            const data = await CalendarService.getUserActivitiesForTimeInterval("me", monthStart, monthEnd);
            cacheRef.current[monthKey] = data;
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMonthData(currentDate);
        fetchPendingBookings();
        fetchUnreadCount();

        if (viewMode === "week") {
            const weekStart = getMonday(currentDate);
            const weekEnd = addDays(weekStart, 6);
            if (!isSameMonth(weekStart, currentDate)) {
                fetchMonthData(weekStart);
            }
            if (!isSameMonth(weekEnd, currentDate)) {
                fetchMonthData(weekEnd);
            }
        }
    }, [currentDate, viewMode, fetchMonthData, fetchPendingBookings, fetchUnreadCount]);

    useEffect(() => {
        const handleTaskAdded = (task) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
            addNotification('calendar-update', 'Task Added', task.title);
        };

        const handleTaskUpdated = (task) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
        };

        const handleTaskRemoved = (title) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
        };

        const handleBookingCancelled = (title) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
            fetchPendingBookings();
        };

        const handleNewBookingRequest = (booking) => {
            fetchPendingBookings();
            fetchUnreadCount();
            addNotification('booking-request', 'New Booking Request', `${booking.madeBy} wants to book: ${booking.title}`);
        };

        const handleBookingResponse = (response) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
            fetchUnreadCount();
            const type = response.status === 'Confirmed' ? 'booking-accepted' : 'booking-declined';
            const title = response.status === 'Confirmed' ? 'Booking Accepted' : 'Booking Declined';
            addNotification(type, title, `${response.bookedUserName} ${response.status.toLowerCase()} your booking: ${response.title}`);
        };

        signalRService.on('CalenderTaskAdded', handleTaskAdded);
        signalRService.on('CalenderTaskUpdated', handleTaskUpdated);
        signalRService.on('CalenderTaskRemoved', handleTaskRemoved);
        signalRService.on('BookingCancelled', handleBookingCancelled);
        signalRService.on('NewBookingRequest', handleNewBookingRequest);
        signalRService.on('BookingResponseReceived', handleBookingResponse);

        return () => {
            signalRService.off('CalenderTaskAdded', handleTaskAdded);
            signalRService.off('CalenderTaskUpdated', handleTaskUpdated);
            signalRService.off('CalenderTaskRemoved', handleTaskRemoved);
            signalRService.off('BookingCancelled', handleBookingCancelled);
            signalRService.off('NewBookingRequest', handleNewBookingRequest);
            signalRService.off('BookingResponseReceived', handleBookingResponse);
        };
    }, [currentDate, fetchMonthData, fetchPendingBookings, addNotification, fetchUnreadCount]);

    const goToPrev = () => {
        if (viewMode === "week") {
            setCurrentDate(prev => addDays(prev, -7));
        } else {
            setCurrentDate(prev => addMonths(prev, -1));
        }
    };

    const goToNext = () => {
        if (viewMode === "week") {
            setCurrentDate(prev => addDays(prev, 7));
        } else {
            setCurrentDate(prev => addMonths(prev, 1));
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const clearCache = () => {
        cacheRef.current = {};
        fetchMonthData(currentDate);
        fetchPendingBookings();
        fetchUnreadCount();
    };

    const handleBookingResponded = (bookingId, accepted) => {
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
        if (accepted) {
            cacheRef.current = {};
            fetchMonthData(currentDate);
        }
    };

    const getVisibleDays = () => {
        if (viewMode === "week") {
            const start = getMonday(currentDate);
            return Array.from({ length: 7 }, (_, i) => addDays(start, i));
        } else {
            const monthStart = getMonthStart(currentDate);
            const monthEnd = getMonthEnd(currentDate);
            const startDay = getMonday(monthStart);
            const days = [];
            let day = startDay;
            while (day <= monthEnd || days.length % 7 !== 0) {
                days.push(new Date(day));
                day = addDays(day, 1);
            }
            return days;
        }
    };

    const visibleDays = getVisibleDays();
    const { start: rangeStart, end: rangeEnd } = getVisibleRange();
    const events = getEventsForRange(rangeStart, rangeEnd);

    const doesPendingOverlapDay = (booking, dayStart, dayEnd) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return bookingStart <= dayEnd && bookingEnd >= dayStart;
    };

    const getDayData = (day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayEvents = events.filter(e => doesEventOverlapDay(e, dayStart, dayEnd));
        const confirmedEvents = dayEvents.filter(e => e.status !== "Pending");

        const dayPendingCount = pendingBookings.filter(b => doesPendingOverlapDay(b, dayStart, dayEnd)).length;

        let busyMinutes = 0;
        for (const event of confirmedEvents) {
            busyMinutes += getOverlapMinutes(event, dayStart, dayEnd);
        }

        const freeHours = Math.max(0, 24 - busyMinutes / 60);

        return {
            events: dayEvents,
            count: confirmedEvents.length,
            pendingCount: dayPendingCount,
            freeHours: freeHours.toFixed(1)
        };
    };

    const formatDate = (date) => {
        if (viewMode === "month") {
            return date.getDate().toString();
        }
        return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    };

    const formatMonthYear = () => {
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const isToday = (date) => isSameDay(date, new Date());
    const isCurrentMonth = (date) => isSameMonth(date, currentDate);

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div className="header-left">
                    <button onClick={goToPrev}>←</button>
                    <button onClick={goToToday}>Today</button>
                    <button onClick={goToNext}>→</button>
                    <div style={{ backgroundColor: "white", padding: "5px", borderRadius: "5px", marginLeft: "10px", cursor: "grab" }} onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book/${localStorage.getItem("userId")}`);
                        alert("Calendar link copied to clipboard!");
                    }} >
                        <p> Calender link: {window.location.origin}/book/{localStorage.getItem("userId")}</p>
                    </div>
                </div>
                <h2>{formatMonthYear()}</h2>
                <div className="header-right">
                    <button
                        onClick={() => setShowPendingModal(true)}
                        className={`pending-btn ${pendingBookings.length > 0 ? "has-pending" : ""}`}
                        title="Incoming booking requests"
                    >
                        <InboxIcon size={20} />
                        {pendingBookings.length > 0 && (
                            <span className="pending-badge">{pendingBookings.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowSentBookingsModal(true)}
                        className="pending-btn"
                        title="My sent booking requests"
                    >
                        <OutboxIcon size={20} />
                    </button>
                    <NotificationBell
                        unreadCount={unreadNotifications}
                        onClick={() => setShowNotifications(true)}
                    />
                    <div className="view-toggle">
                        <button
                            className={viewMode === "week" ? "active" : ""}
                            onClick={() => setViewMode("week")}
                        >
                            Week
                        </button>
                        <button
                            className={viewMode === "month" ? "active" : ""}
                            onClick={() => setViewMode("month")}
                        >
                            Month
                        </button>
                    </div>
                    <button onClick={clearCache} className="icon-btn"><RefreshIcon size={18} /></button>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </div>

            {loading && <div className="calendar-loading">Loading...</div>}

            <div className="calendar-weekdays">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                ))}
            </div>

            <div className={`calendar-grid ${viewMode}`}>
                {visibleDays.map((day, index) => {
                    const dayData = getDayData(day);
                    const outOfMonth = viewMode === "month" && !isCurrentMonth(day);
                    return (
                        <div
                            key={index}
                            className={`calendar-day ${isToday(day) ? "today" : ""} ${outOfMonth ? "out-of-month" : ""}`}
                            onClick={() => setSelectedDay({ date: day, data: dayData })}
                        >

                            <div className="day-stats">
                                {dayData.count > 0 && (
                                    <span className="event-count">{dayData.count}</span>
                                )}
                                {dayData.pendingCount > 0 && (
                                    <span className="pending-count" title="Pending requests">{dayData.pendingCount} <InboxIcon size={10} /></span>
                                )}
                                <span className="free-hours">{Number.parseInt(dayData.freeHours)} free hours</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedDay && (
                <DayModal
                    fetchMonthData={fetchMonthData}
                    date={selectedDay.date}
                    dayData={selectedDay.data}
                    onClose={() => setSelectedDay(null)}
                    onTaskAdded={() => {
                        delete cacheRef.current[getMonthKey(selectedDay.date)];
                        fetchMonthData(selectedDay.date);
                        setSelectedDay(null);
                    }}
                    pendingBookings={pendingBookings}
                    onBookingResponded={handleBookingResponded}
                />
            )}

            {showPendingModal && (
                <PendingBookingsModal
                    bookings={pendingBookings}
                    onClose={() => setShowPendingModal(false)}
                    onResponded={handleBookingResponded}
                />
            )}

            {showSentBookingsModal && (
                <MySentBookingsModal
                    onClose={() => setShowSentBookingsModal(false)}
                />
            )}

            <NotificationPanel
                isOpen={showNotifications}
                onClose={() => {
                    setShowNotifications(false);
                    fetchUnreadCount();
                }}
            />

            <NotificationToast
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </div>
    );
}