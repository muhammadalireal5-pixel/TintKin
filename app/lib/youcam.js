import { unzipSync, strFromU8 } from "fflate";
import { applyFaceCropToCloudinary } from "@/lib/utils/cloudinary";
import { YOUCAM_DST_ACTIONS } from "@/lib/constants/metrics";

const BASE = "https://yce-api-01.makeupar.com";
const KEY = process.env.YOUCAM_API_KEY;


function formatYouCamError(errStr) {
  if (typeof errStr !== "string") errStr = JSON.stringify(errStr);
  if (errStr.includes("error_src_face_too_small")) {
    return "Your face appears too small or far away in the photo. Please upload a closer, clear photo of your face.";
  }
  if (errStr.includes("error_src_face_not_found")) {
    return "No face was detected. If you are wearing a hijab or head covering, ensure your forehead, cheeks, and chin are clearly visible in good lighting.";
  }
  if (errStr.includes("error_src_face_out_of_bound")) {
    return "The face in your photo is cropped too tightly or partially out of bounds. Please step slightly back so your full face (forehead to chin) is visible.";
  }
  if (errStr.includes("error_lighting_dark")) {
    return "The lighting in your photo is too dark for accurate analysis. Please use a clear, well-lit photo.";
  }
  return errStr;
}

function createYouCamError(rawErr) {
  const rawStr = typeof rawErr === "string" ? rawErr : JSON.stringify(rawErr);
  const formatted = formatYouCamError(rawStr);
  const err = new Error(formatted);
  err.rawCode = rawStr;
  err.isUserFacing = formatted !== rawStr;
  return err;
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
      throw createYouCamError(rawErr);
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
      throw new Error(`Unable to extract results`);
    }
    const zipBuffer = new Uint8Array(await zipResponse.arrayBuffer());
    const unzipped = unzipSync(zipBuffer);

    const scoreEntryName = Object.keys(unzipped).find(
      (name) => name.endsWith("score_info.json")
    );

    if (!scoreEntryName) {
      throw new Error("Failed to get scores, please try again soon!");
    }

    const scoreJson = JSON.parse(strFromU8(unzipped[scoreEntryName]));
    return scoreJson;
  }

  if (data.wrinkle || data.firmness || data.age_spot || data.radiance) {
    return data;
  }

  return data;
}

export async function analyzeSkin(imageUrl) {
  const candidates = [];
  // Candidate 1: Original uncropped image so YouCam's native detector has full head & shoulder context
  candidates.push(imageUrl);

  if (imageUrl.includes("/upload/")) {
    // Candidate 2: Wide padding crop (0.9 zoom) giving plenty of margin around head coverings
    candidates.push(applyFaceCropToCloudinary(imageUrl, 0.9));
    // Candidate 3: Standard centered crop (1.05 zoom)
    candidates.push(applyFaceCropToCloudinary(imageUrl, 1.05));
    // Candidate 4: Tighter zoom (1.3 zoom) as last resort if face was too far away
    candidates.push(applyFaceCropToCloudinary(imageUrl, 1.3));
  }

  const startTime = Date.now();
  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const candidateUrl = candidates[i];

    try {
      const response = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          src_file_url: candidateUrl, 
          dst_actions: YOUCAM_DST_ACTIONS,
          format: "json"
        })
      });

      const res = await response.json();
      const taskId = res.data?.task_id || res.task_id || res.result?.task_id;

      if (!taskId) {
        const rawErr = res.error_message || res.error || JSON.stringify(res);
        throw createYouCamError(rawErr);
      }

      return await pollTask("skin-analysis", taskId);
    } catch (err) {
      lastError = err;
      const rawCode = (err?.rawCode || "").toLowerCase();
      const errMsg = (err?.message || String(err)).toLowerCase();
      const isRetryable =
        rawCode.includes("error_src_face") ||
        rawCode.includes("face_not_found") ||
        rawCode.includes("face_too_small") ||
        rawCode.includes("face_out_of_bound") ||
        rawCode.includes("error_lighting_dark") ||
        errMsg.includes("out of bound") ||
        errMsg.includes("too small") ||
        errMsg.includes("not found") ||
        errMsg.includes("error_src_face");

      const elapsed = Date.now() - startTime;
      if (isRetryable && i < candidates.length - 1 && elapsed < 45000) {
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("Failed to analyze skin photo.");
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
    candidates.push(applyFaceCropToCloudinary(imageUrl, 1.05));
    candidates.push(applyFaceCropToCloudinary(imageUrl, 0.9));
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
        continue;
      }

      throw "Something went wrong, try again later!";
    }
  }

  throw lastError;
}

