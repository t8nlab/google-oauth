import Google from "@t8n/google-oauth";
import { defineAction } from "@titanpl/native";


const client_id = Titan.env.GOOGLE_OAUTH_CLIENT_ID

export const google = new Google({
    clientId: client_id,
    clientSecret: Titan.env.GOOGLE_OAUTH_SECRET,
    redirectUri: "https://fax-cornfield-landless.ngrok-free.dev/signup",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly"
})

export default defineAction((req) => {
    return google.signIn()
})