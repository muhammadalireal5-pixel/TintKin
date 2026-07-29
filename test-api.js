import 'dotenv/config';

const BASE = "https://yce-api-01.makeupar.com";
const KEY = process.env.YOUCAM_API_KEY;

async function test() {
  const url = "https://res.cloudinary.com/xz19clpr/image/upload/v1785173357/mini_xmzres.jpg";
  const response = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      src_file_url: url, 
      dst_actions: ["wrinkle", "firmness", "age_spot", "radiance"]
    })
  });
  const res = await response.json();
  console.log("INIT:", res);
  if(!res.data || !res.data.task_id) return;

  const taskId = res.data.task_id;
  for (let i = 0; i < 20; i++) {
    const statusRes = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis/${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` }
    }).then(r => r.json());
    console.log("POLL:", statusRes);
    if(statusRes.data?.task_status === "failed" || statusRes.data?.task_status === "success") break;
    await new Promise(r => setTimeout(r, 1000));
  }
}

test();
