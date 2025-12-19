import * as signalR from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = null;
        this.isConnecting = false;
        this.eventHandlers = new Map();
        this.connectionPromise = null;
        this.init();
    }

    init() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return;
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl((import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + '/hubs/notificationHub', {
                accessTokenFactory: () => localStorage.getItem('accessToken')
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.connection.onreconnecting((error) => {
            console.log('SignalR reconnecting...', error);
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR reconnected with ID:', connectionId);
            this.reregisterHandlers();
        });

        this.connection.onclose((error) => {
            console.log('SignalR connection closed', error);
            this.connectionPromise = null;
        });

        this.connectionPromise = this.start();
    }

    reregisterHandlers() {
        for (const [eventName, handlers] of this.eventHandlers.entries()) {
            for (const handler of handlers) {
                this.connection?.off(eventName, handler);
                this.connection?.on(eventName, handler);
            }
        }
    }

    async start() {
        if (!this.connection) {
            this.init();
            return;
        }

        if (this.connection.state === signalR.HubConnectionState.Connected) {
            return;
        }

        if (this.isConnecting) {
            return this.connectionPromise;
        }

        this.isConnecting = true;

        try {
            await this.connection.start();
            console.log('SignalR connected');
        } catch (error) {
            console.error('SignalR connection failed:', error);
            setTimeout(() => this.start(), 5000);
        } finally {
            this.isConnecting = false;
        }
    }

    async waitForConnection() {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        if (!this.connection) {
            this.init();
        }

        if (this.connectionPromise) {
            await this.connectionPromise;
        }

        let attempts = 0;
        while (this.connection?.state !== signalR.HubConnectionState.Connected && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }
    }

    async stop() {
        if (this.connection) {
            try {
                await this.connection.stop();
                console.log('SignalR disconnected');
            } catch (error) {
                console.error('Error stopping SignalR:', error);
            }
        }
    }

    on(eventName, callback) {
        if (!this.connection) {
            this.init();
        }

        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        this.eventHandlers.get(eventName).add(callback);

        this.connection?.on(eventName, callback);
    }

    off(eventName, callback) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).delete(callback);
        }
        this.connection?.off(eventName, callback);
    }

    async subscribeToCalendar(calendarOwnerId) {
        await this.waitForConnection();

        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SubscribeToCalendar', calendarOwnerId);
                console.log('Subscribed to calendar:', calendarOwnerId);
            } catch (error) {
                console.error('Failed to subscribe to calendar:', error);
            }
        } else {
            console.warn('Cannot subscribe to calendar - not connected');
        }
    }

    async unsubscribeFromCalendar(calendarOwnerId) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('UnsubscribeFromCalendar', calendarOwnerId);
                console.log('Unsubscribed from calendar:', calendarOwnerId);
            } catch (error) {
                console.error('Failed to unsubscribe from calendar:', error);
            }
        }
    }

    isConnected() {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

const signalRService = new SignalRService();
export default signalRService;
