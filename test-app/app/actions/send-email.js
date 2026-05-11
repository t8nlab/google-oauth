import { google } from "./login.js";
import { defineAction } from "@titanpl/native";

/**
 * Action to send a Gmail message.
 * Query params: token, to, subject, body
 */
export default defineAction((req) => {
    const token = req.query.token;
    const { to, subject, body } = req.query;

    if (!token) throw new Error("Missing token");
    if (!to || !subject || !body) throw new Error("Missing email details (to, subject, body)");

    return google.gmail.messages.send(token, {
        to,
        subject,
        body
    });
});
