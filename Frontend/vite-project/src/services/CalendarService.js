import axios from 'axios'
import { data } from 'react-router-dom';

function getCurrentMonthStart(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getCurrentMonthEnd(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
export function getWeekRange(date = new Date()) {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
}
export function getMonthRange(date = new Date()) {
    return {
        start: getCurrentMonthStart(date),
        end: getCurrentMonthEnd(date)
    }

}
class CalendarService {
    constructor() {

        this.api = axios.create({ baseURL: (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api/calendar", withCredentials: true })
        this.api.interceptors.request.use(
            (config) => {
                const accessToken = localStorage.getItem("accessToken");
                if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
                return config;
            },
            (error) => Promise.reject(error)
        )

        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401 && !error.config._retry) {
                    error.config._retry = true;
                    try {
                        const refreshToken = localStorage.getItem("refreshToken");
                        const refreshResponse = await axios.get('/auth/refresh?refreshToken=' + refreshToken);
                        const { accessToken, refreshToken: newRefresh } = refreshResponse.data;

                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', newRefresh);

                        error.config.headers.Authorization = `Bearer ${accessToken}`
                        return this.api.request(error.config)
                    } catch (e) {
                        localStorage.clear();

                    }
                }
                return Promise.reject(error)
            }
        )
    }


    async getUserActivitiesForTimeInterval(userId = "me", startDate = getCurrentMonthStart(), endDate = getCurrentMonthEnd()) {
        try {
            console.log("Start: " + startDate.toISOString())
            console.log("end date: " + endDate.toISOString())
            const response = await this.api.get('/tasks', {
                params: {
                    userId,
                    start: startDate.toISOString(),  // Convert to ISO string
                    end: endDate.toISOString()        // Convert to ISO string
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch activities', error)
            throw error
        }

    }


    async addTask(title, startTime, endTime) {
        try {
            const response = await this.api.post('/add-task',
                {
                    title, startTime, endTime
                }
            )


            console.log(response?.data)
            return response.data;
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async addBooking(userId, title, startTime, endTime) {
        try {
            const response = await this.api.post(`/book-user/${userId}`, {
                title, startTime, endTime
            })
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async getPendingBookings() {
        try {
            const response = await this.api.get('/undecided-bookings')
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async respondToBooking(bookingId, accept) {
        try {
            const response = await this.api.post(`/respond-booking/${bookingId}`, accept, {
                headers: { 'Content-Type': 'application/json' }
            })
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async getMySentBookings() {
        try {
            const response = await this.api.get('/my-sent-bookings')
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async cancelTask(taskId) {
        try {
            const response = await this.api.delete(`/cancel-task/${taskId}`)
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async updateTask(taskId, { title, startTime, endTime }) {
        try {
            const response = await this.api.patch(`/update-task/${taskId}`, {
                title, startTime, endTime
            })
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async cancelBooking(bookingId) {
        try {
            const response = await this.api.delete(`/cancel-booking/${bookingId}`)
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async getNotifications() {
        try {
            const response = await this.api.get('/notifications')
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async markNotificationRead(notificationId) {
        try {
            const response = await this.api.post(`/notifications/${notificationId}/read`)
            return response.data
        } catch (e) {
            console.log(e)
            throw e
        }
    }
}


export default new CalendarService();