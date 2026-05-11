import { buffer } from "@titanpl/native"

export function normalizeBase64(input) {
  if (!input) throw new Error("Empty input");

  return input
    .replace(/^data:.*;base64,/, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
}

export function fixPadding(base64) {
  const pad = base64.length % 4;
  if (pad === 2) return base64 + "==";
  if (pad === 3) return base64 + "=";
  if (pad === 1) throw new Error("Invalid base64 length (corrupted)");
  return base64;
}

export function toDataURL(broken, mime = "image/png") {
  let clean = normalizeBase64(broken);
  clean = fixPadding(clean);

  return `data:${mime};base64,${clean}`;
}

// 🔹 Decode Base64Url (Raw Bytes)
export function decodeBase64UrlRaw(data) {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return buffer.fromBase64(base64)
}

// 🔹 Decode Base64Url (String)
export function decodeBase64Url(data) {
  const bytes = decodeBase64UrlRaw(data)
  let str = ""
  for (let i = 0; bytes[i] !== undefined; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return str
}

// 🔹 Decode JWT
export function parseJwt(token) {
  let base64 = token.split('.')[1]
  return JSON.parse(decodeBase64Url(base64))
}
