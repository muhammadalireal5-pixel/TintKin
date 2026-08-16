import { unzipSync, strFromU8 } from "fflate";

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
  if (errStr.includes("error_src_face_out_of_bound")) {
    return "The face in your photo is partially out of bounds or cropped too tightly. Please ensure your full face (forehead to chin) is visible in the frame.";
  }
  if (errStr.includes("error_lighting_dark")) {
    return "The lighting in your photo is too dark for accurate simulation. Please use a clear, well-lit photo.";
  }
  return errStr;
}

async function pollTask(taskType, taskId) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${BASE}/s2s/v2.0/task/${taskType}/${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` }
    }).then(r => r.json());

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

/**
 * Extracts normalized score info from the YouCam API response.
 * Handles two response shapes:
 *
 * 1. Inline JSON (when format: "json" is sent):
 *    data.output = [{ type: "wrinkle", ui_score, raw_score, mask_urls }, ...]
 *
 * 2. ZIP URL (fallback when API returns a download link):
 *    data.url = "https://...score_info.zip"
 *    The ZIP contains skinanalysisResult/score_info.json with per-key objects.
 *
 * Returns: { wrinkle, firmness, age_spot, radiance, all, skin_age }
 *          where each concern key is { ui_score, raw_score }.
 */
export async function extractScoreInfo(data) {
  if (Array.isArray(data.output)) {
    const result = {};
    for (const item of data.output) {
      const key = item.type || item.action;
      if (key) {
        result[key] = {
          ui_score: item.ui_score,
          raw_score: item.raw_score,
          mask_urls: item.mask_urls,
        };
      }
      if (item.type === "all" || item.action === "all") {
        result.all = { score: item.score ?? item.ui_score ?? item.raw_score };
      }
      if (item.type === "skin_age" || item.action === "skin_age") {
        result.skin_age = item.score ?? item.value ?? item.ui_score ?? item.raw_score;
      }
    }
    if (data.all !== undefined) result.all = data.all;
    if (data.skin_age !== undefined) result.skin_age = data.skin_age;
    return result;
  }

  const zipUrl = data.url || data.results?.url;
  if (zipUrl && typeof zipUrl === "string") {
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to download score ZIP: ${zipResponse.status} ${zipResponse.statusText}`);
    }
    const zipBuffer = new Uint8Array(await zipResponse.arrayBuffer());
    const unzipped = unzipSync(zipBuffer);

    const scoreEntryName = Object.keys(unzipped).find(
      (name) => name.endsWith("score_info.json")
    );

    if (!scoreEntryName) {
      console.warn("[YouCam] score_info.json not found in ZIP. Entries:", Object.keys(unzipped));
      throw new Error("score_info.json not found inside YouCam results ZIP");
    }

    const scoreJson = JSON.parse(strFromU8(unzipped[scoreEntryName]));
    return scoreJson;
  }

  if (data.wrinkle || data.firmness || data.age_spot || data.radiance) {
    console.log("[YouCam] Parsing flat object response");
    return data;
  }

  console.warn("[YouCam] Unrecognized response shape, returning raw data:", JSON.stringify(data, null, 2));
  return data;
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
      dst_actions: ["wrinkle", "firmness", "age_spot", "radiance"],
      format: "json"
    })
  });

  const res = await response.json();
  const taskId = res.data?.task_id || res.task_id || res.result?.task_id;

  if (!taskId) {
    const rawErr = res.error_message || res.error || JSON.stringify(res);
    throw new Error(formatYouCamError(rawErr));
  }

  return pollTask("skin-analysis", taskId);
}



/**
 * AI Skin Simulation API: Visualizes treatment progress by enhancing specific skin concerns.
 * @param {string} imageUrl - The source image URL
 * @param {Object} intensities - Map of skin concerns to their improvement intensity (0.0 to 1.0)
 *                               e.g., { wrinkle: 0.5, age_spot: 0.8, radiance: 0.4 }
 */
export async function simulateSkin(imageUrl, intensities = {}) {
  const payloadIntensities = { ...intensities };
  if (Object.values(payloadIntensities).length === 0 || Object.values(payloadIntensities).every(v => !v || v === 0)) {
    payloadIntensities.radiance = 0.05;
  }

  const candidates = [];
  if (imageUrl.includes("/upload/")) {
    candidates.push(imageUrl.replace("/upload/", "/upload/c_thumb,g_face,z_1.05,w_1200,h_1200/"));
    candidates.push(imageUrl.replace("/upload/", "/upload/c_thumb,g_face,z_0.9,w_1200,h_1200/"));
  }
  if (!candidates.includes(imageUrl)) {
    candidates.push(imageUrl);
  }

  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const candidateUrl = candidates[i];

    try {
      const response = await fetch(`${BASE}/s2s/v2.0/task/skin-simulation`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          src_file_url: candidateUrl,
          ...payloadIntensities
        })
      });

      const res = await response.json();
      const taskId = res.data?.task_id || res.task_id || res.result?.task_id;

      if (!taskId) {
        const rawErr = res.error_message || res.error || JSON.stringify(res);
        throw new Error(formatYouCamError(rawErr));
      }

      const taskResult = await pollTask("skin-simulation", taskId);
      return taskResult;
    } catch (err) {
      lastError = err;
      const errMsg = err.message || "";
      const isRetryable =
        errMsg.includes("error_src_face_too_small") ||
        errMsg.includes("too small") ||
        errMsg.includes("error_src_face_out_of_bound") ||
        errMsg.includes("out of bound");

      if (isRetryable && i < candidates.length - 1) {
        console.log(`[YouCam] simulateSkin candidate ${i + 1} failed with face positioning error: "${errMsg}". Retrying next candidate...`);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

