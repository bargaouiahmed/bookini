import { useState } from "react";
import "./DayModal.css";
import AddTaskModal from "./AddTaskModal";
import CalendarService from "../services/CalendarService";
import { CheckIcon, XIcon, EditIcon, TrashIcon, WarningIcon, LocationIcon } from "./Icons";

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

function doesEventOverlapDay(event, dayStart) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    const dayStartTime = new Date(dayStart);
    dayStartTime.setHours(0, 0, 0, 0);
    const dayEndTime = new Date(dayStart);
    dayEndTime.setHours(23, 59, 59, 999);

    return eventStart <= dayEndTime && eventEnd >= dayStartTime;
}

export default function DayModal({ fetchMonthData, dayData, date, onClose, onTaskAdded, pendingBookings = [], onBookingResponded }) {
    const [showAddTask, setShowAddTask] = useState(false);
    const [respondingId, setRespondingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const dayPendingBookings = pendingBookings.filter(booking => doesEventOverlapDay(booking, date));

    const formatDateHeader = () => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    };

    const handleTaskAdded = (newTask) => {
        setShowAddTask(false);
        if (onTaskAdded) {
            onTaskAdded(newTask);
        }
    };

    const handleRespondToBooking = async (bookingId, accept) => {
        setRespondingId(bookingId);
        try {
            await CalendarService.respondToBooking(bookingId, accept);
            if (onBookingResponded) {
                onBookingResponded(bookingId, accept);
            }
        } catch (e) {
            console.error("Failed to respond to booking", e);
        } finally {
            setRespondingId(null);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        setDeletingId(taskId);
        try {
            await CalendarService.cancelTask(taskId);
            if (onTaskAdded) onTaskAdded();
        } catch (e) {
            console.error("Failed to delete task", e);
            alert("Failed to delete task: " + (e.response?.data?.message || e.message));
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        setDeletingId(bookingId);
        try {
            await CalendarService.cancelBooking(bookingId);
            if (onTaskAdded) onTaskAdded();
        } catch (e) {
            console.error("Failed to cancel booking", e);
            alert("Failed to cancel booking: " + (e.response?.data?.message || e.message));
        } finally {
            setDeletingId(null);
        }
    };

    const startEditTask = (event) => {
        setEditingEvent(event);
        setEditTitle(event.title);
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        setEditStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
        setEditEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`);
    };

    const handleUpdateTask = async () => {
        if (!editingEvent?.id) return;

        const [startHour, startMin] = editStartTime.split(':').map(Number);
        const [endHour, endMin] = editEndTime.split(':').map(Number);

        const startTime = new Date(date);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMin, 0, 0);

        try {
            await CalendarService.updateTask(editingEvent.id, {
                title: editTitle,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            });
            setEditingEvent(null);
            if (onTaskAdded) onTaskAdded();
        } catch (e) {
            console.error("Failed to update task", e);
            alert("Failed to update task: " + (e.response?.data?.message || e.message));
        }
    };

    const isTask = (event) => !event.location && !event.madeBy?.includes("→");
    const isOwnBooking = (event) => event.madeBy?.startsWith("You →");

    return (
        <div className="day-modal-backdrop" onClick={onClose}>
            <div className="day-modal" onClick={(e) => e.stopPropagation()}>
                <div className="day-modal-header">
                    <h3>{formatDateHeader()}</h3>
                    <div className="day-modal-stats">
                        <span className="stat-item">{dayData.count} event{dayData.count !== 1 ? "s" : ""}</span>
                        {dayPendingBookings.length > 0 && (
                            <span className="stat-item pending-stat">{dayPendingBookings.length} pending</span>
                        )}
                        <span className="stat-item">{Number.parseInt(dayData.freeHours)} free hours</span>
                    </div>
                    <button className="add-task-btn" onClick={() => setShowAddTask(true)}>+</button>
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
                                {dayData.events
                                    .filter(event => event.status !== "Pending")
                                    .map((event, idx) => {
                                        const pos = getEventPosition(event, date);
                                        const eventStart = new Date(event.startTime);
                                        const eventEnd = new Date(event.endTime);
                                        const durationHours = (pos.endMinutes - pos.startMinutes) / 60;
                                        const minHeightPx = Math.max(durationHours * 50, 70);
                                        const isDeleting = deletingId === event.id;
                                        const canEdit = isTask(event);
                                        const canDelete = isTask(event) || isOwnBooking(event);

                                        return (
                                            <div
                                                key={`confirmed-${idx}`}
                                                className={`timeline-event ${isDeleting ? 'deleting' : ''}`}
                                                style={{
                                                    top: `${pos.top}%`,
                                                    minHeight: `${minHeightPx}px`
                                                }}
                                            >
                                                <div className="event-time">
                                                    {formatTime(eventStart)} - {formatTime(eventEnd)}
                                                </div>
                                                <div className="event-title">{event.title}</div>
                                                {event.madeBy && (
                                                    <div className="event-by">by {event.madeBy}</div>
                                                )}
                                                {event.location && (
                                                    <div className="event-location"><LocationIcon size={12} /> {event.location}</div>
                                                )}
                                                <div className="event-actions">
                                                    {canEdit && (
                                                        <button
                                                            className="event-action-btn edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditTask(event);
                                                            }}
                                                            title="Edit task"
                                                        >
                                                            <EditIcon size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            className="event-action-btn delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isTask(event)) {
                                                                    handleDeleteTask(event.id);
                                                                } else {
                                                                    handleDeleteBooking(event.id);
                                                                }
                                                            }}
                                                            disabled={isDeleting}
                                                            title={isTask(event) ? "Delete task" : "Cancel booking"}
                                                        >
                                                            {isDeleting ? "..." : <TrashIcon size={14} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {dayPendingBookings.map((booking, idx) => {
                                    const pos = getEventPosition(booking, date);
                                    const eventStart = new Date(booking.startTime);
                                    const eventEnd = new Date(booking.endTime);
                                    const durationHours = (pos.endMinutes - pos.startMinutes) / 60;
                                    const minHeightPx = Math.max(durationHours * 50, 50);
                                    const isResponding = respondingId === booking.id;

                                    return (
                                        <div
                                            key={`pending-${idx}`}
                                            className="timeline-event pending-event"
                                            style={{
                                                top: `${pos.top}%`,
                                                minHeight: `${minHeightPx}px`
                                            }}
                                        >
                                            <div className="event-time">
                                                {formatTime(eventStart)} - {formatTime(eventEnd)}
                                            </div>
                                            <div className="event-title">{booking.title}</div>
                                            <div className="pending-badge-inline">Pending</div>
                                            {booking.hasConflict && (
                                                <div className="conflict-badge"><WarningIcon size={12} /> Conflict</div>
                                            )}
                                            <div className="pending-actions">
                                                <button
                                                    className="quick-action accept"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRespondToBooking(booking.id, true);
                                                    }}
                                                    disabled={isResponding}
                                                    title="Accept"
                                                >
                                                    {isResponding ? "..." : <CheckIcon size={14} />}
                                                </button>
                                                <button
                                                    className="quick-action decline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRespondToBooking(booking.id, false);
                                                    }}
                                                    disabled={isResponding}
                                                    title="Decline"
                                                >
                                                    {isResponding ? "..." : <XIcon size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showAddTask && (
                <AddTaskModal
                    fetchMonthData={fetchMonthData}
                    date={date}
                    onClose={() => setShowAddTask(false)}
                    onTaskAdded={handleTaskAdded}
                />
            )}
            {editingEvent && (
                <div className="edit-task-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="edit-task-content">
                        <h4>Edit Task</h4>
                        <div className="edit-field">
                            <label>Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                        <div className="edit-field">
                            <label>Start Time</label>
                            <input
                                type="time"
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                            />
                        </div>
                        <div className="edit-field">
                            <label>End Time</label>
                            <input
                                type="time"
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                            />
                        </div>
                        <div className="edit-actions">
                            <button className="edit-cancel" onClick={() => setEditingEvent(null)}>Cancel</button>
                            <button className="edit-save" onClick={handleUpdateTask}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}