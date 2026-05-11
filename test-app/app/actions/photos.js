import { google } from "./login.js";
import { defineAction } from "@titanpl/native";

/**
 * Action to fetch Google Photos data.
 * Query params: token
 */
export default defineAction((req) => {
    const token = req.query.token;
    if (!token) throw new Error("Missing token");

    // Fetch albums and recent media items
    const albums = google.photos.albums.list(token, { count: 10 });
    const media = google.photos.mediaItems.list(token, { count: 10 });

    return {
        albums: albums.albums || [],
        media: media.mediaItems || []
    };
});
