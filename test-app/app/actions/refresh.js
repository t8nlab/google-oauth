import { defineAction, response } from "@titanpl/native";
import { google } from "./login";

export default defineAction((req) => {
    const refresh_token = req.query.token;
    if (!refresh_token) {
        return response.json({ error: "Refresh token is required" }, 400);
    }

    try {
        const result = google.refreshToken(refresh_token);
        return response.json(result);
    } catch (e) {
        if (e === "__SUSPEND__" || e.message === "__SUSPEND__" || e.name === "Suspend") throw e;
        return response.json({ error: e.message || e }, 500);
    }
});
