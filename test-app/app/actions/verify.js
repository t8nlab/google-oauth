import { defineAction } from "@titanpl/native";
import { google } from "./login";

export default defineAction((req) => {
    const idToken = req.query.id_token;
    
    if (!idToken) {
        throw new Error("Missing id_token query parameter");
    }
    
    // Verifies the token cryptographically via Google's tokeninfo endpoint
    const decoded = google.verifyIdToken(idToken);
    
    return {
        success: true,
        message: "ID Token verified successfully!",
        data: {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        },
        raw_decoded: decoded
    };
});
