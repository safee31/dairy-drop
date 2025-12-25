// Updated validateKey function to allow an optional leading "/"
export const validateKey = (key = "") => {
  // Regex to allow an optional leading "/" in the key
  const regex = /^(\/)?[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;

  if (!regex.test(key)) {
    throw new Error(
      "Invalid key format. It should be 'foldername/filename.ext', and optionally can start with '/'."
    );
  }
};

// Updated extractFolderAndFilename function to handle optional leading "/"
export const extractFolderAndFilename = (key = "") => {
  // Remove the leading "/" if it's present, so we handle it correctly
  if (key.startsWith("/")) {
    key = key.slice(1);
  }

  const parts = key.split("/");
  const folder = parts.slice(0, parts.length - 1).join("/");
  const fileName = parts[parts.length - 1];

  return { folder, fileName };
};

export default { validateKey, extractFolderAndFilename };
