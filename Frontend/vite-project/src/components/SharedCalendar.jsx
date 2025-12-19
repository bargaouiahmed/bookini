import CalendarService from "../services/CalendarService";
import signalRService from "../services/SignalRService";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SharedDayModal from "./SharedDayModal";
import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, CalendarIcon } from "./Icons";
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

export default function SharedCalendar() {
    const { userId } = useParams();
    useEffect(() => {
        if (userId === localStorage.getItem("userId")) {
            window.location.href = "/calendar";
        }
    }, [userId]);
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState("week");
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("accessToken"));
    const cacheRef = useRef({});

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
            const data = await CalendarService.getUserActivitiesForTimeInterval(userId, monthStart, monthEnd);
            cacheRef.current[monthKey] = data;
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        cacheRef.current = {};
        fetchMonthData(currentDate);
    }, [userId, currentDate, fetchMonthData]);

    useEffect(() => {
        fetchMonthData(currentDate);

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
    }, [currentDate, viewMode, fetchMonthData]);

    useEffect(() => {
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) return;

        signalRService.subscribeToCalendar(userIdNum);

        return () => {
            signalRService.unsubscribeFromCalendar(userIdNum);
        };
    }, [userId]);

    useEffect(() => {
        const handleCalendarUpdated = (data) => {
            cacheRef.current = {};
            fetchMonthData(currentDate);
        };

        signalRService.on('CalendarUpdated', handleCalendarUpdated);

        return () => {
            signalRService.off('CalendarUpdated', handleCalendarUpdated);
        };
    }, [currentDate, fetchMonthData]);

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

    const getDayData = (day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayEvents = events.filter(e => doesEventOverlapDay(e, dayStart, dayEnd));

        let busyMinutes = 0;
        for (const event of dayEvents) {
            busyMinutes += getOverlapMinutes(event, dayStart, dayEnd);
        }

        const freeHours = Math.max(0, 24 - busyMinutes / 60);

        return {
            events: dayEvents,
            count: dayEvents.length,
            freeHours: freeHours.toFixed(1)
        };
    };

    const formatMonthYear = () => {
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const isToday = (date) => isSameDay(date, new Date());
    const isCurrentMonth = (date) => isSameMonth(date, currentDate);

    return (
        <div className="calendar-container shared">
            <div className="calendar-header">
                <div className="header-left">
                    <button onClick={goToPrev}><ArrowLeftIcon size={18} /></button>
                    <button onClick={goToToday}>Today</button>
                    <button onClick={goToNext}><ArrowRightIcon size={18} /></button>
                </div>
                <h2>{formatMonthYear()}</h2>
                <div className="header-right">
                    <div>
                        <button onClick={() => window.location.href = "/calendar"}>Back to calendar?</button>
                    </div>
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
                </div>
            </div>

            <div className="shared-banner">
                <span><CalendarIcon size={16} /> Viewing calendar to book a slot</span>
                {!isLoggedIn && (
                    <button
                        className="login-link"
                        onClick={() => navigate("/login", { state: { returnTo: `/book/${userId}` } })}
                    >
                        Login to book
                    </button>
                )}
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
                                <span className="free-hours">{Number.parseInt(dayData.freeHours)} free hours</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedDay && (
                <SharedDayModal
                    userId={userId}
                    date={selectedDay.date}
                    dayData={selectedDay.data}
                    onClose={() => setSelectedDay(null)}
                    onBookingAdded={() => {
                        delete cacheRef.current[getMonthKey(selectedDay.date)];
                        fetchMonthData(selectedDay.date);
                        setSelectedDay(null);
                    }}
                />
            )}
        </div>
    );
}
