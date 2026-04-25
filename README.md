# @t8n/google-oauth

Lightweight, high-performance Google OAuth2 and Gmail API client for **TitanPL**. This extension provides a synchronous Developer Experience (DX) for handling Google authentication and email data within the Titan Planet ecosystem.

## Features

- 🔐 **OAuth2 Flow**: Easy sign-in and callback handling.
- 📧 **Gmail Integration**: List emails with full data (Sender, Subject, Body, Snippet) in one call.
- 🔍 **Advanced Search**: Filter emails using powerful Gmail search queries.
- 📎 **Attachments**: Comprehensive support for listing and downloading email attachments.
- 🔄 **Token Refresh**: Effortlessly generate new access tokens from refresh tokens.
- 🛡️ **JWT Parsing**: Built-in utility to decode Google ID tokens.
- 🚀 **Titan Native**: Optimized for Titan Surface and Gravity runtime.

## Installation

```bash
titan install @t8n/google-oauth
```

## Quick Start

### 1. Initialization

```javascript
import Google from "@t8n/google-oauth";

const google = new Google({
    clientId: Titan.env.GOOGLE_CLIENT_ID,
    clientSecret: Titan.env.GOOGLE_CLIENT_SECRET,
    redirectUri: "http://localhost:5100/callback",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly"
});
```

### 2. Sign In Flow

```javascript
// action: login.js
export default defineAction(() => {
    return google.signIn();
});

// action: callback.js
export default defineAction((req) => {
    const result = google.callback(req.query.code);
    // Returns { user, access_token, refresh_token }
    return result;
});
```

### 3. Gmail API Usage

List recent emails with full metadata and attachments.

```javascript
// action: emails.js
export default defineAction((req) => {
    const token = req.query.token;
    
    // Fetch 5 emails that have attachments
    const emails = google.gmail.messages.list(token, { 
        count: 5,
        q: "has:attachment" 
    });
    
    return emails.map(email => ({
        subject: email.subject,
        attachments: email.attachments.map(a => a.filename)
    }));
});
```

### 4. Downloading Attachments

Fetch attachment content as a Data URL for preview or raw data.

```javascript
// action: download.js
export default defineAction((req) => {
    const { token, msgId, attId, mimeType, filename } = req.query;
    
    const result = google.gmail.messages.getAttachment(
        token, 
        msgId, 
        attId, 
        mimeType, 
        filename
    );
    
    // result.url contains a Data URL for images/PDFs, or raw base64 for others
    return result.url; 
});
```

### 5. Refreshing Tokens

```javascript
// action: refresh.js
export default defineAction((req) => {
    const refreshToken = req.query.refresh_token;
    const newTokens = google.refreshToken(refreshToken);
    return newTokens.access_token;
});
```

## API Reference

### `new Google(config)`
Initializes the Google client.
- `clientId`: Google Client ID.
- `clientSecret`: Google Client Secret.
- `redirectUri`: Callback URL.
- `scope`: Space-separated scopes.

### `google.signIn()`
Returns a redirect response to the Google Consent screen.

### `google.callback(code)`
Exchanges authorization code for tokens and user profile.
- Returns: `GoogleAuthResult { user, access_token, refresh_token }`.

### `google.refreshToken(token)`
Generates a new access token.
- Returns: `{ access_token, expires_in, scope, token_type, id_token }`.

### `google.gmail.messages.list(accessToken, options)`
Fetches a list of messages with full data.
- `accessToken`: Valid Google access token.
- `options.count`: Number of messages to fetch (default: 10).
- `options.q`: Gmail search query (e.g., `from:me`, `has:attachment`).
- Returns: `GmailMessage[]`.

### `google.gmail.messages.getAttachment(accessToken, msgId, attId, mimeType?, filename?)`
Fetches a specific attachment.
- `mimeType`: Optional. Used to generate Data URLs for visual files.
- `filename`: Optional. Included in the result object.
- Returns: `{ url, filename, mimeType, raw }`.

### `GmailMessage` Object
| Property | Description |
| :--- | :--- |
| `id` | Message ID |
| `threadId` | Thread ID |
| `from` | Sender address |
| `to` | Recipient address |
| `subject` | Email subject |
| `snippet` | Preview text |
| `body` | Full HTML/Plain body |
| `date` | Date string |
| `isRead` | Boolean status |
| `labels` | Array of Gmail labels (e.g., `["INBOX", "UNREAD"]`) |
| `attachments` | `GmailAttachment[]` |
| `timestamp` | Internal date in ms |

### `GmailAttachment` Object
| Property | Description |
| :--- | :--- |
| `id` | Attachment ID |
| `filename` | Original filename |
| `mimeType` | File MIME type |
| `size` | File size in bytes |
| `url` | API URL for direct fetching |

## Search Queries

The `q` parameter supports all standard Gmail search operators:
- `has:attachment`: Only emails with files.
- `from:example@gmail.com`: From a specific sender.
- `is:unread`: Only unread emails.
- `after:2023/01/01`: Emails after a specific date.
- `subject:(Meeting)`: Search in subject.

## Error Handling

When using `drift()` (implicit in this library), TitanPL may throw a `__SUSPEND__` signal. If you wrap calls in `try-catch`, ensure you re-throw this signal:

```javascript
try {
    const emails = google.gmail.messages.list(token);
} catch (e) {
    if (e === "__SUSPEND__" || e.message === "__SUSPEND__") throw e;
    // handle actual error
}
```