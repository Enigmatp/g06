import * as THREE from 'three';

// --- CONFIG ---
const CONFIG = {
    PLAYER_SPEED: 8,
    ENEMY_SPEED: 4,
    SPAWN_RATE: 200,
    SPAWN_LIMIT: 120,
    BULLET_SPEED: 30,
    FIRE_RATE: 300,
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    antialias: true,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(0, 20, 20);
camera.lookAt(0, 0, 0);

// --- LIGHTING ---
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1.5);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0x00f2ff, 3);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff007a, 5, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// --- GROUND ---
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5,
    metalness: 0.5
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(500, 100, 0x00f2ff, 0x111111);
grid.material.opacity = 0.3;
grid.material.transparent = true;
scene.add(grid);

// --- PLAYER ---
const playerGeometry = new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32);
const playerMaterial = new THREE.MeshStandardMaterial({
    color: 0x00f2ff,
    emissive: 0x00f2ff,
    emissiveIntensity: 1,
    metalness: 0.8,
    roughness: 0.2
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1.5;
scene.add(player);

// --- ENEMY ASSETS POOL ---
const ENEMY_TYPES = [
    {
        geometry: new THREE.TorusKnotGeometry(0.5, 0.15, 64, 16),
        color: 0xff007a,
        emissive: 0xff007a,
    },
    {
        geometry: new THREE.DodecahedronGeometry(0.7, 32),
        color: 0x7000ff,
        emissive: 0x7000ff,
    },
    {
        geometry: new THREE.IcosahedronGeometry(0.7, 16),
        color: 0x00ff7a,
        emissive: 0x00ff7a,
    },
    {
        geometry: new THREE.OctahedronGeometry(0.8, 32),
        color: 0xffd700,
        emissive: 0xffd700,
    }
];

// --- GAME STATE ---
let score = 0;
let hp = 100;
const enemies = [];
const bullets = [];
const keys = {};

// --- JOYSTICK STATE ---
const joystickState = {
    active: false,
    origin: new THREE.Vector2(),
    current: new THREE.Vector2(),
    moveDir: new THREE.Vector3(0, 0, 0)
};

// --- HUD ELEMENTS ---
const scoreEl = document.querySelector('#score');
const fpsEl = document.querySelector('#fps');
const hpBarEl = document.querySelector('#hp-bar');
const joystickContainer = document.querySelector('#joystick-container');
const joystickKnob = document.querySelector('#joystick-knob');

// --- INPUTS ---
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- JOYSTICK EVENTS ---
joystickContainer.addEventListener('touchstart', (e) => {
    joystickState.active = true;
    const touch = e.touches[0];
    const rect = joystickContainer.getBoundingClientRect();
    joystickState.origin.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
    handleJoystickTouch(touch);
});

window.addEventListener('touchmove', (e) => {
    if (!joystickState.active) return;
    handleJoystickTouch(e.touches[0]);
}, { passive: false });

window.addEventListener('touchend', () => {
    joystickState.active = false;
    joystickKnob.style.transform = `translate(-50%, -50%)`;
    joystickState.moveDir.set(0, 0, 0);
});

function handleJoystickTouch(touch) {
    const touchPos = new THREE.Vector2(touch.clientX, touch.clientY);
    const offset = touchPos.clone().sub(joystickState.origin);
    const maxRadius = 60; // Max distance for knob

    if (offset.length() > maxRadius) {
        offset.setLength(maxRadius);
    }

    joystickKnob.style.transform = `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`;

    // Convert to move direction (X is X, Y in screen is Z in world)
    joystickState.moveDir.set(offset.x / maxRadius, 0, offset.y / maxRadius);
}

// --- UTILS ---
function spawnEnemy() {
    if (enemies.length >= CONFIG.SPAWN_LIMIT) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 10;
    const x = player.position.x + Math.cos(angle) * distance;
    const z = player.position.z + Math.sin(angle) * distance;

    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const material = new THREE.MeshStandardMaterial({
        color: type.color,
        emissive: type.emissive,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1
    });

    const enemy = new THREE.Mesh(type.geometry, material);
    enemy.position.set(x, 0.7, z);

    scene.add(enemy);
    enemies.push(enemy);
}

function shoot() {
    let nearest = null;
    let minDist = Infinity;

    enemies.forEach(e => {
        const d = player.position.distanceTo(e.position);
        if (d < minDist) {
            minDist = d;
            nearest = e;
        }
    });

    const bulletGeo = new THREE.IcosahedronGeometry(0.3, 2);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(player.position);

    let direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);

    if (nearest) {
        direction = nearest.position.clone().sub(player.position).normalize();
    }

    bullet.userData.velocity = direction.multiplyScalar(CONFIG.BULLET_SPEED);
    bullet.userData.life = 3;

    scene.add(bullet);
    bullets.push(bullet);
}

// --- PERFORMANCE MONITORING ---
let lastTime = 0;

// --- TIMERS ---
let lastSpawnTime = 0;
let lastFireTime = 0;

// --- LOOP ---
function animate(time) {
    const dt = (time - lastTime) / 1000 || 1 / 60;
    lastTime = time;

    // FPS Counter logic
    if (time % 500 < 20) {
        fpsEl.textContent = Math.round(1 / dt);
    }

    requestAnimationFrame(animate);

    // Movement
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keys['KeyW']) moveDir.z -= 1;
    if (keys['KeyS']) moveDir.z += 1;
    if (keys['KeyA']) moveDir.x -= 1;
    if (keys['KeyD']) moveDir.x += 1;

    // Merge joystick movement
    if (joystickState.active) {
        moveDir.copy(joystickState.moveDir);
    }

    if (moveDir.length() > 1) moveDir.normalize();

    if (moveDir.lengthSq() > 0) {
        player.position.add(moveDir.clone().multiplyScalar(CONFIG.PLAYER_SPEED * dt));
        player.rotation.y += 0.05;
        player.rotation.z += 0.02;
    }

    // Camera follow
    camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 20, player.position.z + 20), 0.05);
    camera.lookAt(player.position);

    // Update Light Position
    pointLight.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 5, player.position.z), 0.1);

    // Spawning
    if (time - lastSpawnTime > CONFIG.SPAWN_RATE) {
        spawnEnemy();
        lastSpawnTime = time;
    }

    // Shooting
    if (time - lastFireTime > CONFIG.FIRE_RATE) {
        shoot();
        lastFireTime = time;
    }

    // Update Projectiles
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.position.add(b.userData.velocity.clone().multiplyScalar(dt));
        b.userData.life -= dt;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (b.position.distanceTo(e.position) < 1.5) {
                scene.remove(e);
                enemies.splice(j, 1);
                score++;
                scoreEl.textContent = score;
                b.userData.life = 0;
                break;
            }
        }

        if (b.userData.life <= 0) {
            scene.remove(b);
            bullets.splice(i, 1);
        }
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dir = player.position.clone().sub(e.position).normalize();
        e.position.add(dir.multiplyScalar(CONFIG.ENEMY_SPEED * dt));

        const s = 1 + Math.sin(time * 0.01) * 0.1;
        e.scale.set(s, s, s);
        e.rotation.y += 0.01;
        e.rotation.x += 0.01;

        if (e.position.distanceTo(player.position) < 1.5) {
            hp -= 0.1;
            hpBarEl.style.width = `${Math.max(0, hp)}%`;
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(0);
