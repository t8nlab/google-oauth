import { buffer, fetch, log, response } from "@titanpl/native"
import { http } from "@titanpl/surface"
function normalizeBase64(input) {
  if (!input) throw new Error("Empty input");

  return input
    .replace(/^data:.*;base64,/, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
}

function fixPadding(base64) {
  const pad = base64.length % 4;
  if (pad === 2) return base64 + "==";
  if (pad === 3) return base64 + "=";
  if (pad === 1) throw new Error("Invalid base64 length (corrupted)");
  return base64;
}

function toDataURL(broken, mime = "image/png") {
  let clean = normalizeBase64(broken);
  clean = fixPadding(clean);

  return `data:${mime};base64,${clean}`;
}

// 🔹 Decode JWT
function parseJwt(token) {
  let base64 = token.split('.')[1]
  return JSON.parse(decodeBase64Url(base64))
}

// 🔹 Decode Base64Url (Raw Bytes)
function decodeBase64UrlRaw(data) {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return buffer.fromBase64(base64)
}

// 🔹 Decode Base64Url (String)
function decodeBase64Url(data) {
  const bytes = decodeBase64UrlRaw(data)
  let str = ""
  for (let i = 0; bytes[i] !== undefined; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return str
}


export default class Google {
  constructor(config = {}) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.scope = config.scope || "openid email profile"
  }

  // 🔹 Step 1: Redirect user to Google
  signIn() {
    const url =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      "?client_id=" + this.clientId +
      "&redirect_uri=" + encodeURIComponent(this.redirectUri) +
      "&response_type=code" +
      "&scope=" + encodeURIComponent(this.scope) +
      "&access_type=offline" +
      "&prompt=consent"

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
    const self = this;
    return {
      messages: {
        list: (access_token, options = {}) => {
          const maxResults = options.count || 10;
          const params = { maxResults };
          if (options.q) {
            params.q = Array.isArray(options.q) ? options.q.join(" OR ") : options.q;
          }

          const res = http.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", {
            params,
            headers: { Authorization: "Bearer " + access_token }
          })

          if (res.status !== 200) {
            throw new Error("Gmail API error (list): " + (res.data?.error?.message || JSON.stringify(res.data)));
          }

          const data = res.data;

          if (!data.messages) return [];

          // Fetch full data for each message
          return data.messages.map(msg => {
            const fullMsgRes = http.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: "Bearer " + access_token }
            })

            if (fullMsgRes.status !== 200) {
              throw new Error("Gmail API error (get message): " + (fullMsgRes.data?.error?.message || JSON.stringify(fullMsgRes.data)));
            }

            const fullMsg = fullMsgRes.data;

            // Extract Headers
            const headers = fullMsg.payload.headers;
            const getHeader = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value;

            // Extract Body & Attachments
            let htmlText = "";
            let plainText = "";
            const attachments = [];

            const processParts = (payload) => {
              if (payload.mimeType === "text/plain" && payload.body && payload.body.data) {
                plainText = decodeBase64Url(payload.body.data);
              } else if (payload.mimeType === "text/html" && payload.body && payload.body.data) {
                htmlText = decodeBase64Url(payload.body.data);
              } else if (payload.filename && payload.body && payload.body.attachmentId) {
                attachments.push({
                  id: payload.body.attachmentId,
                  filename: payload.filename,
                  mimeType: payload.mimeType,
                  size: payload.body.size,
                  url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${fullMsg.id}/attachments/${payload.body.attachmentId}`
                });
              }

              if (payload.parts) {
                payload.parts.forEach(processParts);
              }
            };

            processParts(fullMsg.payload);

            return {
              id: fullMsg.id,
              threadId: fullMsg.threadId,
              from: getHeader("From"),
              to: getHeader("To"),
              subject: getHeader("Subject"),
              date: getHeader("Date"),
              snippet: fullMsg.snippet,
              labels: fullMsg.labelIds,
              isRead: !fullMsg.labelIds.includes("UNREAD"),
              body: htmlText || plainText,
              text: plainText,
              attachments: attachments,
              timestamp: fullMsg.internalDate
            };
          });
        },
        get: (access_token, messageId) => {
          const res = http.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
            headers: { Authorization: "Bearer " + access_token }
          })

          if (res.status !== 200) {
            throw new Error("Gmail API error (get): " + (res.data?.error?.message || JSON.stringify(res.data)));
          }

          return res.data;
        },
        getAttachment: (access_token, messageId, attachmentId, mimeType = "application/octet-stream", filename = "attachment") => {
          const res = http.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
            headers: { Authorization: "Bearer " + access_token }
          })

          if (res.status !== 200) {
            throw new Error("Gmail API error (getAttachment): " + (res.data?.error?.message || JSON.stringify(res.data)));
          }

          const data = res.data;
          if (!data || !data.data) {
            log("[ERROR] Gmail getAttachment response:", res.data);
            throw new Error(`Gmail attachment data missing. Status: ${res.status || 'unknown'}. Body: ${JSON.stringify(res.data)}`);
          }
          const isVisual = /image|pdf|video|audio/.test(mimeType);
          const finalData = isVisual ? toDataURL(data.data, mimeType) : data.data;

          return {
            url: finalData,
            filename,
            mimeType,
            raw: data.data
          }
        },
      }
    }
  }

}