import { useState, useEffect } from 'react';
import CalendarService from '../services/CalendarService';
import { BellIcon, CheckIcon, XIcon, ClockIcon } from './Icons';
import './NotificationPanel.css';

export default function NotificationPanel({ isOpen, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await CalendarService.getNotifications();
            setNotifications(data);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await CalendarService.markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (e) {
            console.error('Failed to mark notification read', e);
        }
    };

    const getStatusIcon = (message) => {
        if (message.includes('confirmed')) return <CheckIcon size={16} color="#10b981" />;
        if (message.includes('declined')) return <XIcon size={16} color="#ef4444" />;
        if (message.includes('wants to book')) return <ClockIcon size={16} color="#f59e0b" />;
        return <BellIcon size={16} />;
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div className="notification-panel-backdrop" onClick={onClose}>
            <div className="notification-panel" onClick={e => e.stopPropagation()}>
                <div className="notification-panel-header">
                    <h3>Notifications</h3>
                    <button className="close-panel-btn" onClick={onClose}>
                        <XIcon size={18} />
                    </button>
                </div>
                <div className="notification-panel-content">
                    {loading && <div className="notification-loading">Loading...</div>}
                    {!loading && notifications.length === 0 && (
                        <div className="notification-empty">No notifications</div>
                    )}
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                            onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                        >
                            <div className="notification-item-icon">
                                {getStatusIcon(notification.message)}
                            </div>
                            <div className="notification-item-content">
                                <div className="notification-item-message">{notification.message}</div>
                                <div className="notification-item-time">{formatTime(notification.createdAt)}</div>
                            </div>
                            {!notification.isRead && <div className="unread-dot" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function NotificationBell({ unreadCount, onClick }) {
    return (
        <button className="notification-bell" onClick={onClick}>
            <BellIcon size={20} />
            {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
        </button>
    );
}
