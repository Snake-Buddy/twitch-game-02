// --- CONFIG & GLOBALS ---
const TWITCH_CHANNEL = "YOUR_USERNAME_HERE";
let gamePos = 0;
const cliffLimit = 10;
let playerModel, monsterModel;

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MODELS & ROAD ---
const loader = new THREE.GLTFLoader();

// Create the dirt road
const roadGeo = new THREE.BoxGeometry(20, 0.5, 4);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.position.y = -1;
scene.add(road);

// Load Characters
loader.load('models/knight.glb', (gltf) => {
    playerModel = gltf.scene;
    playerModel.scale.set(0.8, 0.8, 0.8);
    scene.add(playerModel);
});

loader.load('models/monster.glb', (gltf) => {
    monsterModel = gltf.scene;
    monsterModel.scale.set(1, 1, 1);
    scene.add(monsterModel);
});

camera.position.set(0, 2, 10);

// --- CORE FUNCTIONS ---
function push(amount) {
    gamePos += amount;
    new Audio('sounds/clash.mp3').play();
    
    if (Math.abs(gamePos) >= cliffLimit) {
        new Audio('sounds/scream.mp3').play();
        document.getElementById('status-text').innerText = gamePos > 0 ? "MONSTER WINS!" : "PLAYER WINS!";
        gamePos = 0; // Reset
        setTimeout(() => { document.getElementById('status-text').innerText = "BATTLE!"; }, 3000);
    }
}

// --- TWITCH INTEGRATION ---
ComfyJS.onChat = (user, message) => {
    if (message === "!player") push(-0.2);
    if (message === "!monster") push(0.2);
};

// Start everything
ComfyJS.Init(TWITCH_CHANNEL);

function animate() {
    requestAnimationFrame(animate);
    if (playerModel) playerModel.position.x = gamePos - 2;
    if (monsterModel) monsterModel.position.x = gamePos + 2;
    renderer.render(scene, camera);
}
animate();
