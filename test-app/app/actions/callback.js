import { defineAction } from "@titanpl/native";
import { google } from "./login";

export default defineAction((req) => {
    return google.callback(req.query.code)
})