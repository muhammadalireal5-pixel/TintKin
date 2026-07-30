const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '/Users/muhammadali/Documents/hac/skin/.env.local' });

const BASE = "https://yce-api-01.makeupar.com";
const KEY = process.env.YOUCAM_API_KEY;

async function run() {
  try {
    const imageUrl = "https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,z_1.3,w_1200,h_1200/v1312461204/sample.jpg";
    const response = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        src_file_url: imageUrl, 
        dst_actions: ["wrinkle", "firmness", "age_spot", "radiance"]
      })
    });
    const res = await response.json();
    const taskId = res.data?.task_id || res.task_id || res.result?.task_id;
    console.log("Task ID:", taskId);

    for (let i = 0; i < 30; i++) {
      const pollRes = await fetch(`${BASE}/s2s/v2.0/task/skin-analysis/${taskId}`, {
        headers: { Authorization: `Bearer ${KEY}` }
      }).then(r => r.json());
      
      const status = pollRes.data?.task_status || pollRes.task_status;
      if (status === "success" || status === "completed") {
        console.log(JSON.stringify(pollRes, null, 2));
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
