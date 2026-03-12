// --- CONFIG & GLOBALS ---
const TWITCH_CHANNEL = "YOUR_USERNAME_HERE";
let gamePos = 0;
const cliffLimit = 10;

// Animation Variables
let mixerPlayer, mixerMonster;
let actionPlayer, actionMonster;
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

// Create the Road
const roadGeo = new THREE.BoxGeometry(22, 0.5, 4);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.position.y = -1.1; 
scene.add(road);

// Load Player (Knight)
let playerModel;
loader.load('models/knight.glb', (gltf) => {
    playerModel = gltf.scene;
    playerModel.scale.set(0.8, 0.8, 0.8);
    scene.add(playerModel);

    // Setup Animations
    mixerPlayer = new THREE.AnimationMixer(playerModel);
    // Assumes your model has an 'Idle' and 'Attack' animation
    const idleAnim = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    if(idleAnim) mixerPlayer.clipAction(idleAnim).play();
});

// Load Monster
let monsterModel;
loader.load('models/monster.glb', (gltf) => {
    monsterModel = gltf.scene;
    monsterModel.scale.set(1.1, 1.1, 1.1);
    scene.add(monsterModel);

    mixerMonster = new THREE.AnimationMixer(monsterModel);
    const idleAnim = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    if(idleAnim) mixerMonster.clipAction(idleAnim).play();
});

camera.position.set(0, 2, 12);

// --- CORE FUNCTIONS ---
function playAction(mixer, animations, name) {
    const clip = THREE.AnimationClip.findByName(animations, name);
    if (clip) {
        const action = mixer.clipAction(clip);
        action.reset().setLoop(THREE.LoopOnce).play();
        action.clampWhenFinished = true;
    }
}

function push(amount, team) {
    gamePos += amount;
    
    // Play sound
    new Audio('sounds/clash.mp3').play();

    // Trigger Attack Animations
    if (team === 'player' && mixerPlayer) {
        // Replace 'Attack' with whatever the animation name is in your .glb file
        const attack = mixerPlayer.clipAction(mixerPlayer._root.animations[1]); 
        attack.reset().setLoop(THREE.LoopOnce).play();
    } 
    if (team === 'monster' && mixerMonster) {
        const attack = mixerMonster.clipAction(mixerMonster._root.animations[1]);
        attack.reset().setLoop(THREE.LoopOnce).play();
    }

    // Check for Victory
    if (Math.abs(gamePos) >= cliffLimit) {
        victory(gamePos > 0 ? "MONSTER" : "PLAYER");
    }
}

function victory(winner) {
    new Audio('sounds/scream.mp3').play();
    document.getElementById('status-text').innerText = `${winner} WINS!`;
    
    // Simple reset after 5 seconds
    setTimeout(() => {
        gamePos = 0;
        document.getElementById('status-text').innerText = "BATTLE!";
    }, 5000);
}

// --- TWITCH INTEGRATION ---
ComfyJS.onChat = (user, message) => {
    const msg = message.toLowerCase();
    if (msg === "!player") push(-0.3, 'player');
    if (msg === "!monster") push(0.3, 'monster');
};

// Scale push power for bits
ComfyJS.onCheer = (user, message, bits) => {
    // 100 bits = 1.0 push power
    const power = bits / 100;
    // Determine team (this assumes users have "joined" a team previously)
    // For now, let's just push based on a keyword in the cheer message
    if (message.includes("monster")) push(power, 'monster');
    else push(-power, 'player');
};

ComfyJS.Init(TWITCH_CHANNEL);

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Update Animations
    if (mixerPlayer) mixerPlayer.update(delta);
    if (mixerMonster) mixerMonster.update(delta);

    // Update Model Positions
    if (playerModel) playerModel.position.x = gamePos - 1.5;
    if (monsterModel) {
        monsterModel.position.x = gamePos + 1.5;
        monsterModel.rotation.y = -Math.PI / 2; // Keep monster facing player
    }
    if (playerModel) playerModel.rotation.y = Math.PI / 2; // Keep player facing monster

    renderer.render(scene, camera);
}
animate();
