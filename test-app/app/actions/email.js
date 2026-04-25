import { defineAction, response } from "@titanpl/native";
import { google } from "./login";

export default defineAction((req) => {
    const access_token = Titan.env.GOOGLE_ACCESS_TOKEN
    const q = req.query.q || "has:attachment";

    try {
        const emails = google.gmail.messages.list(access_token, { count, q });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gmail Dashboard | Titan</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --primary: #38bdf8;
            --secondary: #818cf8;
            --accent: #f472b6;
            --border: #334155;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 2rem;
            display: flex;
            justify-content: center;
        }

        .container {
            max-width: 900px;
            width: 100%;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2rem;
            font-weight: 600;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
        }

        .header-badges {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .badge-info {
            background: var(--card-bg);
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-dim);
        }

        .badge-query {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid var(--primary);
            color: var(--primary);
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
        }

        .email-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .email-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 1.5rem;
            transition: transform 0.2s, border-color 0.2s;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .email-card:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
        }

        .email-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--primary);
            opacity: 0;
            transition: opacity 0.2s;
        }

        .email-card.unread::before {
            opacity: 1;
        }

        .email-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.5rem;
        }

        .from {
            font-weight: 600;
            color: var(--primary);
            font-size: 1.1rem;
        }

        .date {
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        .subject {
            font-weight: 400;
            margin-bottom: 0.5rem;
            font-size: 1rem;
        }

        .snippet {
            font-size: 0.9rem;
            color: var(--text-dim);
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .footer {
            margin-top: 3rem;
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            background: rgba(56, 189, 248, 0.1);
            color: var(--primary);
            margin-right: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Gmail Inbox</h1>
            <div class="header-badges">
                ${q ? `<div class="badge-query">🔍 ${q}</div>` : ''}
                <div class="badge-info">Found ${emails.length}</div>
            </div>
        </header>

        <div class="email-list">
            ${emails.map(email => {
                const date = new Date(parseInt(email.timestamp));
                const pad = (n) => n.toString().padStart(2, '0');
                const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                return `
                <div class="email-card ${!email.isRead ? 'unread' : ''}">
                    <div class="email-header">
                        <span class="from">${email.from}</span>
                        <span class="date">${dateStr}</span>
                    </div>
                    <div class="subject">${email.subject || '(No Subject)'}</div>
                    <div class="snippet">${email.snippet}</div>
                    <div style="margin-top: 1rem;">
                        ${email.labels.map(l => `<span class="badge">${l}</span>`).join('')}
                    </div>
                    ${email.attachments && email.attachments.length > 0 ? `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                            <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem;">Attachments:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${email.attachments.map(att => {
                                    const downloadUrl = `/download?token=${encodeURIComponent(access_token)}&msgId=${email.id}&attId=${att.id}&filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`;
                                    return `
                                    <a href="${downloadUrl}" target="_blank" style="font-size: 0.75rem; background: rgba(129, 140, 248, 0.1); color: var(--secondary); padding: 0.3rem 0.6rem; border-radius: 4px; text-decoration: none; border: 1px solid rgba(129, 140, 248, 0.2);">
                                        📎 ${att.filename} (${(att.size / 1024).toFixed(1)} KB)
                                    </a>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                `;
            }).join('')}
        </div>

        <div class="footer">
            Powered by Titan Google OAuth Utility
        </div>
    </div>
</body>
</html>
        `;
        return response.html(html);
    } catch (e) {
        if (e === "__SUSPEND__" || e.message === "__SUSPEND__") throw e;
        return response.html(`
            <div style="background: #1e293b; color: #f8fafc; padding: 2rem; border-radius: 1rem; font-family: sans-serif;">
                <h2 style="color: #ef4444;">Error Fetching Emails</h2>
                <p>${e.message || e}</p>
                <p>Ensure your access token is valid and has <b>gmail.readonly</b> scope.</p>
            </div>
        `);
    }
});
