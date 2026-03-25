const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const TOKEN = process.env.TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

if (!TOKEN) {
  console.error('Missing TOKEN env variable');
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('Missing PROJECT_ID env variable');
  process.exit(1);
}

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
  },
});

async function main() {
  const projects = await client.get('/projects', { params: { status: 'ALL' } });
  const hasProject = (projects.data || []).some((p) => p.id === PROJECT_ID);
  if (!hasProject) {
    throw new Error(`Project ${PROJECT_ID} is not visible for SUPER_ADMIN`);
  }

  const conversations = await client.get('/conversations');
  const projectConversations = (conversations.data || []).filter((c) => c.projectId === PROJECT_ID);

  await client.get(`/settings/${PROJECT_ID}`);
  await client.get(`/analytics/${PROJECT_ID}/overview`);

  console.log('SMOKE_OK');
  console.log(`Projects visible: ${(projects.data || []).length}`);
  console.log(`Conversations in project: ${projectConversations.length}`);
}

main().catch((error) => {
  const message = error.response?.data || error.message;
  console.error('SMOKE_FAILED', message);
  process.exit(1);
});
