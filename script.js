
import * as THREE from "three";

// ========================================
// 1. NAVIGATION AND FOOTER
// ========================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const navItems = navLinks.querySelectorAll("a");
const yearElement = document.getElementById("year");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});

navItems.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

yearElement.textContent = new Date().getFullYear();


// ========================================
// 2. THREE.JS SCENE
// ========================================

const hero = document.querySelector(".hero");

const scene = new THREE.Scene();

const skyColor = new THREE.Color("#718a91");

scene.background = skyColor;
scene.fog = new THREE.FogExp2(skyColor, 0.008);


// ========================================
// 3. CAMERA
// ========================================

const camera = new THREE.PerspectiveCamera(
  55,
  1,
  0.1,
  500
);

// Move farther back to show more of the landscape.
camera.position.set(0, 12, 38);
camera.lookAt(0, 8, -12);


// ========================================
// 4. RENDERER
// ========================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 1.75)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

renderer.domElement.id = "aevorin-canvas";
renderer.domElement.setAttribute("aria-hidden", "true");

// Add the canvas behind the hero's text and overlay.
hero.prepend(renderer.domElement);


// ========================================
// 5. LIGHTING
// ========================================

const ambientLight = new THREE.HemisphereLight(
  "#d9e9f0",
  "#26372d",
  2.0
);

scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(
  "#ffe1ae",
  3.0
);

sunlight.position.set(-15, 25, 12);
scene.add(sunlight);


// ========================================
// 6. PROCEDURAL MOUNTAINS
// ========================================

function createMountain({
  x,
  z,
  width,
  height,
  color,
  seed
}) {
  const segments = 64;

  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    segments,
    segments
  );

  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;

  function noise(a, b) {
    const value = Math.sin(
      a * 127.1 + b * 311.7 + seed * 74.7
    ) * 43758.5453;

    return (value - Math.floor(value)) * 2 - 1;
  }

  for (let i = 0; i < positions.count; i++) {
    const px = positions.getX(i);
    const pz = positions.getZ(i);

    const normalizedX = px / (width / 2);
    const normalizedZ = pz / (height / 2);

    const ridge = Math.max(
      0,
      1 - Math.abs(normalizedX) * 0.7
    );

    const broadShape =
      Math.sin(normalizedX * 3.2 + seed) * 1.2 +
      Math.cos(normalizedX * 5.1 + seed * 2) * 0.8;

    const ruggedShape =
      noise(
        Math.round(px * 0.65),
        Math.round(pz * 0.65)
      ) * 1.6;

    const centerPeak =
      Math.exp(-normalizedX * normalizedX * 5) *
      height * 0.45;

    const edgeFalloff = Math.max(
      0,
      1 - normalizedZ * normalizedZ
    );

    const elevation =
      (
        centerPeak +
        broadShape * 1.5 +
        ruggedShape * 0.8
      ) * ridge * edgeFalloff;

    positions.setY(i, Math.max(-1, elevation));
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide
  });

  const mountain = new THREE.Mesh(geometry, material);

  mountain.position.set(x, 0, z);
  scene.add(mountain);

  return mountain;
}


// Distant mountain range
createMountain({
  x: -17,
  z: -28,
  width: 45,
  height: 25,
  color: "#9aafb5",
  seed: 1
});

createMountain({
  x: 17,
  z: -32,
  width: 45,
  height: 27,
  color: "#829ba5",
  seed: 2
});

// Middle mountain range
createMountain({
  x: -18,
  z: -15,
  width: 42,
  height: 25,
  color: "#526e7b",
  seed: 3
});

createMountain({
  x: 18,
  z: -18,
  width: 42,
  height: 28,
  color: "#3c596b",
  seed: 4
});

// Foreground terrain
createMountain({
  x: 0,
  z: -7,
  width: 60,
  height: 24,
  color: "#253d37",
  seed: 5
});


// ========================================
// 7. ATMOSPHERIC PARTICLES
// ========================================

const particleCount = 500;
const particlePositions = new Float32Array(
  particleCount * 3
);

for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] =
    (Math.random() - 0.5) * 90;

  particlePositions[i * 3 + 1] =
    Math.random() * 24;

  particlePositions[i * 3 + 2] =
    -Math.random() * 65;
}

const particleGeometry = new THREE.BufferGeometry();

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(particlePositions, 3)
);

const particleMaterial = new THREE.PointsMaterial({
  color: "#e7e1d2",
  size: 0.055,
  transparent: true,
  opacity: 0.48,
  sizeAttenuation: true,
  depthWrite: false
});

const particles = new THREE.Points(
  particleGeometry,
  particleMaterial
);

scene.add(particles);


// ========================================
// 8. MOUSE-CONTROLLED CAMERA
// ========================================

let targetX = 0;
let targetY = 0;

let currentX = 0;
let currentY = 0;

hero.addEventListener("pointermove", (event) => {
  const bounds = hero.getBoundingClientRect();

  if (!bounds.width || !bounds.height) return;

  targetX =
    (event.clientX - bounds.left) / bounds.width - 0.5;

  targetY =
    (event.clientY - bounds.top) / bounds.height - 0.5;
});

hero.addEventListener("pointerleave", () => {
  targetX = 0;
  targetY = 0;
});


// ========================================
// 9. RESPONSIVE CANVAS SIZING
// ========================================

function resizeScene() {
  const width = hero.clientWidth;
  const height = hero.clientHeight;

  if (width <= 0 || height <= 0) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

// Resize immediately and whenever the window changes.
resizeScene();

window.addEventListener("resize", resizeScene);

// Also handle hero-size changes that don't resize the window.
const heroResizeObserver = new ResizeObserver(() => {
  resizeScene();
});

heroResizeObserver.observe(hero);


// ========================================
// 10. ANIMATION LOOP
// ========================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Smoothly follow the pointer.
  currentX += (targetX - currentX) * 0.025;
  currentY += (targetY - currentY) * 0.025;

  camera.position.x = currentX * 1.5;
  camera.position.y = 12 - currentY * 0.8;

  camera.lookAt(
    currentX * 1.2,
    8 - currentY * 0.3,
    -12
  );

  // Gentle particle movement.
  particles.position.y =
    Math.sin(elapsed * 0.15) * 0.3;

  renderer.render(scene, camera);
}

animate();
