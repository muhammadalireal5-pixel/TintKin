const BASE = "https://api.perfectcorp.com/v2";
const KEY = process.env.YOUCAM_API_KEY;

async function pollTask(taskId) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` }
    }).then(r => r.json());
    if (res.status === "completed") return res;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("YouCam timeout");
}

export async function analyzeSkin(imageUrl) {
  const { task_id } = await fetch(`${BASE}/skin-analysis`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, concerns: ["wrinkles","firmness","spots","radiance"], return_masks: true })
  }).then(r => r.json());
  return pollTask(task_id);
}

export async function ageFace(imageUrl, targetAge, intensity = 1) {
  const effAge = Math.round(25 + (targetAge - 25) * intensity);
  const { task_id } = await fetch(`${BASE}/aging-generator`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, target_age: effAge })
  }).then(r => r.json());
  return pollTask(task_id);
}
