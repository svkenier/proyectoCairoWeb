import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';


dotenv.config();
dotenv.config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] ?? '';
const GITHUB_OWNER = process.env['GITHUB_OWNER'] ?? '';
const GITHUB_REPO  = process.env['GITHUB_REPO'] ?? '';

const GH_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
const GH_HEADERS = {
  'Authorization':       `token ${GITHUB_TOKEN}`,
  'Accept':              'application/vnd.github+json',
  'Content-Type':        'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function ghRequest(method: string, path: string, branch: string, body?: any) {
  const url = new URL(`${GH_BASE}/${path}`);
  if (method === 'GET') {
    url.searchParams.append('ref', branch);
  }
  const response = await fetch(url.toString(), {
    method,
    headers: GH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined;

  const json = await response.json();
  if (!response.ok) {
    const msg = json.message || '';
    if (method === 'GET' && (msg.includes('Not Found') || msg.includes('empty') || msg.includes('No commit found'))) {
      return null;
    }
    throw new Error(`GitHub API error (${response.status}): ${msg}`);
  }
  return json;
}

async function getFile(path: string, branch: string) {
  return await ghRequest('GET', path, branch);
}

async function putFile(path: string, content: string, message: string, branch: string, sha?: string) {
  const base64Content = Buffer.from(content).toString('base64');
  await ghRequest('PUT', path, branch, {
    message,
    content: base64Content,
    branch,
    ...(sha ? { sha } : {}),
  });
}

async function deleteFile(path: string, sha: string, message: string, branch: string) {
  try {
    await ghRequest('DELETE', path, branch, { message, sha, branch });
  } catch (err) {
    console.warn(`[WARN] Failed to delete ${path}: ${err.message}`);
  }
}

async function purgeBranch(branch: string) {
  console.log(`\n=== PURGING BRANCH: ${branch} ===`);
  
  // 1. PETS
  const petsFile = await getFile('data/pets.json', branch);
  if (petsFile) {
    const petsArray = JSON.parse(Buffer.from(petsFile.content, 'base64').toString('utf-8'));
    const validPets = [];
    let petsDeletedCount = 0;
    
    for (const pet of petsArray) {
      const isTest = pet.nombre?.toLowerCase().includes('test') || pet.id.includes('test');
      if (isTest) {
        console.log(`[${branch}] Deleting Test Pet: ${pet.nombre} (${pet.id})`);
        
        // Delete individual file
        const indFile = await getFile(`data/pets/${pet.id}.json`, branch);
        if (indFile) {
          await deleteFile(`data/pets/${pet.id}.json`, indFile.sha, `Purge test pet ${pet.id}`, branch);
        }
        
        // Delete images if they exist
        const mainImg = await getFile(`images/pets/${pet.id}.webp`, branch);
        if (mainImg) {
          await deleteFile(`images/pets/${pet.id}.webp`, mainImg.sha, `Purge test pet img ${pet.id}`, branch);
        }
        
        petsDeletedCount++;
      } else {
        validPets.push(pet);
      }
    }
    
    if (petsDeletedCount > 0) {
      console.log(`[${branch}] Updating data/pets.json...`);
      await putFile('data/pets.json', JSON.stringify(validPets, null, 2), `Purge ${petsDeletedCount} test pets`, branch, petsFile.sha);
    } else {
      console.log(`[${branch}] No test pets found.`);
    }
  } else {
    console.log(`[${branch}] data/pets.json not found.`);
  }

  // 2. ANNOUNCEMENTS
  const annFile = await getFile('data/announcements.json', branch);
  if (annFile) {
    const annArray = JSON.parse(Buffer.from(annFile.content, 'base64').toString('utf-8'));
    const validAnn = [];
    let annDeletedCount = 0;
    
    for (const ann of annArray) {
      const isTest = ann.title?.toLowerCase().includes('test') || ann.id.includes('test');
      if (isTest) {
        console.log(`[${branch}] Deleting Test Announcement: ${ann.title} (${ann.id})`);
        
        const indFile = await getFile(`data/announcements/${ann.id}.json`, branch);
        if (indFile) {
          await deleteFile(`data/announcements/${ann.id}.json`, indFile.sha, `Purge test announcement ${ann.id}`, branch);
        }
        
        const mainImg = await getFile(`images/announcements/${ann.id}.webp`, branch);
        if (mainImg) {
          await deleteFile(`images/announcements/${ann.id}.webp`, mainImg.sha, `Purge test ann img ${ann.id}`, branch);
        }
        
        annDeletedCount++;
      } else {
        validAnn.push(ann);
      }
    }
    
    if (annDeletedCount > 0) {
      console.log(`[${branch}] Updating data/announcements.json...`);
      await putFile('data/announcements.json', JSON.stringify(validAnn, null, 2), `Purge ${annDeletedCount} test announcements`, branch, annFile.sha);
    } else {
      console.log(`[${branch}] No test announcements found.`);
    }
  } else {
    console.log(`[${branch}] data/announcements.json not found.`);
  }
}

async function runCleanup() {
  console.log('=== PURGING UPSTASH REDIS ===');
  let cursor = '0';
  let keysToDelete = [];
  do {
    const res = await redis.scan(cursor, { match: 'user:*', count: 1000 });
    cursor = res[0];
    const keys = res[1];
    
    for (const key of keys) {
      const username = key.replace('user:', '');
      // Only match common test patterns: 'testuser_', 'admin_test_', 'test_', 'admin test'
      if (username.toLowerCase().includes('test')) {
        keysToDelete.push(key);
      }
    }
  } while (cursor !== '0');

  if (keysToDelete.length === 0) {
    console.log('No test users found in Redis.');
  } else {
    console.log(`Found ${keysToDelete.length} test users in Redis. Deleting...`);
    for (const key of keysToDelete) {
      await redis.del(key);
      console.log(`Deleted Redis Key: ${key}`);
    }
  }

  // Purge Branches
  await purgeBranch('main');
  await purgeBranch('staging');
}

runCleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
