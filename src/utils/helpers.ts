export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const generateId = (len: number = 13): string => {
  return Math.random().toString(36).substring(2, 2 + len);
};

