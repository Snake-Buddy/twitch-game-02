// --- CONFIG ---
const TWITCH_CHANNEL = "snake_buddy"; 
let gamePos = 0;
const cliffLimit = 10;
const teams = { players: new Set(), monsters: new Set() };

// Three.js Globals
let scene, camera, renderer, mixerPlayer, mixerMonster, playerModel, monsterModel;
const clock = new THREE.Clock();
const loader = new THREE.GLTFLoader();

// Audio
const sfxClash = new Audio('sounds/clash.mp3');
const sfxScream = new Audio('sounds/scream.mp3');

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 12);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    // The Road
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
        if(gltf.animations[0]) mixerPlayer.clipAction(gltf.animations[0]).play();
    });

    loader.load('models/monster.glb', (gltf) => {
        monsterModel = gltf.scene;
        monsterModel.scale.set(1.1, 1.1, 1.1);
        scene.add(monsterModel);
        mixerMonster = new THREE.AnimationMixer(monsterModel);
        if(gltf.animations[0]) mixerMonster.clipAction(gltf.animations[0]).play();
    });
}

function push(amount, teamName) {
    gamePos += amount;
    sfxClash.currentTime = 0;
    sfxClash.play();

    // Trigger Animations (Plays the 2nd clip, usually "Attack")
    if (teamName === 'player' && mixerPlayer) {
        const action = mixerPlayer.clipAction(playerModel.animations[1] || playerModel.animations[0]);
        action.reset().setLoop(THREE.LoopOnce).play();
    } 
    if (teamName === 'monster' && mixerMonster) {
        const action = mixerMonster.clipAction(monsterModel.animations[1] || monsterModel.animations[0]);
        action.reset().setLoop(THREE.LoopOnce).play();
    }

    if (Math.abs(gamePos) >= cliffLimit) victory(gamePos > 0 ? "MONSTER" : "PLAYER");
}

function victory(winner) {
    sfxScream.play();
    document.getElementById('status-text').innerText = `${winner} WINS!`;
    setTimeout(() => {
        gamePos = 0;
        document.getElementById('status-text').innerText = "BATTLE!";
    }, 5000);
}

function updateUI() {
    document.getElementById('p-count').innerText = teams.players.size;
    document.getElementById('m-count').innerText = teams.monsters.size;

    // Calculate percentage: 
    // -10 becomes 0%, 0 becomes 50%, 10 becomes 100%
    const percentage = ((gamePos + cliffLimit) / (cliffLimit * 2)) * 100;
    
    // Clamp the value so the UI doesn't break if someone is pushed way off
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    document.getElementById('meter-bar').style.left = `${clampedPercentage}%`;
}

// --- TWITCH LOGIC ---
ComfyJS.onChat = (user, message, flags) => {
    const msg = message.toLowerCase();
    
    if (msg === "!help") {
        ComfyJS.Say(`Join a team with !join player or !join monster. Chat to push!`);
    }

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

    if (teams.players.has(user)) push(-0.1, 'player');
    if (teams.monsters.has(user)) push(0.1, 'monster');
};

// Mod Reset Command
ComfyJS.onCommand = (user, command, message, flags) => {
    if (flags.broadcaster || flags.mod) {
        if (command === "resetgame") {
            gamePos = 0;
            document.getElementById('status-text').innerText = "GAME RESET";
        }
    }
};

ComfyJS.Init(TWITCH_CHANNEL);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixerPlayer) mixerPlayer.update(delta);
    if (mixerMonster) mixerMonster.update(delta);

    if (playerModel) {
        playerModel.position.x = gamePos - 1.5;
        playerModel.rotation.y = Math.PI / 2;
        if (gamePos <= -cliffLimit) { playerModel.position.y -= 0.1; playerModel.rotation.z += 0.1; }
        else { playerModel.position.y = 0; playerModel.rotation.z = 0; }
    }
    if (monsterModel) {
        monsterModel.position.x = gamePos + 1.5;
        monsterModel.rotation.y = -Math.PI / 2;
        if (gamePos >= cliffLimit) { monsterModel.position.y -= 0.1; monsterModel.rotation.z -= 0.1; }
        else { monsterModel.position.y = 0; monsterModel.rotation.z = 0; }
    }
    renderer.render(scene, camera);
}
