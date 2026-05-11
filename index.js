import { fetch, response } from "@titanpl/native"
import { http } from "@titanpl/surface"
import { parseJwt } from "./utils/helpers.js"
import * as gmailApi from "./lib/gmail.js"
import * as photosApi from "./lib/photos.js"

export default class Google {
  constructor(config = {}) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.scope = config.scope || "openid email profile"
  }

  // 🔹 Step 1: Redirect user to Google
  signIn(options = {}) {
    let url =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      "?client_id=" + this.clientId +
      "&redirect_uri=" + encodeURIComponent(this.redirectUri) +
      "&response_type=code" +
      "&scope=" + encodeURIComponent(this.scope) +
      "&access_type=offline" +
      "&prompt=consent"

    if (options.state) {
      url += "&state=" + encodeURIComponent(options.state)
    }

    return response.redirect(url)
  }

  // 🔹 Step 2: Handle callback
  callback(code) {
    const body =
      "code=" + code +
      "&client_id=" + this.clientId +
      "&client_secret=" + this.clientSecret +
      "&redirect_uri=" + this.redirectUri +
      "&grant_type=authorization_code"

    const tokenRes = drift(fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }))

    const token = JSON.parse(tokenRes.body)

    if (!token || token.error) {
      throw new Error("OAuth callback failed: " + (token?.error_description || token?.error || "Invalid response"));
    }

    const user = parseJwt(token.id_token)

    return {
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      id_token: token.id_token,
      access_token_expires_in: token.expires_in,
      refresh_token_expires_in: token.refresh_token_expires_in
    }
  }

  // 🔹 Step 3: Refresh Access Token
  refreshToken(refresh_token) {
    const body =
      "client_id=" + this.clientId +
      "&client_secret=" + this.clientSecret +
      "&refresh_token=" + refresh_token +
      "&grant_type=refresh_token"

    const tokenRes = http.post("https://oauth2.googleapis.com/token", body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })

    const token = tokenRes.data

    if (!token || !token.access_token) {
      throw new Error("Token refresh failed: " + (token?.error_description || token?.error || "Invalid response from Google token endpoint"));
    }

    return token
  }

  // 🔹 Verify ID Token
  verifyIdToken(id_token) {
    const res = http.get("https://oauth2.googleapis.com/tokeninfo", {
      params: { id_token }
    })

    if (res.status !== 200) {
      throw new Error("Invalid ID token: " + (res.data?.error_description || JSON.stringify(res.data) || "Unknown error"))
    }

    return res.data
  }

  // 🔹 Gmail API Utility
  get gmail() {
    return gmailApi;
  }

  // 🔹 Photos API Utility
  get photos() {
    return photosApi;
  }
}