import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
axios.defaults.withCredentials = true;
class AuthService {
    constructor() {
        this.baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";
    }

    async register({ username, password }) {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/register`, {
                username,
                password
            });
            return response.data;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    async login({ username, password }) {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                username, password
            });
            localStorage.setItem("accessToken", response.data.accessToken);
            localStorage.setItem("refreshToken", response.data.refreshToken);
            localStorage.setItem("userId", jwtDecode(response.data.accessToken)["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"])
            localStorage.setItem("username", jwtDecode(response.data.accessToken)["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]);
            return response.data
        } catch (e) { console.log(e) }
    }
}

export default new AuthService();