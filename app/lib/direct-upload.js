import { getSelfieUploadSignature, uploadSelfieServerAction } from "@/app/lib/actions";

const MAX_DIRECT_BYTES = 10 * 1024 * 1024;

async function viaServer(file, flip) {
  const form = new FormData();
  form.append("file", file);
  if (flip) form.append("flip", "true");
  return uploadSelfieServerAction(form);
}

export async function uploadSelfie(file, { flip = false } = {}) {
  if (!file || file.size > MAX_DIRECT_BYTES) return viaServer(file, flip);
  const sig = await getSelfieUploadSignature({ flip }).catch(() => null);
  if (!sig?.success) return sig?.error ? { success: false, error: sig.error } : viaServer(file, flip);
  try {
    const form = new FormData();
    for (const [k, v] of Object.entries(sig.fields)) form.append(k, v);
    form.append("file", file);
    const res = await fetch(sig.url, { method: "POST", body: form, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.secure_url) throw new Error("No URL");
    return { success: true, url: data.secure_url };
  } catch {
    return viaServer(file, flip);
  }
}
