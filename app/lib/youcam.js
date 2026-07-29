const BASE = "https://yce-api-01.makeupar.com";
const KEY = process.env.YOUCAM_API_KEY;

/**
 * Injects a Cloudinary face-detection crop into the URL so YouCam
 * always receives a face-centered, reasonably-sized image.
 * g_face   → auto-detects and centers on the face
 * c_thumb  → face-aware thumbnail crop
 * z_1.3    → zooms IN (70-75% face width, perfectly in YouCam's 60-80% sweet spot)
 * w/h 1200 → high resolution for accurate skin analysis
 */
function faceCroppedUrl(cloudinaryUrl) {
  return cloudinaryUrl.replace(
    "/upload/",
    "/upload/c_thumb,g_face,z_1.3,w_1200,h_1200/"
  );
}

function formatYouCamError(errStr) {
  if (typeof errStr !== "string") errStr = JSON.stringify(errStr);
  if (errStr.includes("error_src_face_too_small")) {
    return "Your face appears too small or far away in the photo. Please upload a closer, clear photo of your face.";
  }
  if (errStr.includes("error_src_face_not_found")) {
    return "No face was detected. Please ensure your face is clearly visible and well-lit.";
  }
  return errStr;
}

async function pollTask(taskType, taskId) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${BASE}/s2s/v2.0/task/${taskType}/${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` }
    }).then(r => r.json());

    console.log(`[YouCam] Poll #${i + 1} for ${taskType}/${taskId}:`, JSON.stringify(res, null, 2));

    const data = res.data || res.result || res;
    const status = data.task_status || data.status || res.task_status;

    if (status === "success" || status === "completed") {
      return data;
    }
    if (status === "error" || status === "failed") {
      const rawErr = data.error_code || data.error_message || data.error || JSON.stringify(res);
      throw new Error(formatYouCamError(rawErr));
    }

    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("YouCam task timeout");
}

export async function analyzeSkin(imageUrl) {
  const croppedUrl = faceCroppedUrl(imageUrl);
  console.log("[YouCam] Original URL:", imageUrl);
  console.log("[YouCam] Cropped URL sent:", croppedUrl);

  const response = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      src_file_url: croppedUrl, 
      dst_actions: ["wrinkle", "firmness", "age_spot", "radiance"]
    })
  });

  const res = await response.json();
  console.log("[YouCam] Task creation response:", JSON.stringify(res, null, 2));
  const taskId = res.data?.task_id || res.task_id || res.result?.task_id;

  if (!taskId) {
    const rawErr = res.error_message || res.error || JSON.stringify(res);
    throw new Error(formatYouCamError(rawErr));
  }

  return pollTask("skin-analysis", taskId);
}

export async function ageFace(imageUrl, targetAge, intensity = 1) {
  const croppedUrl = faceCroppedUrl(imageUrl);
  const effAge = Math.round(25 + (targetAge - 25) * intensity);
  const response = await fetch(`${BASE}/s2s/v2.0/task/aging-generator`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      src_file_url: croppedUrl, 
      target_age: effAge 
    })
  });

  const res = await response.json();
  const taskId = res.data?.task_id || res.task_id || res.result?.task_id;

  if (!taskId) {
    const rawErr = res.error_message || res.error || JSON.stringify(res);
    throw new Error(formatYouCamError(rawErr));
  }

  return pollTask("aging-generator", taskId);
}
