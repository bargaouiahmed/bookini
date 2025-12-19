import { useState, useEffect } from 'react';
import { InboxIcon, CheckIcon, XIcon, CalendarIcon } from './Icons';
import './NotificationToast.css';

export default function NotificationToast({ notifications, onDismiss }) {
    return (
        <div className="notification-container">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`notification-toast ${notification.type}`}
                    onClick={() => onDismiss(notification.id)}
                >
                    <div className="notification-icon">
                        {notification.type === 'booking-request' && <InboxIcon size={20} />}
                        {notification.type === 'booking-accepted' && <CheckIcon size={20} color="#10b981" />}
                        {notification.type === 'booking-declined' && <XIcon size={20} color="#ef4444" />}
                        {notification.type === 'calendar-update' && <CalendarIcon size={20} />}
                    </div>
                    <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                    </div>
                    <button className="notification-close"><XIcon size={16} /></button>
                </div>
            ))}
        </div>
    );
}

export function useNotifications() {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (type, title, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, title, message }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return { notifications, addNotification, dismissNotification };
}
