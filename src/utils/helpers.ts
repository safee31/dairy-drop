export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Generates a UUID v4
 */
export const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Normalize IP address for consistent comparison
 * Handles IPv6 localhost (::1) and IPv4 localhost (127.0.0.1)
 */
export const normalizeIP = (ip: string): string => {
  if (!ip) return "unknown";
  
  // Handle IPv6 localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }
  
  // Remove IPv6 prefix if exists
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  
  // Extract IP from IPv6 format like [::1]
  if (ip.startsWith("[") && ip.endsWith("]")) {
    const extracted = ip.slice(1, -1);
    if (extracted === "::1") return "127.0.0.1";
    return extracted;
  }
  
  return ip;
};
