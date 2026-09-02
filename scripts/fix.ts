import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:\\Users\\SVKENIER\\OneDrive\\Escritorio\\petRescue\\petRescue\\.env.local' });
dotenv.config({ path: 'C:\\Users\\SVKENIER\\OneDrive\\Escritorio\\petRescue\\petRescue\\.env' });
const OWNER = process.env.GITHUB_OWNER || 'pet-rescue-org';
const REPO = process.env.GITHUB_REPO || 'pet-shelter-data';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}

const REPO_URL = `https://${TOKEN}@github.com/${OWNER}/${REPO}.git`;
const CLONE_DIR = 'C:\\Users\\SVKENIER\\OneDrive\\Escritorio\\petRescue\\petRescue\\scratch\\pet-shelter-data-announcements';

const ANNOUNCEMENT_URLS = [
  "https://images.unsplash.com/photo-1576201836106-db1758fd1c97",
  "https://images.unsplash.com/photo-1601758177266-bc599de87707",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b",
  "https://images.unsplash.com/photo-1589924691995-400dc9ecc119",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d"
];

async function downloadImage(url: string, dest: string) {
  const fullUrl = `${url}?auto=format&fit=crop&q=80&w=800&fm=webp`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Failed to fetch image ${url}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
}

function runCmd(cmd: string, cwd = process.cwd()) {
  console.log(`Running: ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

async function run() {
  if (fs.existsSync(CLONE_DIR)) {
    fs.rmSync(CLONE_DIR, { recursive: true, force: true });
  }

  console.log("Cloning repository...");
  runCmd(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`);
  
  // Checkout main first
  runCmd(`git checkout main`, CLONE_DIR);

  fs.mkdirSync(path.join(CLONE_DIR, 'images/announcements'), { recursive: true });

  const masterPath = path.join(CLONE_DIR, 'data/announcements.json');
  let masterAnnouncements = [];
  try {
    masterAnnouncements = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  } catch(e) {
    console.error("Could not read master announcements json");
    process.exit(1);
  }

  if (masterAnnouncements.length === 0) {
    console.log("No announcements found to fix.");
    process.exit(0);
  }

  const titleToUrl = {
    "Jornada de Vacunación Antirrábica": "https://images.unsplash.com/photo-1576201836106-db1758fd1c97",
    "Taller de Adiestramiento Canino": "https://images.unsplash.com/photo-1601758177266-bc599de87707",
    "Feria de Adopción Fin de Semana": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b",
    "Colecta Solidaria de Alimento": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119",
    "Campaña de Esterilización": "https://images.unsplash.com/photo-1518717758536-85ae29035b6d"
  };

  let updatedCount = 0;
  for (let ann of masterAnnouncements) {
    const matchedUrl = Object.entries(titleToUrl).find(([title]) => ann.title.includes(title.substring(0, 10)))?.[1];
    if (matchedUrl && !ann.image_url) {
      console.log(`Fixing image for ${ann.id} (${ann.title})...`);
      const imgPath = `images/announcements/${ann.id}.webp`;
      await downloadImage(matchedUrl, path.join(CLONE_DIR, imgPath));
      
      const imgUrl = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@main/${imgPath}`;
      ann.image_url = imgUrl;

      // Update individual JSON
      const indPath = path.join(CLONE_DIR, `data/announcements/${ann.id}.json`);
      if (fs.existsSync(indPath)) {
        let indData = JSON.parse(fs.readFileSync(indPath, 'utf-8'));
        indData.image_url = imgUrl;
        fs.writeFileSync(indPath, JSON.stringify(indData, null, 2));
      }
      updatedCount++;
    }
  }

  fs.writeFileSync(masterPath, JSON.stringify(masterAnnouncements, null, 2));

  console.log(`Fixed ${updatedCount} announcements. Committing to main...`);
  runCmd(`git add .`, CLONE_DIR);
  runCmd(`git commit -m "fix: restore webp images for announcements on main" || echo "Nothing to commit"`, CLONE_DIR);
  runCmd(`git push origin main`, CLONE_DIR);

  console.log("Committing to staging...");
  runCmd(`git fetch origin staging:staging`, CLONE_DIR);
  runCmd(`git checkout staging`, CLONE_DIR);
  runCmd(`git merge main`, CLONE_DIR);
  runCmd(`git push origin staging`, CLONE_DIR);

  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
