const video = document.getElementById("video");
const gestureHint = document.getElementById("gestureHint");

/* ---------- THREE.JS SETUP ---------- */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 3;

/* ---------- MEDIAPIPE HANDS ---------- */
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults(onResults);

/* ---------- CAMERA ---------- */
const cameraFeed = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480,
});

cameraFeed.start();

/* ---------- VARIABLES FOR GESTURE CONTROL ---------- */
let lastIndexX = null;
let lastIndexY = null;
let rotationY = 0;
let rotationX = 0;
let zoom = 3; // camera z pos

function distance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +
    (p1.y - p2.y) ** 2 +
    (p1.z - p2.z) ** 2
  );
}

function isFist(landmarks) {
  // Fingers to check: index, middle, ring, pinky
  const fingers = [
    [8, 6],   // index
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ];

  let foldedCount = 0;
  for (const [tip, pip] of fingers) {
    if (landmarks[tip].y > landmarks[pip].y) {
      foldedCount++;
    }
  }

  return foldedCount >= 3; // at least 3 folded means fist
}

function onResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    lastIndexX = null;
    lastIndexY = null;
    gestureHint.textContent = "No hand detected";
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  const indexTip = landmarks[8];
  const thumbTip = landmarks[4];

  if (lastIndexX === null || lastIndexY === null) {
    lastIndexX = indexTip.x;
    lastIndexY = indexTip.y;
    gestureHint.textContent = "Tracking hand...";
    return;
  }

  // Rotation (swapped left/right)
  const deltaX = lastIndexX - indexTip.x;
  const deltaY = indexTip.y - lastIndexY;

  rotationY += deltaX * Math.PI * 2;
  rotationX += deltaY * Math.PI * 2;

  lastIndexX = indexTip.x;
  lastIndexY = indexTip.y;

  const pinchDist = distance(thumbTip, indexTip);
  const fist = isFist(landmarks);

  let gestureText = "No gesture";

  if (pinchDist < 0.07) {
    zoom -= 0.08;
    gestureText = "Zoom In (Pinch)";
  } else if (fist) {
    zoom += 0.08;
    gestureText = "Zoom Out (Fist)";
  }

  zoom = Math.min(Math.max(zoom, 1.5), 7);

  cube.rotation.y = rotationY;
  cube.rotation.x = rotationX;
  camera.position.z = zoom;

  gestureHint.textContent = gestureText;
}

/* ---------- RENDER LOOP ---------- */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
