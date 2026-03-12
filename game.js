// --- CONFIG & GLOBALS ---
const TWITCH_CHANNEL = "YOUR_USERNAME_HERE";
let gamePos = 0;
const cliffLimit = 10;

// Team Tracking
const teams = {
    players: new Set(),
    monsters: new Set()
};

// Animation & Three.js Globals
let mixerPlayer, mixerMonster;
let playerModel, monsterModel;
const clock = new THREE.Clock();

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MODELS & ROAD ---
const loader = new THREE.GLTFLoader();

// Dirt Road
const roadGeo = new THREE.BoxGeometry(22, 0.5, 4);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.position.y = -1.1; 
scene.add(road);

// Load Models
loader.load('models/knight.glb', (gltf) => {
    playerModel = gltf.scene;
    playerModel.scale.set(0.8, 0.8, 0.8);
    scene.add(playerModel);
    mixerPlayer = new THREE.AnimationMixer(playerModel);
    if(gltf.animations[0]) mixerPlayer.clipAction(gltf.animations[0]).play(); // Default Idle
});

loader.load('models/monster.glb', (gltf) => {
    monsterModel = gltf.scene;
    monsterModel.scale.set(1.1, 1.1, 1.1);
    scene.add(monsterModel);
    mixerMonster = new THREE.AnimationMixer(monsterModel);
    if(gltf.animations[0]) mixerMonster.clipAction(gltf.animations[0]).play(); // Default Idle
});

camera.position.set(0, 2, 12);

// --- CORE FUNCTIONS ---

function push(amount, teamName) {
    gamePos += amount;
    
    // Play sound and trigger animation
    new Audio('sounds/clash.mp3').play();

    if (teamName === 'player' && mixerPlayer) {
        const action = mixerPlayer.clipAction(THREE.AnimationClip.findByName(playerModel.animations, 'Attack') || playerModel.animations[1]);
        action.reset().setLoop(THREE.LoopOnce).play();
    } else if (teamName === 'monster' && mixerMonster) {
        const action = mixerMonster.clipAction(THREE.AnimationClip.findByName(monsterModel.animations, 'Attack') || monsterModel.animations[1]);
        action.reset().setLoop(THREE.LoopOnce).play();
    }

    if (Math.abs(gamePos) >= cliffLimit) victory(gamePos > 0 ? "MONSTER" : "PLAYER");
    updateUI();
}

function updateUI() {
    document.getElementById('p-count').innerText = teams.players.size;
    document.getElementById('m-count').innerText = teams.monsters.size;
}

function victory(winner) {
    new Audio('sounds/scream.mp3').play();
    document.getElementById('status-text').innerText = `${winner} WINS!`;
    gamePos = 0;
    setTimeout(() => { document.getElementById('status-text').innerText = "BATTLE!"; }, 5000);
}

// --- TWITCH INTEGRATION ---

ComfyJS.onChat = (user, message, flags, self, extra) => {
    const msg = message.toLowerCase();

    // 1. Join Logic
    if (msg === "!join player") {
        teams.monsters.delete(user);
        teams.players.add(user);
        updateUI();
        return;
    }
    if (msg === "!join monster") {
        teams.players.delete(user);
        teams.monsters.add(user);
        updateUI();
        return;
    }

    // 2. Action Logic (If they are already in a team)
    if (teams.players.has(user)) push(-0.1, 'player');
    if (teams.monsters.has(user)) push(0.1, 'monster');
};

// Automatic push for Follows/Subs
ComfyJS.onFollow = (user) => {
    // If a new follower isn't on a team, maybe give the Player team a boost by default
    push(-0.5, 'player'); 
};

ComfyJS.onSub = (user, msg, subTier) => {
    const power = subTier === "3000" ? 5 : 2; // Tier 3 gets a massive 5-unit push
    if (teams.monsters.has(user)) push(power, 'monster');
    else push(-power, 'player');
};

ComfyJS.Init(TWITCH_CHANNEL);

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixerPlayer) mixerPlayer.update(delta);
    if (mixerMonster) mixerMonster.update(delta);

    if (playerModel) {
        playerModel.position.x = gamePos - 1.5;
        playerModel.rotation.y = Math.PI / 2;
    }
    if (monsterModel) {
        monsterModel.position.x = gamePos + 1.5;
        monsterModel.rotation.y = -Math.PI / 2;
    }

    renderer.render(scene, camera);
}
animate();
