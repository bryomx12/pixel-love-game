import kaboom from "https://unpkg.com/kaboom@3000.1.17/dist/kaboom.mjs";

kaboom({
    width: 800,
    height: 600,
    background: [15, 15, 25],
    letterbox: true,
});

// 1. ASSET LOADING
loadSprite("popeye-walk", "/popeye-walk.png", {
    sliceX: 5, sliceY: 1, anims: { "walk": { from: 0, to: 4, loop: true, speed: 12 } }
});
loadSprite("popeye-climb", "/popeye-climb.png", {
    sliceX: 2, sliceY: 1, anims: { "climb": { from: 0, to: 1, loop: true, speed: 10 } }
});
loadSprite("olive-walk", "/olive-walk.png", {
    sliceX: 5, sliceY: 1, anims: { "walk": { from: 0, to: 4, loop: true, speed: 8 } }
});
loadSprite("brutus", "/brutus.png", {
    sliceX: 5, sliceY: 1, anims: { "walk": { from: 0, to: 4, loop: true, speed: 10 } }
});
loadSprite("heart", "/heart.png", {
    sliceX: 5, sliceY: 1, anims: { "beat": { from: 0, to: 4, loop: true, speed: 10 } }
});
loadSprite("spinach", "/spinach.png", {
    sliceX: 2, sliceY: 1, anims: { "flash": { from: 0, to: 1, loop: true, speed: 4 } }
});

scene("game", () => {
    let score = 0;
    let lives = 3;
    let isPoweredUp = false; 
    setGravity(1200);

    const scoreLabel = add([text(`SCORE: ${score}`, { size: 24 }), pos(20, 20)]);
    const livesLabel = add([text(`LIVES: ${lives}`, { size: 24 }), pos(20, 50), color(255, 50, 50)]);

    // 2. LADDERS
    function createLadder(x) {
        return add([
            rect(60, 480), pos(x - 15, 90), color(100, 200, 255, 0.4), area({ isSensor: true }), "ladder"
        ]);
    }
    createLadder(170); 
    createLadder(580); 

    // 3. FLOORS
    const levels = [
        "==============================", 
        "                              ",
        "  ==============  ==========  ", 
        "                              ",
        "==============================", 
    ];

    addLevel(levels, {
        tileWidth: 28, tileHeight: 65, pos: vec2(0, 150),
        tiles: {
            "=": () => [rect(28, 8), color(150, 75, 0), area(), body({ isStatic: true }), "platform"],
        }
    });

    // 4. PLAYER
    const player = add([
        sprite("popeye-walk"), pos(400, 410), area({ width: 14, height: 14 }), body(), anchor("center"), "player", { isClimbing: false }
    ]);

    // 5. OLIVE & BRUTUS
    const olive = add([
        sprite("olive-walk"), pos(400, 140), area(), anchor("center"), "olive", { dir: 1, speed: 100 }
    ]);
    olive.play("walk"); 

    const brutus = add([
        sprite("brutus"), pos(250, 280), area(), body(), anchor("center"), "enemy", { speed: 110, isDead: false }
    ]);
    brutus.play("walk");

    // 6. PLAYER LOGIC (With Animation Fix & Screen Loop)
    onUpdate("player", (p) => {
        const onLadder = get("ladder").some(l => p.isOverlapping(l));
        const onFloor = get("platform").some(f => p.isOverlapping(f));
        
        // --- SCREEN LOOP (WRAP) ---
        if (p.pos.x < 0) p.pos.x = width();
        if (p.pos.x > width()) p.pos.x = 0;

        // Physics/Climbing Toggles
        if (onLadder && (isKeyDown("up") || isKeyDown("down"))) {
            if (!p.isClimbing) {
                p.isClimbing = true;
                p.unuse("body"); 
            }
        } else if (onFloor && !isKeyDown("up") && !isKeyDown("down") && p.isClimbing) {
            p.isClimbing = false;
            p.use(body()); 
        } else if (!onLadder && p.isClimbing) {
            p.isClimbing = false;
            p.use(body());
        }

        // Horizontal Movement & Animation
        if (isKeyDown("left")) {
            p.move(-250, 0); 
            p.flipX = true;
            if (!p.isClimbing && p.curAnim() !== "walk") {
                p.use(sprite("popeye-walk")); // Force re-sync walk sprite
                p.play("walk");
            }
        } else if (isKeyDown("right")) {
            p.move(250, 0); 
            p.flipX = false;
            if (!p.isClimbing && p.curAnim() !== "walk") {
                p.use(sprite("popeye-walk")); // Force re-sync walk sprite
                p.play("walk");
            }
        }

        // Vertical Movement
        if (p.isClimbing) {
            if (p.sprite !== "popeye-climb") p.use(sprite("popeye-climb"));
            if (isKeyDown("up")) {
                p.pos.y -= 4;
                if (p.curAnim() !== "climb") p.play("climb");
            } else if (isKeyDown("down")) {
                p.pos.y += 4;
                if (p.curAnim() !== "climb") p.play("climb");
            } else {
                p.stop();
            }
        } else {
            // Stop animation if standing still
            if (!isKeyDown("left") && !isKeyDown("right")) {
                p.stop();
                p.frame = 0; 
            }
        }

        if (p.pos.y > 600) p.pos = vec2(400, 410);
    });

    // 7. AI & ITEMS
    onUpdate("olive", (o) => {
        o.move(o.speed * o.dir, 0);
        if (o.pos.x < 100 || o.pos.x > 700) { o.dir *= -1; o.flipX = (o.dir < 0); }
    });

    onUpdate("enemy", (b) => {
        if (b.isDead) return;
        const onLadder = get("ladder").some(l => b.isOverlapping(l));
        const distY = player.pos.y - b.pos.y;
        const distX = player.pos.x - b.pos.x;
        if (onLadder && Math.abs(distY) > 50) {
            b.unuse("body");
            b.pos.y += (distY > 0 ? 2 : -2); 
            if (b.curAnim() !== "walk") b.play("walk");
        } else {
            if (!b.hasFill) b.use(body()); 
            b.move(distX > 0 ? b.speed : -b.speed, 0);
            b.flipX = (distX > 0);
        }
    });

    loop(3, () => {
        const h = add([sprite("heart"), pos(olive.pos.x, olive.pos.y + 20), area({ scale: 2.5 }), "heart", { t: 0 }]);
        h.play("beat");
        h.onUpdate(() => { h.t += dt(); h.move(Math.sin(h.t * 4) * 50, 75); });
    });

    loop(10, () => {
        add([sprite("spinach"), pos(rand(100, 700), 200), area({ scale: 2.5 }), body(), "spinach"]).play("flash");
    });

    // 8. COLLISIONS
    onCollide("player", "heart", (p, h) => { destroy(h); score += 10; scoreLabel.text = `SCORE: ${score}`; });
    onCollide("player", "spinach", (p, s) => { 
        destroy(s); isPoweredUp = true; p.color = rgb(255, 255, 0); 
        wait(6, () => { isPoweredUp = false; p.color = rgb(255, 255, 255); }); 
    });

    onCollide("player", "enemy", (p, e) => {
        if (isPoweredUp) {
            e.isDead = true; e.pos = vec2(-100, -100); 
            score += 100; scoreLabel.text = `SCORE: ${score}`;
            wait(5, () => { e.isDead = false; e.pos = vec2(250, 280); });
        } else {
            lives--; livesLabel.text = `LIVES: ${lives}`; p.pos = vec2(400, 410); 
            if (lives <= 0) go("over", score); 
        }
    });
});

scene("over", (finalScore) => {
    add([text("GAME OVER", { size: 48 }), pos(width() / 2, 200), anchor("center"), color(255, 50, 50)]);
    add([text(`FINAL SCORE: ${finalScore}`, { size: 32 }), pos(width() / 2, 300), anchor("center")]);
    onKeyPress("space", () => go("game"));
});

go("game");
