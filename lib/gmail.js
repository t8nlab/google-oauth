import { buffer, log } from "@titanpl/native"
import { http } from "@titanpl/surface"
import { decodeBase64Url, toDataURL } from "../utils/helpers.js"

export const messages = {
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

  send: (access_token, email) => {
    const lines = [
      `To: ${email.to}`,
      `Subject: ${email.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      'MIME-Version: 1.0',
      '',
      email.body
    ];
    if (email.cc) lines.unshift(`Cc: ${email.cc}`);
    if (email.bcc) lines.unshift(`Bcc: ${email.bcc}`);

    const raw = lines.join('\r\n');
    const buf = buffer.fromUtf8(raw);
    const base64 = buffer.toBase64(buf);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = http.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      raw: encoded
    }, {
      headers: {
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json"
      }
    })

    if (res.status !== 200) {
      throw new Error("Gmail API error (send): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  },

  trash: (access_token, messageId) => {
    const res = http.post(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {}, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (trash): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  untrash: (access_token, messageId) => {
    const res = http.post(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`, {}, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (untrash): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  delete: (access_token, messageId) => {
    const res = http.delete(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 204 && res.status !== 200) throw new Error("Gmail API error (delete): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return true;
  },

  modify: (access_token, messageId, mods) => {
    const res = http.post(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, mods, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (modify): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  archive: (access_token, messageId) => {
    return messages.modify(access_token, messageId, { removeLabelIds: ["INBOX"] });
  },

  move: (access_token, messageId, { addLabelIds = [], removeLabelIds = [] }) => {
    return messages.modify(access_token, messageId, { addLabelIds, removeLabelIds });
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

export const threads = {
  list: (access_token, options = {}) => {
    const maxResults = options.count || 10;
    const params = { maxResults };
    if (options.q) params.q = Array.isArray(options.q) ? options.q.join(" OR ") : options.q;

    const res = http.get("https://gmail.googleapis.com/gmail/v1/users/me/threads", {
      params,
      headers: { Authorization: "Bearer " + access_token }
    })

    if (res.status !== 200) throw new Error("Gmail API error (threads.list): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data.threads || [];
  },

  get: (access_token, threadId) => {
    const res = http.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (threads.get): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  trash: (access_token, threadId) => {
    const res = http.post(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`, {}, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (threads.trash): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  untrash: (access_token, threadId) => {
    const res = http.post(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/untrash`, {}, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 200) throw new Error("Gmail API error (threads.untrash): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return res.data;
  },

  delete: (access_token, threadId) => {
    const res = http.delete(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
      headers: { Authorization: "Bearer " + access_token }
    })
    if (res.status !== 204 && res.status !== 200) throw new Error("Gmail API error (threads.delete): " + (res.data?.error?.message || JSON.stringify(res.data)));
    return true;
  }
}
