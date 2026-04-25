import Google from "@t8n/google-oauth";
import { defineAction } from "@titanpl/native";


const client_id = Titan.env.GOOGLE_OAUTH_CLINET_ID

export const google = new Google({
    clientId: client_id,
    clientSecret: Titan.env.GOOGLE_OAUTH_SECRET,
    redirectUri: "http://localhost:5100/call",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly"
})

export default defineAction((req) => {
    return google.signIn()
})