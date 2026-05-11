import { google } from "./login.js";
import { defineAction } from "@titanpl/native";

/**
 * Action to archive a Gmail message.
 * Query params: token, messageId
 */
export default defineAction((req) => {
    const token = req.query.token;
    const messageId = req.query.messageId;

    if (!token) throw new Error("Missing token");
    if (!messageId) throw new Error("Missing messageId");

    return google.gmail.messages.archive(token, messageId);
});
