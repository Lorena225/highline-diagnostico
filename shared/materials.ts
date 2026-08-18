export const MAX_MATERIAL_FILE_BYTES = 3 * 1024 * 1024;

export const MATERIAL_ACCEPT_ATTRIBUTE = "application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/jpeg,image/png,image/webp";

const acceptedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
]);

export function isSupportedMaterialFile(file: { name: string; size: number; type: string }) {
  const hasAllowedExtension = /\.(docx?|xlsx?|pptx?|pdf|csv|txt)$/i.test(file.name);
  return file.size > 0 && file.size <= MAX_MATERIAL_FILE_BYTES && (acceptedMimeTypes.has(file.type) || (file.type === "" && hasAllowedExtension));
}
