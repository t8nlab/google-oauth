import { defineAction, response } from "@titanpl/native";
import { google } from "./login";

export default defineAction((req) => {
    const { token, msgId, attId, filename, mimeType } = req.query;

    if (!token || !msgId || !attId) {
        return response.json({ error: "Missing parameters" }, 400);
    }

    try {
        // Now returns an object: { url, filename, mimeType, raw }
        const result = google.gmail.messages.getAttachment(
            token,
            msgId,
            attId,
            mimeType || "application/octet-stream",
            filename || "attachment"
        );
        
        if (!result || !result.url) {
            throw new Error("Failed to retrieve attachment data");
        }

        // Return the 'url' property (which is either a Data URL or raw base64)
        return response.text(result.url);

    } catch (e) {
        if (e === "__SUSPEND__" || e.message === "__SUSPEND__" || e.name === "Suspend") throw e;
        return response.json({ error: e.message || e }, 500);
    }
});