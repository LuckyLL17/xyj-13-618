// 模拟人生 - 3D养成游戏
// 主游戏逻辑

class SimGame {
    constructor() {
        // 游戏状态
        this.playerName = '';
        this.gameStarted = false;
        
        // 3D场景相关
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.character = null;
        this.floor = null;
        this.furniture = [];
        this.clickableObjects = [];
        
        // 角色属性 (0-100)
        this.stats = {
            energy: 100,
            hygiene: 100,
            fun: 80,
            social: 70,
            hunger: 90
        };
        
        // 属性衰减速率 (每秒下降的值)
        this.decayRates = {
            energy: 0.5,
            hygiene: 0.3,
            fun: 0.4,
            social: 0.25,
            hunger: 0.6
        };
        
        // 游戏时间
        this.gameTime = {
            hours: 8,
            minutes: 0,
            day: 1
        };
        
        // 游戏速度 (真实秒数 = 游戏分钟数)
        this.gameSpeed = 1;
        this.lastUpdateTime = 0;
        
        // 角色移动
        this.targetPosition = null;
        this.isMoving = false;
        this.moveSpeed = 0.1;
        
        // 碰撞检测
        this.colliders = [];
        this.characterRadius = 0.6;
        this.wallBounds = {
            minX: -9.5,
            maxX: 9.5,
            minZ: -9.5,
            maxZ: 9.5
        };
        
        // 角色状态
        this.currentAction = null;
        this.actionTimer = 0;
        this.isSitting = false;
        this.isSleeping = false;
        
        // 待执行的动作（用于打断确认）
        this.pendingAction = null;
        this.pendingFurniture = null;
        
        // 动作名称映射（用于显示）
        this.actionNames = {
            'eat': '吃饭',
            'sleep': '睡觉',
            'phone': '玩手机',
            'work': '工作',
            'shower': '洗澡',
            'chat': '聊天',
            'watch': '看电视',
            'sit': '休息'
        };
        
        // 交互相关
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 初始化
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkSession();
    }
    
    // ==================== 存储和会话管理 ====================
    
    checkSession() {
        const sessionData = sessionStorage.getItem('simGameSession');
        if (sessionData) {
            const data = JSON.parse(sessionData);
            this.playerName = data.playerName;
            this.showGameScreen();
        }
    }
    
    saveSession() {
        sessionStorage.setItem('simGameSession', JSON.stringify({
            playerName: this.playerName,
            startTime: Date.now()
        }));
    }
    
    saveGame() {
        const saveData = {
            playerName: this.playerName,
            stats: this.stats,
            gameTime: this.gameTime,
            characterPosition: this.character ? {
                x: this.character.position.x,
                y: this.character.position.y,
                z: this.character.position.z
            } : null,
            savedAt: Date.now()
        };
        localStorage.setItem('simGameSave', JSON.stringify(saveData));
        this.showMessage('游戏已保存！');
    }
    
    loadGame() {
        const saveData = localStorage.getItem('simGameSave');
        if (saveData) {
            const data = JSON.parse(saveData);
            
            this.playerName = data.playerName;
            this.stats = data.stats;
            this.gameTime = data.gameTime;
            
            if (data.savedAt) {
                const offlineSeconds = (Date.now() - data.savedAt) / 1000;
                this.applyOfflineDecay(offlineSeconds);
            }
            
            if (data.characterPosition && this.character) {
                this.character.position.set(
                    data.characterPosition.x,
                    data.characterPosition.y,
                    data.characterPosition.z
                );
            }
            
            this.saveSession();
            this.showGameScreen();
            this.showMessage('存档已加载！');
            return true;
        }
        return false;
    }
    
    applyOfflineDecay(seconds) {
        const decayMultiplier = 0.5;
        
        this.stats.energy = Math.max(0, this.stats.energy - this.decayRates.energy * seconds * decayMultiplier);
        this.stats.hygiene = Math.max(0, this.stats.hygiene - this.decayRates.hygiene * seconds * decayMultiplier);
        this.stats.fun = Math.max(0, this.stats.fun - this.decayRates.fun * seconds * decayMultiplier);
        this.stats.social = Math.max(0, this.stats.social - this.decayRates.social * seconds * decayMultiplier);
        this.stats.hunger = Math.max(0, this.stats.hunger - this.decayRates.hunger * seconds * decayMultiplier);
        
        const gameMinutes = seconds * this.gameSpeed;
        this.gameTime.minutes += gameMinutes;
        
        while (this.gameTime.minutes >= 60) {
            this.gameTime.minutes -= 60;
            this.gameTime.hours++;
            
            if (this.gameTime.hours >= 24) {
                this.gameTime.hours = 0;
                this.gameTime.day++;
            }
        }
    }
    
    // ==================== UI事件监听 ====================
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('playerName');
            const name = nameInput.value.trim();
            
            if (name) {
                this.playerName = name;
                this.saveSession();
                this.showGameScreen();
            } else {
                this.showMessage('请输入你的名字！');
            }
        });
        
        document.getElementById('loadBtn').addEventListener('click', () => {
            if (!this.loadGame()) {
                this.showMessage('没有找到存档！');
            }
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveGame();
        });
        
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.performAction(action);
            });
        });
        
        document.querySelectorAll('.food-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const food = e.currentTarget.dataset.food;
                this.eatFood(food);
                this.hideModal('cookingModal');
            });
        });
        
        document.getElementById('closeCooking').addEventListener('click', () => {
            this.hideModal('cookingModal');
        });
        
        document.getElementById('confirmYes').addEventListener('click', () => {
            this.confirmInterruptAction(true);
        });
        
        document.getElementById('confirmNo').addEventListener('click', () => {
            this.confirmInterruptAction(false);
        });
        
        window.addEventListener('resize', () => {
            if (this.camera && this.renderer) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }
    
    // ==================== 屏幕切换 ====================
    
    showGameScreen() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        
        document.getElementById('playerNameDisplay').textContent = this.playerName;
        
        this.initThreeJS();
        this.gameStarted = true;
        this.lastUpdateTime = Date.now();
        this.updateUI();
        this.animate();
    }
    
    // ==================== Three.js 3D场景 ====================
    
    initThreeJS() {
        const container = document.getElementById('gameCanvas');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        this.addLights();
        this.createRoom();
        this.createFurniture();
        this.createCharacter();
        this.initColliders();
        this.setupClickHandler();
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        
        const roomLight = new THREE.PointLight(0xffeedd, 0.5, 20);
        roomLight.position.set(0, 5, 0);
        this.scene.add(roomLight);
    }
    
    createRoom() {
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xDEB887,
            roughness: 0.8
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.floor.name = 'floor';
        this.scene.add(this.floor);
        this.clickableObjects.push(this.floor);
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF5DEB3,
            roughness: 0.9
        });
        
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 8),
            wallMaterial
        );
        backWall.position.set(0, 4, -10);
        this.scene.add(backWall);
        
        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 8),
            wallMaterial
        );
        leftWall.position.set(-10, 4, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);
        
        const rugGeometry = new THREE.PlaneGeometry(8, 6);
        const rugMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCD853F,
            roughness: 0.9
        });
        const rug = new THREE.Mesh(rugGeometry, rugMaterial);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(0, 0.01, 2);
        this.scene.add(rug);
    }
    
    createFurniture() {
        this.createKitchen();
        this.createSofa();
        this.createBed();
        this.createDesk();
        this.createBathroom();
        this.createTV();
    }
    
    createKitchen() {
        const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
        
        const counterGeometry = new THREE.BoxGeometry(4, 1, 1.5);
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(-8, 0.5, -8);
        counter.castShadow = true;
        counter.receiveShadow = true;
        counter.name = 'kitchen';
        counter.userData = { type: 'kitchen', action: 'cook' };
        this.scene.add(counter);
        this.furniture.push(counter);
        this.clickableObjects.push(counter);
        
        const topGeometry = new THREE.BoxGeometry(4.2, 0.1, 1.7);
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(-8, 1.05, -8);
        top.castShadow = true;
        this.scene.add(top);
        
        const fridgeGeometry = new THREE.BoxGeometry(1.5, 2.5, 1);
        const fridgeMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
        const fridge = new THREE.Mesh(fridgeGeometry, fridgeMaterial);
        fridge.position.set(-8, 1.25, -6);
        fridge.castShadow = true;
        fridge.receiveShadow = true;
        fridge.name = 'fridge';
        this.scene.add(fridge);
    }
    
    createSofa() {
        const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0xB22222 });
        
        const baseGeometry = new THREE.BoxGeometry(4, 0.8, 1.5);
        const base = new THREE.Mesh(baseGeometry, sofaMaterial);
        base.position.set(3, 0.4, 5);
        base.castShadow = true;
        base.receiveShadow = true;
        base.name = 'sofa';
        base.userData = { type: 'sofa', action: 'sit' };
        this.scene.add(base);
        this.furniture.push(base);
        this.clickableObjects.push(base);
        
        const backGeometry = new THREE.BoxGeometry(4, 1.2, 0.3);
        const back = new THREE.Mesh(backGeometry, sofaMaterial);
        back.position.set(3, 1.4, 5.6);
        back.castShadow = true;
        this.scene.add(back);
        
        for (let i = 0; i < 3; i++) {
            const cushionGeometry = new THREE.BoxGeometry(1.2, 0.3, 1.2);
            const cushion = new THREE.Mesh(cushionGeometry, cushionMaterial);
            cushion.position.set(1.5 + i * 1.25, 0.95, 5);
            cushion.castShadow = true;
            this.scene.add(cushion);
        }
    }
    
    createBed() {
        const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFACD });
        
        const frameGeometry = new THREE.BoxGeometry(3.5, 0.5, 5);
        const frame = new THREE.Mesh(frameGeometry, bedMaterial);
        frame.position.set(7, 0.25, -5);
        frame.castShadow = true;
        frame.receiveShadow = true;
        frame.name = 'bed';
        frame.userData = { type: 'bed', action: 'sleep' };
        this.scene.add(frame);
        this.furniture.push(frame);
        this.clickableObjects.push(frame);
        
        const mattressGeometry = new THREE.BoxGeometry(3.2, 0.4, 4.7);
        const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
        mattress.position.set(7, 0.7, -5);
        mattress.castShadow = true;
        this.scene.add(mattress);
        
        const pillowGeometry = new THREE.BoxGeometry(2.5, 0.2, 1);
        const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
        pillow.position.set(7, 1, -6.8);
        pillow.castShadow = true;
        this.scene.add(pillow);
    }
    
    createDesk() {
        const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        const topGeometry = new THREE.BoxGeometry(2.5, 0.1, 1.2);
        const top = new THREE.Mesh(topGeometry, deskMaterial);
        top.position.set(-7, 1.5, 5);
        top.castShadow = true;
        top.receiveShadow = true;
        top.name = 'desk';
        top.userData = { type: 'desk', action: 'work' };
        this.scene.add(top);
        this.furniture.push(top);
        this.clickableObjects.push(top);
        
        const legGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
        const positions = [
            [-8.1, 0.75, 5.5],
            [-5.9, 0.75, 5.5],
            [-8.1, 0.75, 4.5],
            [-5.9, 0.75, 4.5]
        ];
        
        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, deskMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            this.scene.add(leg);
        });
        
        const computerGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
        const computerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const computer = new THREE.Mesh(computerGeometry, computerMaterial);
        computer.position.set(-7, 2, 4.5);
        this.scene.add(computer);
    }
    
    createBathroom() {
        const showerMaterial = new THREE.MeshStandardMaterial({ color: 0xE0E0E0 });
        const tubMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        
        const tubGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
        const tub = new THREE.Mesh(tubGeometry, tubMaterial);
        tub.position.set(-7, 0.4, -4);
        tub.castShadow = true;
        tub.receiveShadow = true;
        tub.name = 'shower';
        tub.userData = { type: 'shower', action: 'shower' };
        this.scene.add(tub);
        this.furniture.push(tub);
        this.clickableObjects.push(tub);
        
        const showerHeadGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 16);
        const showerHead = new THREE.Mesh(showerHeadGeometry, showerMaterial);
        showerHead.position.set(-7, 2.5, -4);
        this.scene.add(showerHead);
    }
    
    createTV() {
        const tvMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x3333FF, emissive: 0x2222AA });
        
        const frameGeometry = new THREE.BoxGeometry(3, 2, 0.2);
        const frame = new THREE.Mesh(frameGeometry, tvMaterial);
        frame.position.set(0, 1.8, -9);
        frame.castShadow = true;
        frame.name = 'tv';
        frame.userData = { type: 'tv', action: 'watch' };
        this.scene.add(frame);
        this.furniture.push(frame);
        this.clickableObjects.push(frame);
        
        const screenGeometry = new THREE.BoxGeometry(2.8, 1.8, 0.05);
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 1.8, -8.9);
        this.scene.add(screen);
    }
    
    createCharacter() {
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
        const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
        
        const characterGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1, 16);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        characterGroup.add(body);
        
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 1.7;
        head.castShadow = true;
        characterGroup.add(head);
        
        const hairGeometry = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 1.7;
        hair.castShadow = true;
        characterGroup.add(hair);
        
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0.3, 0);
        leftLeg.castShadow = true;
        characterGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0.3, 0);
        rightLeg.castShadow = true;
        characterGroup.add(rightLeg);
        
        characterGroup.position.set(0, 0, 0);
        characterGroup.name = 'character';
        
        this.character = characterGroup;
        this.scene.add(this.character);
    }
    
    // ==================== 碰撞检测系统 ====================
    
    initColliders() {
        this.colliders = [];
        
        this.colliders.push({
            name: 'kitchen',
            minX: -8 - 2,
            maxX: -8 + 2,
            minZ: -8 - 0.75,
            maxZ: -8 + 0.75
        });
        
        this.colliders.push({
            name: 'fridge',
            minX: -8 - 0.75,
            maxX: -8 + 0.75,
            minZ: -6 - 0.5,
            maxZ: -6 + 0.5
        });
        
        this.colliders.push({
            name: 'sofa',
            minX: 3 - 2,
            maxX: 3 + 2,
            minZ: 5 - 0.75,
            maxZ: 5 + 0.75
        });
        
        this.colliders.push({
            name: 'bed',
            minX: 7 - 1.75,
            maxX: 7 + 1.75,
            minZ: -5 - 2.5,
            maxZ: -5 + 2.5
        });
        
        this.colliders.push({
            name: 'desk',
            minX: -7 - 1.25,
            maxX: -7 + 1.25,
            minZ: 5 - 0.6,
            maxZ: 5 + 0.6
        });
        
        this.colliders.push({
            name: 'tub',
            minX: -7 - 1,
            maxX: -7 + 1,
            minZ: -4 - 0.6,
            maxZ: -4 + 0.6
        });
        
        this.colliders.push({
            name: 'tv',
            minX: 0 - 1.5,
            maxX: 0 + 1.5,
            minZ: -9 - 0.1,
            maxZ: -9 + 0.1
        });
    }
    
    checkCollision(position) {
        if (position.x - this.characterRadius < this.wallBounds.minX ||
            position.x + this.characterRadius > this.wallBounds.maxX ||
            position.z - this.characterRadius < this.wallBounds.minZ ||
            position.z + this.characterRadius > this.wallBounds.maxZ) {
            return true;
        }
        
        for (const collider of this.colliders) {
            if (this.checkCircleAABBCollision(position, collider)) {
                return true;
            }
        }
        
        return false;
    }
    
    checkCircleAABBCollision(circlePos, aabb) {
        const closestX = Math.max(aabb.minX, Math.min(circlePos.x, aabb.maxX));
        const closestZ = Math.max(aabb.minZ, Math.min(circlePos.z, aabb.maxZ));
        
        const distanceX = circlePos.x - closestX;
        const distanceZ = circlePos.z - closestZ;
        
        return (distanceX * distanceX + distanceZ * distanceZ) < (this.characterRadius * this.characterRadius);
    }
    
    getValidPosition(startPos, targetPos) {
        const testPos = new THREE.Vector3(targetPos.x, 0, targetPos.z);
        
        if (!this.checkCollision(testPos)) {
            return testPos;
        }
        
        const direction = new THREE.Vector3();
        direction.subVectors(targetPos, startPos);
        direction.y = 0;
        direction.normalize();
        
        const maxDistance = startPos.distanceTo(targetPos);
        let bestDistance = 0;
        
        for (let d = 0; d <= maxDistance; d += 0.1) {
            const testX = startPos.x + direction.x * d;
            const testZ = startPos.z + direction.z * d;
            const testPosition = new THREE.Vector3(testX, 0, testZ);
            
            if (!this.checkCollision(testPosition)) {
                bestDistance = d;
            } else {
                break;
            }
        }
        
        if (bestDistance > 0.1) {
            return new THREE.Vector3(
                startPos.x + direction.x * bestDistance,
                0,
                startPos.z + direction.z * bestDistance
            );
        }
        
        return null;
    }
    
    tryMove(newPos) {
        if (!this.checkCollision(newPos)) {
            return newPos;
        }
        
        const currentPos = this.character.position.clone();
        const direction = new THREE.Vector3();
        direction.subVectors(newPos, currentPos);
        direction.y = 0;
        direction.normalize();
        
        const slideX = new THREE.Vector3(direction.x, 0, 0);
        const slideZ = new THREE.Vector3(0, 0, direction.z);
        
        const testPosX = new THREE.Vector3(
            currentPos.x + direction.x * this.moveSpeed * 2,
            0,
            currentPos.z
        );
        
        const testPosZ = new THREE.Vector3(
            currentPos.x,
            0,
            currentPos.z + direction.z * this.moveSpeed * 2
        );
        
        if (!this.checkCollision(testPosX)) {
            return testPosX;
        }
        if (!this.checkCollision(testPosZ)) {
            return testPosZ;
        }
        
        return null;
    }
    
    // ==================== 点击交互 ====================
    
    setupClickHandler() {
        this.renderer.domElement.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });
    }
    
    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.clickableObjects);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const point = intersects[0].point;
            
            if (clickedObject.userData && clickedObject.userData.type) {
                this.handleFurnitureClick(clickedObject);
            } else if (clickedObject.name === 'floor') {
                this.moveTo(point.x, point.z);
            }
        }
    }
    
    handleFurnitureClick(furniture) {
        const type = furniture.userData.type;
        
        if (this.currentAction || this.isSitting || this.isSleeping) {
            let currentActionName = '当前动作';
            if (this.currentAction) {
                currentActionName = this.actionNames[this.currentAction] || this.currentAction;
            } else if (this.isSleeping) {
                currentActionName = '睡觉';
            } else if (this.isSitting) {
                currentActionName = '休息';
            }
            
            let newActionName = '';
            switch (type) {
                case 'kitchen': newActionName = '做饭'; break;
                case 'sofa': newActionName = '休息'; break;
                case 'bed': newActionName = '睡觉'; break;
                case 'desk': newActionName = '工作'; break;
                case 'shower': newActionName = '洗澡'; break;
                case 'tv': newActionName = '看电视'; break;
            }
            
            this.pendingFurniture = furniture;
            this.showConfirmModal(
                '⚠️ 正在进行动作',
                `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？`
            );
            return;
        }
        
        this.executeFurnitureInteraction(furniture);
    }
    
    executeFurnitureInteraction(furniture) {
        const type = furniture.userData.type;
        
        switch (type) {
            case 'kitchen':
                this.moveToFurniture(furniture, () => {
                    this.showModal('cookingModal');
                });
                break;
            case 'sofa':
                this.moveToFurniture(furniture, () => {
                    this.executeAction('sit');
                });
                break;
            case 'bed':
                this.moveToFurniture(furniture, () => {
                    this.executeAction('sleep');
                });
                break;
            case 'desk':
                this.moveToFurniture(furniture, () => {
                    this.executeAction('work');
                });
                break;
            case 'shower':
                this.moveToFurniture(furniture, () => {
                    this.executeAction('shower');
                });
                break;
            case 'tv':
                this.moveTo(3, 2);
                this.executeAction('watch');
                break;
        }
    }
    
    moveToFurniture(furniture, callback) {
        const pos = furniture.position;
        let targetX = pos.x;
        let targetZ = pos.z;
        let isInteractionPosition = false;
        
        if (furniture.userData.type === 'sofa') {
            targetX = pos.x;
            targetZ = pos.z + 0.2;
            isInteractionPosition = true;
        } else if (furniture.userData.type === 'bed') {
            targetX = pos.x;
            targetZ = pos.z - 0.5;
            isInteractionPosition = true;
        } else if (furniture.userData.type === 'kitchen') {
            targetZ = pos.z + 1.5;
        } else if (furniture.userData.type === 'desk') {
            targetZ = pos.z + 1.5;
        } else if (furniture.userData.type === 'shower') {
            targetZ = pos.z + 1.5;
        }
        
        if (isInteractionPosition) {
            this.moveToInteraction(targetX, targetZ, furniture.userData.type, callback);
        } else {
            const targetPos = new THREE.Vector3(targetX, 0, targetZ);
            const currentPos = this.character ? this.character.position.clone() : new THREE.Vector3(0, 0, 0);
            const validPos = this.getValidPosition(currentPos, targetPos);
            
            if (validPos) {
                this.targetPosition = validPos;
                this.isMoving = true;
                this.isSitting = false;
                this.isSleeping = false;
                this.currentAction = null;
                this.afterMoveCallback = callback;
            } else {
                this.showMessage('无法到达该位置！');
            }
        }
    }
    
    moveToInteraction(targetX, targetZ, furnitureType, callback) {
        const targetPos = new THREE.Vector3(targetX, 0, targetZ);
        const currentPos = this.character ? this.character.position.clone() : new THREE.Vector3(0, 0, 0);
        
        const approachX = currentPos.x;
        const approachZ = targetZ;
        let approachTarget;
        
        if (furnitureType === 'sofa') {
            approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1.5);
        } else if (furnitureType === 'bed') {
            approachTarget = new THREE.Vector3(targetX + 2, 0, targetZ);
        } else {
            approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1);
        }
        
        const validPos = this.getValidPosition(currentPos, approachTarget);
        
        if (validPos) {
            this.targetPosition = validPos;
            this.isMoving = true;
            this.isSitting = false;
            this.isSleeping = false;
            this.currentAction = null;
            this.afterMoveCallback = () => {
                this.character.position.set(targetX, 0, targetZ);
                this.targetPosition = null;
                this.isMoving = false;
                if (callback) callback();
            };
        } else {
            this.character.position.set(targetX, 0, targetZ);
            if (callback) callback();
        }
    }
    
    moveTo(x, z) {
        x = Math.max(-9, Math.min(9, x));
        z = Math.max(-9, Math.min(9, z));
        
        const targetPos = new THREE.Vector3(x, 0, z);
        const currentPos = this.character ? this.character.position.clone() : new THREE.Vector3(0, 0, 0);
        
        const validPos = this.getValidPosition(currentPos, targetPos);
        
        if (validPos) {
            this.standUp();
            this.targetPosition = validPos;
            this.isMoving = true;
            this.currentAction = null;
        }
    }
    
    // ==================== 动作系统 ====================
    
    performAction(action) {
        if (this.currentAction) {
            const currentActionName = this.actionNames[this.currentAction] || this.currentAction;
            const newActionName = this.actionNames[action] || action;
            
            this.pendingAction = action;
            
            const title = '⚠️ 正在进行动作';
            const message = `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？\n\n打断后角色将从当前状态恢复。`;
            
            this.showConfirmModal(title, message);
            return;
        }
        
        this.executeAction(action);
    }
    
    executeAction(action) {
        this.currentAction = action;
        this.actionTimer = 0;
        
        switch (action) {
            case 'eat':
                this.showModal('cookingModal');
                break;
            case 'sleep':
                this.startSleep();
                break;
            case 'phone':
                this.startPhone();
                break;
            case 'work':
                this.startWork();
                break;
            case 'shower':
                this.startShower();
                break;
            case 'chat':
                this.startChat();
                break;
            case 'sit':
                this.sitOnSofa();
                break;
            case 'watch':
                this.startWatch();
                break;
        }
    }
    
    startWatch() {
        this.showMessage('开始看电视...');
    }
    
    showConfirmModal(title, message) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.showModal('confirmModal');
    }
    
    confirmInterruptAction(confirmed) {
        this.hideModal('confirmModal');
        
        if (confirmed) {
            this.interruptCurrentAction();
            
            if (this.pendingAction) {
                const action = this.pendingAction;
                this.pendingAction = null;
                this.executeAction(action);
            } else if (this.pendingFurniture) {
                const furniture = this.pendingFurniture;
                this.pendingFurniture = null;
                this.executeFurnitureInteraction(furniture);
            }
        } else {
            this.pendingAction = null;
            this.pendingFurniture = null;
        }
    }
    
    interruptCurrentAction() {
        if (!this.currentAction && !this.isSitting && !this.isSleeping) return;
        
        this.standUp();
        
        if (this.character && this.checkCollision(this.character.position)) {
            this.escapeFromCollider();
        }
        
        this.currentAction = null;
        this.actionTimer = 0;
        
        this.showMessage('已打断当前动作');
    }
    
    escapeFromCollider() {
        if (!this.character) return;
        
        const currentPos = this.character.position.clone();
        const step = 0.2;
        const maxSteps = 50;
        
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(1, 0, 1),
            new THREE.Vector3(1, 0, -1),
            new THREE.Vector3(-1, 0, 1),
            new THREE.Vector3(-1, 0, -1)
        ];
        
        for (let i = 1; i <= maxSteps; i++) {
            for (const dir of directions) {
                const testPos = new THREE.Vector3(
                    currentPos.x + dir.x * step * i,
                    0,
                    currentPos.z + dir.z * step * i
                );
                
                if (testPos.x >= -9 && testPos.x <= 9 && 
                    testPos.z >= -9 && testPos.z <= 9) {
                    if (!this.checkCollision(testPos)) {
                        this.character.position.set(testPos.x, 0, testPos.z);
                        return;
                    }
                }
            }
        }
    }
    
    eatFood(foodType) {
        let effects = { hunger: 0, fun: 0 };
        let message = '';
        
        switch (foodType) {
            case 'snack':
                effects.hunger = 15;
                message = '吃了零食，恢复了一点饥饿值';
                break;
            case 'meal':
                effects.hunger = 40;
                message = '吃了正餐，恢复了较多饥饿值';
                break;
            case 'gourmet':
                effects.hunger = 60;
                effects.fun = 20;
                message = '享用了美食，恢复了大量饥饿值和娱乐值';
                break;
        }
        
        this.stats.hunger = Math.min(100, this.stats.hunger + effects.hunger);
        if (effects.fun > 0) {
            this.stats.fun = Math.min(100, this.stats.fun + effects.fun);
        }
        
        this.stats.energy = Math.max(0, this.stats.energy - 5);
        
        this.showMessage(message);
        this.updateUI();
        this.currentAction = null;
    }
    
    startSleep() {
        this.lieOnBed();
        this.actionTimer = 5;
    }
    
    updateSleep(deltaTime) {
        this.actionTimer -= deltaTime;
        
        this.stats.energy = Math.min(100, this.stats.energy + 2 * deltaTime);
        this.stats.hunger = Math.max(0, this.stats.hunger - 0.3 * deltaTime);
        
        if (this.actionTimer <= 0) {
            this.standUp();
            this.currentAction = null;
            this.showMessage('睡醒了，精力充沛！');
        }
    }
    
    startPhone() {
        this.showMessage('开始玩手机...');
        this.actionTimer = 4;
    }
    
    updatePhone(deltaTime) {
        this.actionTimer -= deltaTime;
        
        this.stats.fun = Math.min(100, this.stats.fun + 1.5 * deltaTime);
        this.stats.social = Math.min(100, this.stats.social + 0.5 * deltaTime);
        this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);
        
        if (this.actionTimer <= 0) {
            this.currentAction = null;
            this.showMessage('玩手机结束，心情不错！');
        }
    }
    
    startWork() {
        this.showMessage('开始工作...');
        this.actionTimer = 6;
    }
    
    updateWork(deltaTime) {
        this.actionTimer -= deltaTime;
        
        this.stats.energy = Math.max(0, this.stats.energy - 1 * deltaTime);
        this.stats.hunger = Math.max(0, this.stats.hunger - 0.5 * deltaTime);
        this.stats.fun = Math.max(0, this.stats.fun - 0.3 * deltaTime);
        
        if (this.actionTimer <= 0) {
            this.currentAction = null;
            this.showMessage('工作完成！虽然有点累但很有成就感。');
        }
    }
    
    startShower() {
        this.showMessage('开始洗澡...');
        this.actionTimer = 3;
    }
    
    updateShower(deltaTime) {
        this.actionTimer -= deltaTime;
        
        this.stats.hygiene = Math.min(100, this.stats.hygiene + 3 * deltaTime);
        this.stats.energy = Math.max(0, this.stats.energy - 0.2 * deltaTime);
        
        if (this.actionTimer <= 0) {
            this.currentAction = null;
            this.showMessage('洗完澡，干干净净！');
        }
    }
    
    startChat() {
        this.showMessage('开始聊天...');
        this.actionTimer = 4;
    }
    
    updateChat(deltaTime) {
        this.actionTimer -= deltaTime;
        
        this.stats.social = Math.min(100, this.stats.social + 2 * deltaTime);
        this.stats.fun = Math.min(100, this.stats.fun + 1 * deltaTime);
        this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);
        
        if (this.actionTimer <= 0) {
            this.currentAction = null;
            this.showMessage('聊天结束，很开心！');
        }
    }
    
    sitOnSofa() {
        this.isSitting = true;
        this.showMessage('坐在沙发上休息...');
        
        if (this.character) {
            this.character.scale.y = 0.6;
            this.character.position.y = 0.9;
            this.character.rotation.y = Math.PI;
        }
    }
    
    lieOnBed() {
        this.isSleeping = true;
        this.showMessage('躺在床上睡觉...');
        
        if (this.character) {
            this.character.rotation.x = -Math.PI / 2;
            this.character.position.y = 1.0;
            this.character.scale.x = 1;
            this.character.scale.y = 1;
            this.character.scale.z = 0.6;
        }
    }
    
    standUp() {
        if (!this.character) return;
        
        this.character.rotation.x = 0;
        this.character.rotation.y = 0;
        this.character.scale.x = 1;
        this.character.scale.y = 1;
        this.character.scale.z = 1;
        this.character.position.y = 0;
        
        this.isSitting = false;
        this.isSleeping = false;
    }
    
    // ==================== 游戏循环 ====================
    
    animate() {
        if (!this.gameStarted) return;
        
        requestAnimationFrame(() => this.animate());
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = currentTime;
        
        this.updateGame(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
    
    updateGame(deltaTime) {
        if (this.isMoving && this.targetPosition) {
            this.updateMovement(deltaTime);
        }
        
        if (this.currentAction) {
            this.updateCurrentAction(deltaTime);
        }
        
        this.updateGameTime(deltaTime);
        
        if (!this.currentAction) {
            this.updateStatsDecay(deltaTime);
        }
        
        this.updateUI();
        this.updateMood();
    }
    
    updateMovement(deltaTime) {
        const direction = new THREE.Vector3();
        direction.subVectors(this.targetPosition, this.character.position);
        direction.y = 0;
        
        const distance = direction.length();
        
        if (distance < 0.1) {
            this.isMoving = false;
            this.targetPosition = null;
            
            if (this.afterMoveCallback) {
                this.afterMoveCallback();
                this.afterMoveCallback = null;
            }
            return;
        }
        
        direction.normalize();
        const moveAmount = this.moveSpeed * deltaTime * 60;
        
        const newPos = new THREE.Vector3(
            this.character.position.x + direction.x * moveAmount,
            0,
            this.character.position.z + direction.z * moveAmount
        );
        
        if (!this.checkCollision(newPos)) {
            this.character.position.x = newPos.x;
            this.character.position.z = newPos.z;
        } else {
            const slidePos = this.tryMove(newPos);
            if (slidePos) {
                this.character.position.x = slidePos.x;
                this.character.position.z = slidePos.z;
            } else {
                this.isMoving = false;
                this.targetPosition = null;
                return;
            }
        }
        
        const angle = Math.atan2(direction.x, direction.z);
        this.character.rotation.y = angle;
        
        const walkCycle = Math.sin(Date.now() * 0.01) * 0.1;
        this.character.position.y = Math.abs(walkCycle) * 0.2;
    }
    
    updateCurrentAction(deltaTime) {
        switch (this.currentAction) {
            case 'sleep':
                this.updateSleep(deltaTime);
                break;
            case 'phone':
                this.updatePhone(deltaTime);
                break;
            case 'work':
                this.updateWork(deltaTime);
                break;
            case 'shower':
                this.updateShower(deltaTime);
                break;
            case 'chat':
                this.updateChat(deltaTime);
                break;
        }
    }
    
    updateGameTime(deltaTime) {
        this.gameTime.minutes += deltaTime * this.gameSpeed;
        
        while (this.gameTime.minutes >= 60) {
            this.gameTime.minutes -= 60;
            this.gameTime.hours++;
            
            if (this.gameTime.hours >= 24) {
                this.gameTime.hours = 0;
                this.gameTime.day++;
            }
        }
    }
    
    updateStatsDecay(deltaTime) {
        this.stats.energy = Math.max(0, this.stats.energy - this.decayRates.energy * deltaTime);
        this.stats.hygiene = Math.max(0, this.stats.hygiene - this.decayRates.hygiene * deltaTime);
        this.stats.fun = Math.max(0, this.stats.fun - this.decayRates.fun * deltaTime);
        this.stats.social = Math.max(0, this.stats.social - this.decayRates.social * deltaTime);
        this.stats.hunger = Math.max(0, this.stats.hunger - this.decayRates.hunger * deltaTime);
    }
    
    // ==================== UI更新 ====================
    
    updateUI() {
        document.getElementById('energyValue').textContent = Math.round(this.stats.energy);
        document.getElementById('hygieneValue').textContent = Math.round(this.stats.hygiene);
        document.getElementById('funValue').textContent = Math.round(this.stats.fun);
        document.getElementById('socialValue').textContent = Math.round(this.stats.social);
        document.getElementById('hungerValue').textContent = Math.round(this.stats.hunger);
        
        document.getElementById('energyBar').style.width = this.stats.energy + '%';
        document.getElementById('hygieneBar').style.width = this.stats.hygiene + '%';
        document.getElementById('funBar').style.width = this.stats.fun + '%';
        document.getElementById('socialBar').style.width = this.stats.social + '%';
        document.getElementById('hungerBar').style.width = this.stats.hunger + '%';
        
        const hours = String(Math.floor(this.gameTime.hours)).padStart(2, '0');
        const minutes = String(Math.floor(this.gameTime.minutes)).padStart(2, '0');
        document.getElementById('gameTime').textContent = `${hours}:${minutes}`;
        document.getElementById('gameDay').textContent = `第 ${this.gameTime.day} 天`;
    }
    
    updateMood() {
        const avgStats = (
            this.stats.energy +
            this.stats.hygiene +
            this.stats.fun +
            this.stats.social +
            this.stats.hunger
        ) / 5;
        
        let moodText = '';
        let moodColor = '';
        
        if (avgStats >= 80) {
            moodText = '心情：非常开心 😃';
            moodColor = '#4CAF50';
        } else if (avgStats >= 60) {
            moodText = '心情：不错 🙂';
            moodColor = '#8BC34A';
        } else if (avgStats >= 40) {
            moodText = '心情：一般 😐';
            moodColor = '#FFC107';
        } else if (avgStats >= 20) {
            moodText = '心情：不太好 😕';
            moodColor = '#FF9800';
        } else {
            moodText = '心情：很糟糕 😢';
            moodColor = '#F44336';
        }
        
        const moodElement = document.getElementById('moodText');
        moodElement.textContent = moodText;
        moodElement.style.color = moodColor;
        
        this.checkCriticalStats();
    }
    
    checkCriticalStats() {
        const warnings = [];
        
        if (this.stats.hunger < 10) warnings.push('非常饿！');
        if (this.stats.energy < 10) warnings.push('非常累！');
        if (this.stats.hygiene < 10) warnings.push('非常脏！');
        if (this.stats.fun < 10) warnings.push('非常无聊！');
        if (this.stats.social < 10) warnings.push('非常孤独！');
        
        if (warnings.length > 0 && !this.lastWarning) {
            this.showMessage('警告：' + warnings.join(' '));
            this.lastWarning = Date.now();
        } else if (this.lastWarning && Date.now() - this.lastWarning > 5000) {
            this.lastWarning = null;
        }
    }
    
    // ==================== 辅助函数 ====================
    
    showMessage(text) {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = text;
        messageBox.classList.remove('hidden');
        
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 2000);
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new SimGame();
});
