/**
 * npm install three@latest
*  node main_project_scripts/sync-three.cjs
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'node_modules', 'three');

const destinations = [
  path.join(root, 'main_project', 'js', 'lib', 'three'),
  path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'js', 'lib', 'three')
];

function fail(message) {
  console.error(`\n❌ Three.js sync failed: ${message}`);
  process.exit(1);
}

const packageJsonPath = path.join(packageRoot, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  fail('Three.js installed नहीं है। पहले npm install three चलाएँ।');
}

const packageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf8')
);

// केवल core और project में चुने गए addons
const files = [
  {
    source: 'build/three.module.js',
    target: 'three.module.js'
  },
  {
    source: 'build/three.core.js',
    target: 'three.core.js'
  },
  {
    source: 'examples/jsm/controls/OrbitControls.js',
    target: 'addons/controls/OrbitControls.js'
  },
  {
    source: 'examples/jsm/loaders/GLTFLoader.js',
    target: 'addons/loaders/GLTFLoader.js'
  },
  {
    source: 'examples/jsm/utils/BufferGeometryUtils.js',
    target: 'addons/utils/BufferGeometryUtils.js'
  },
  {
    source: 'examples/jsm/utils/SkeletonUtils.js',
    target: 'addons/utils/SkeletonUtils.js'
  }
];

// Copy करने से पहले सभी required source files verify करें
for (const file of files) {
  const source = path.join(packageRoot, file.source);

  if (!fs.existsSync(source)) {
    fail(`npm package में file नहीं मिली: ${file.source}`);
  }
}

// Import Map का core path index.html और 3d_preview.html में सुनिश्चित करें
const htmlFiles = [
  path.join(root, 'main_project', 'index.html'),
  path.join(root, 'main_project', '3d_preview.html')
];

for (const htmlPath of htmlFiles) {
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const oldImport = '"three": "./js/lib/three/three.module.min.js"';
    const newImport = '"three": "./js/lib/three/three.module.js"';

    if (html.includes(oldImport)) {
      html = html.replace(oldImport, newImport);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`Updated importmap in: ${path.basename(htmlPath)}`);
    }
  }
}

// सभी destinations (main_project और android assets) में files sync करें
for (const dest of destinations) {
  const targetParent = path.dirname(dest);
  if (!fs.existsSync(targetParent)) continue;

  console.log(`\nSyncing to: ${path.relative(root, dest)}`);
  for (const file of files) {
    const source = path.join(packageRoot, file.source);
    const target = path.join(dest, file.target);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);

    console.log(`  ✓ Synced: ${file.target}`);
  }
}

console.log(`\n✨ Three.js ${packageJson.version} successfully synced across all targets.\n`);
