/** Multipart body that keeps the browser filename, not the generated storage key. */
export function fileUploadFormData(
  file: File,
  extra?: Record<string, string | undefined>,
) {
  const formData = new FormData();
  formData.append("file", file);
  if (file.name.trim()) {
    formData.append("originalName", file.name);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value?.trim()) formData.append(key, value.trim());
    }
  }
  return formData;
}
