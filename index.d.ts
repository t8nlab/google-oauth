/**
 * @package @t8n/google-oauth
 * Lightweight Google OAuth2 client for TitanPL.
 * Provides a synchronous DX over OAuth using TitanPl Runtime APIs like response and http.
 */

/**
 * Configuration options for Google OAuth
 */
export interface GoogleConfig {
  /** Google OAuth Client ID */
  clientId: string;

  /** Google OAuth Client Secret */
  clientSecret: string;

  /** Redirect URI registered in Google Cloud Console */
  redirectUri: string;

  /** OAuth scopes (default: "openid email profile") */
  scope?: string;
}

/**
 * Normalized user profile returned from Google ID token
 */
export interface GoogleUser {
  /** Unique Google user ID */
  id: string;

  /** Full name */
  name: string;

  /** Email address */
  email: string;

  /** Profile picture URL */
  picture?: string;
}

/**
 * OAuth callback result
 */
export interface GoogleAuthResult {
  /** Decoded user profile */
  user: GoogleUser;

  /** Access token for Google APIs */
  access_token: string;

  /** Refresh token for Google APIs (returned on first login or prompt=consent) */
  refresh_token?: string;

  /** ID token for OIDC verification */
  id_token?: string;
}

/**
 * Gmail message details
 */
export interface GmailMessage {
  /** Unique message ID */
  id: string;
  /** Thread ID */
  threadId: string;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Email subject */
  subject: string;
  /** Date header string */
  date: string;
  /** Short preview snippet */
  snippet: string;
  /** List of Gmail label IDs */
  labels: string[];
  /** Whether the message is read (calculated from labels) */
  isRead: boolean;
  /** Readable body content (HTML or Plain) */
  body: string;
  /** Plain text body content */
  text: string;
  /** List of attachments */
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  }[];
  /** Internal message timestamp in milliseconds */
  timestamp: string;
}

/**
 * Options for listing Gmail messages
 */
export interface GmailListOptions {
  /** Maximum number of messages to return (default: 10) */
  count?: number;
  /** Gmail search query or array of queries to be ORed (e.g. ["from:someone", "has:attachment"]) */
  q?: string | string[];
}

/**
 * Google OAuth Extension for TitanPL
 */
declare class Google {
  constructor(config: GoogleConfig);

  /**
   * Redirects the user to Google OAuth consent screen.
   */
  signIn(): any;

  /**
   * Handles OAuth callback and exchanges authorization code for tokens.
   */
  callback(code: string): GoogleAuthResult;

  /**
   * Refreshes the access token using a refresh token.
   */
  refreshToken(refresh_token: string): {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  };

  /**
   * Verifies an ID token using Google's tokeninfo endpoint and returns the decoded payload.
   */
  verifyIdToken(id_token: string): any;

  /**
   * Gmail API Utility
   */
  readonly gmail: {
    messages: {
      /**
       * Lists messages with full data.
       */
      list(access_token: string, options?: GmailListOptions): GmailMessage[];
      
      /**
       * Gets a single message by ID (raw Gmail API response).
       */
      get(access_token: string, messageId: string): any;

      /**
       * Gets attachment data.
       */
      getAttachment(
        access_token: string, 
        messageId: string, 
        attachmentId: string, 
        mimeType?: string, 
        filename?: string
      ): {
        url: string;
        filename: string;
        mimeType: string;
        raw: string;
      };
    };
  };

  /**
   * Decodes a JWT (ID token) and extracts payload.
   */
  parseJwt(token: string): any;

  /**
   * Decodes a Base64Url string to plain text.
   */
  decodeBase64Url(data: string): string;

  /**
   * Decodes a Base64Url string to raw bytes.
   */
  decodeBase64UrlRaw(data: string): Uint8Array;
}

export default Google;