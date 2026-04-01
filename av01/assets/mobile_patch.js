/**
 * Mobile Playable-Ad Patch
 * Hooks into the live Phaser GameScene (exposed as window.__gameScene)
 * to add touch controls, custom cursor, Spine buff FX, and mobile fixes.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  GLOBAL MOBILE CSS FIXES                                           */
  /* ------------------------------------------------------------------ */
  (function mobileCssFixes() {
    document.body.style.touchAction = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";

    // Prevent pull-to-refresh and elastic scroll
    document.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });

    // Set generic pointer cursor on canvas
    var style = document.createElement("style");
    style.textContent = "canvas { cursor: pointer !important; }";
    document.head.appendChild(style);
  })();

  /* ------------------------------------------------------------------ */
  /*  WAIT FOR GAME SCENE TO BE READY (re-polls after restart)          */
  /* ------------------------------------------------------------------ */
  var pollId = setInterval(function () {
    if (!window.__gameScene) return;
    var scene = window.__gameScene;
    if (!scene.crowd) return;
    // Patch only if we haven't patched or if the scene restarted
    if (!scene.__mobilePatchActive) {
      applyPatch(scene);
    }
  }, 100);

  /* ================================================================== */
  function applyPatch(scene) {
    console.log("[mobile_patch] Applying mobile patches…");
    scene.__mobilePatchActive = true;
    
    // When the game restarts, the scene shuts down and clears events/objects.
    // We listen to shutdown so we can re-apply our generic patches on next boot.
    scene.events.once('shutdown', function() {
      scene.__mobilePatchActive = false;
    });

    // Completely intercept the scene's update loop to freeze it during Game Over / Win
    // Also add performance cleanup: destroy off-screen objects each frame
    if (!scene.__origUpdatePatchApplied) {
        scene.__origUpdatePatchApplied = true;
        var origUpdate = scene.update;
        var _perfFrame = 0;
        scene.update = function(time, delta) {
            if (scene.isGameOver) {
                if (scene.physics && scene.physics.world && !scene.physics.world.isPaused) {
                     scene.physics.pause();
                }
                return;
            }
            if (origUpdate) {
                origUpdate.call(scene, time, delta);
            }
            // Every 10 frames, clean up off-screen bullets and enemies
            _perfFrame++;
            if (_perfFrame % 10 === 0) {
                var h = scene.scale.height;
                var w = scene.scale.width;
                if (scene.bullets) {
                    scene.bullets.getChildren().forEach(function(b) {
                        if (b.active && (b.y < -100 || b.y > h + 100 || b.x < -100 || b.x > w + 100)) {
                            b.destroy();
                        }
                    });
                }
                if (scene.enemies) {
                    scene.enemies.getChildren().forEach(function(e) {
                        if (e.active && e.y > h + 200) {
                            e.destroy();
                        }
                    });
                }
            }
        };
    }

    // Create the Swipe to Move tutorial overlay
    var swipeTutorial = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height / 2 - 100,
      "<- Swipe to Move ->",
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(3005);

    scene.tweens.add({
      targets: swipeTutorial,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });


    /* -------------------------------------------------------------- */
    /*  1. TOUCH / DRAG CONTROLS                                      */
    /* -------------------------------------------------------------- */
    var touchState = {
      active: false,
      startX: 0,
      crowdStartX: 0
    };

    // Ripple Effect
    scene.__ripple = scene.add.circle(0, 0, 30, 0xffffff, 0)
      .setDepth(10000).setVisible(false);
    scene.__rippleTween = scene.tweens.add({
      targets: scene.__ripple,
      scale: { from: 1, to: 2.5 },
      alpha: { from: 0.6, to: 0 },
      duration: 700,
      repeat: -1
    });

    // Use Phaser's input system for correct coordinate mapping
    scene.input.on("pointerdown", function (pointer) {
      if (scene.__ripple) {
         scene.__ripple.setPosition(pointer.x, pointer.y);
         scene.__ripple.setVisible(true);
      }
      // Don't allow control if game is over
      if (scene.isGameOver) return;
      
      if (swipeTutorial && swipeTutorial.active) {
          swipeTutorial.destroy();
          if (scene.__tutorialHand && scene.__tutorialHand.active) {
              scene.__tutorialHand.destroy();
          }
      }

      touchState.active = true;
      touchState.startX = pointer.x;
      touchState.crowdStartX = scene.crowd.leaderPoint.x;

      // Resume AudioContext on first gesture
      if (scene.sound && scene.sound.context && scene.sound.context.state === "suspended") {
        scene.sound.context.resume();
      }
    });

    scene.input.on("pointermove", function (pointer) {
      if (!touchState.active || scene.isGameOver) return;
      var dx = pointer.x - touchState.startX;
      var newX = touchState.crowdStartX + dx;
      newX = Phaser.Math.Clamp(newX, scene.crowd.minX, scene.crowd.maxX);
      scene.crowd.leaderPoint.x = newX;
      scene.crowd.targetX = newX;
      if (scene.__ripple) {
         scene.__ripple.setPosition(pointer.x, pointer.y);
      }
    });

    scene.input.on("pointerup", function () {
      touchState.active = false;
      if (scene.__ripple) scene.__ripple.setVisible(false);
    });

    // Also handle pointer leaving canvas
    scene.input.on("pointerupoutside", function () {
      touchState.active = false;
      if (scene.__ripple) scene.__ripple.setVisible(false);
    });

    /* -------------------------------------------------------------- */
    /*  2. CUSTOM CARTOON HAND CURSOR (in-game Phaser sprite)          */
    /* -------------------------------------------------------------- */
    // Load the hand cursor texture if not already loaded
    if (!scene.textures.exists("hand_cursor")) {
      scene.load.image("hand_cursor", "assets/Tex/hand_cursor.png");
      scene.load.once("complete", function () {
        createHandCursor();
      });
      scene.load.start();
    } else {
      createHandCursor();
    }

    function createHandCursor() {
      if (swipeTutorial && swipeTutorial.active) {
        scene.__tutorialHand = scene.add.image(scene.scale.width / 2, scene.scale.height / 2 - 20, "hand_cursor")
          .setDepth(3006)
          .setScale(0.8)
          .setOrigin(0.5, 0);

        scene.tweens.add({
          targets: scene.__tutorialHand,
          x: { from: scene.scale.width / 2 - 80, to: scene.scale.width / 2 + 80 },
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }

      // Set default cursor back just in case
      scene.input.setDefaultCursor("default");
    }

    /* -------------------------------------------------------------- */
    /*  3. REPLACE _playFx0067 WITH SPINE EFFECT                      */
    /* -------------------------------------------------------------- */
    scene._playFx0067 = function (x, y) {
      try {
        // Create Spine effect
        var fx = scene.add.spine(x, y, "fx0067-skel", "fx0067-atlas");
        fx.setScale(1.0);
        fx.setDepth(5000);

        // Find the first available animation and play it
        var anims = fx.skeleton.data.animations;
        if (anims.length > 0) {
          var animName = anims[0].name;
          fx.animationState.setAnimation(0, animName, false);

          // Listen for completion and destroy
          fx.animationState.addListener({
            complete: function () {
              // Small delay before destroy to avoid flicker
              scene.time.delayedCall(50, function () {
                if (fx && fx.active) fx.destroy();
              });
            }
          });

          // Safety timeout in case the event doesn't fire
          var animDuration = anims[0].duration || 2;
          scene.time.delayedCall((animDuration + 0.5) * 1000, function () {
            if (fx && fx.active) fx.destroy();
          });
        } else {
          // No animations — just show briefly and remove
          scene.time.delayedCall(1000, function () {
            if (fx && fx.active) fx.destroy();
          });
        }
      } catch (e) {
        console.warn("[mobile_patch] Spine FX 0067 failed, falling back:", e);
        // Fallback: original circle-based effect
        var colors = [0xffff00, 0x00ffff, 0xff88ff, 0xffffff];
        for (var i = 0; i < 8; i++) {
          var angle = i * Math.PI / 4;
          var p = scene.add.circle(x, y, 6, colors[i % 4], 0.9).setDepth(5000);
          scene.tweens.add({
            targets: p,
            x: x + Math.cos(angle) * 80,
            y: y + Math.sin(angle) * 80 - 30,
            alpha: 0,
            scale: 0.3,
            duration: 400,
            ease: "Power2",
            onComplete: function () { p.destroy(); }
          });
        }
      }
    };

    /* -------------------------------------------------------------- */
    /*  4. PATCH keydown-F TO ALSO PLAY BUFF EFFECT                   */
    /* -------------------------------------------------------------- */
    scene.input.keyboard.removeAllListeners("keydown-F");
    scene.input.keyboard.on("keydown-F", function () {
      scene.bulletLevel = 2;
      scene.crowd.changeModel("bigflyer-skel", "bigflyer-atlas", "光明巨龙", 0.35);
      scene._playFx0067(scene.crowd.leaderPoint.x, scene.crowd.leaderPoint.y - 50);
    });

    
    /* -------------------------------------------------------------- */
    /*  TRACK PRE-DEATH STATE AND ENEMY TRACKING                      */
    /* -------------------------------------------------------------- */
    var _trackFrame = 0;
    scene.events.on("update", function(time, delta) {
        if (!scene.isGameOver && scene.crowd && scene.crowd.units && scene.crowd.units.length > 0) {
            scene.__lastKnownUnits = scene.crowd.units.length;
        }

        // Throttle enemy tracking to every 3rd frame for performance
        _trackFrame++;
        if (_trackFrame % 3 !== 0) return;

        if (!scene.isGameOver && scene.enemies && scene.crowd && scene.crowd.leaderPoint) {
            var lx = scene.crowd.leaderPoint.x;
            var chaseY = scene.scale.height * 0.5;
            var enemies = scene.enemies.getChildren();
            for (var i = 0; i < enemies.length; i++) {
                var e = enemies[i];
                if (e.activeEnemy && !e.isBoss && e.y > chaseY) {
                    var dx = lx - e.x;
                    // Multiply speed by 3 to compensate for running every 3rd frame
                    var speed = 180 * 3 * (delta / 1000); 
                    if (Math.abs(dx) > 5) {
                        e.x += (dx > 0 ? 1 : -1) * Math.min(Math.abs(dx), speed);
                    }
                }
            }
        }
    });

    /* -------------------------------------------------------------- */
    /*  5. GAME OVER: TAP TO REVIVE (RETAINS STATE)                   */
    /* -------------------------------------------------------------- */
    var origShowGameOver = scene.showGameOverScreen.bind(scene);
    
    scene.showGameOverScreen = function () {
      if (scene.__isWaitingRevive) return; // Fix multiple overlay bug
      scene.__isWaitingRevive = true;

      // Don't call origShowGameOver() to avoid scene.restart() and UI overlays
      scene.isGameOver = true;
      touchState.active = false;

      // Pause Game completely
      if (scene.physics) scene.physics.pause();
      if (scene.spawnTimer) scene.spawnTimer.paused = true;
      if (scene.fireTimer) scene.fireTimer.paused = true;
      
      // Dim background
      scene.__reviveOverlay = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2,
        scene.scale.width,
        scene.scale.height,
        0x000000,
        0.7
      ).setDepth(3001);

      // Add "Tap to Revive" text
      var reviveText = scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 + 120,
        "TAP TO REVIVE", 

        {
          fontFamily: "Arial, sans-serif",
          fontSize: "48px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 6,
          fontStyle: "bold"
        }
      ).setOrigin(0.5).setDepth(3002);

      scene.tweens.add({
        targets: reviveText,
        alpha: 0.4,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      // Tap anywhere to revive
      scene.time.delayedCall(100, function () { // very small delay so current tap doesn't instantly trigger
        scene.input.once("pointerdown", function () {
          // Destroy the text and overlay
          reviveText.destroy();
          if (scene.__reviveOverlay) scene.__reviveOverlay.destroy();
          
          scene.__isWaitingRevive = false; // Remove lock

          // Re-enable gameplay
          scene.isGameOver = false;
          if (scene.physics) scene.physics.resume();
          if (scene.spawnTimer) scene.spawnTimer.paused = false;
          if (scene.fireTimer) scene.fireTimer.paused = false;
          
          // Restore all exact pre-death units
          if (scene.crowd && scene.crowd.units && scene.crowd.units.length <= 0) {
              var restoreCount = scene.__lastKnownUnits || 1;
              scene.crowd.addUnits(restoreCount);
          }
          
          /* ======== PERFECT GOLDEN CIRCLES ======== */
          scene.__isInvincible = true;
          
          var shieldGraphics = scene.add.graphics();
          shieldGraphics.setDepth(2000);
          
          var pulseAlpha = { val: 0.8 };
          var st = scene.tweens.add({
              targets: pulseAlpha,
              val: 0.3,
              duration: 250,
              yoyo: true,
              repeat: -1
          });

          // Used postupdate to guarantee 0-frame visual trailing!
          var updateShield = function() {
              shieldGraphics.clear();
              if (scene.crowd && scene.crowd.units) {
                  shieldGraphics.fillStyle(0xFFD700, pulseAlpha.val * 0.4);
                  shieldGraphics.lineStyle(4, 0xFFD700, pulseAlpha.val);
                  
                  scene.crowd.units.forEach(function(u) {
                      if (u.spine && u.spine.active) {
                          var scale = scene.crowd.currentScale || 0.31;
                          var radius = scale * 150; // mathematical perfect circle
                          shieldGraphics.strokeCircle(u.spine.x, u.spine.y - radius, radius);
                          shieldGraphics.fillCircle(u.spine.x, u.spine.y - radius, radius);
                      }
                  });
              }
          };
          scene.events.on("postupdate", updateShield);

          scene.time.delayedCall(2000, function() {
              scene.__isInvincible = false;
              st.stop();
              shieldGraphics.clear();
              shieldGraphics.destroy();
              scene.events.off("postupdate", updateShield);
          });
          /* ======================================== */

          
          var px = scene.crowd.leaderPoint.x;
          var py = scene.crowd.leaderPoint.y;
          
          // Kill nearby enemies (radius 400)
          if (scene.enemies) {
              var enemies = scene.enemies.getChildren();
              enemies.forEach(function(e) {
                  if (e.activeEnemy) {
                      var distSq = Phaser.Math.Distance.Squared(px, py, e.x, e.y);
                      if (distSq < 400 * 400) {
                          if (e.takeDamage) e.takeDamage(9999);
                          if (scene._playFx0067) scene._playFx0067(e.x, e.y);
                      }
                  }
              });
          }
          
          // Break nearby barrels
          if (scene.barrels) {
              var barrels = scene.barrels.getChildren();
              barrels.forEach(function(b) {
                  if (b.active) {
                      var distSq = Phaser.Math.Distance.Squared(px, py, b.x, b.y);
                      if (distSq < 300 * 300) {
                          if (b.takeDamage) b.takeDamage(9999);
                          if (scene._playFx0067) scene._playFx0067(b.x, b.y);
                      }
                  }
              });
          }
        });
      });
    };

    /* -------------------------------------------------------------- */
    /*  6. WIN SCREEN: DOWNLOAD BUTTON                                */
    /* -------------------------------------------------------------- */
    var origShowWin = scene.showWinScreen.bind(scene);
    scene.showWinScreen = function () {
      origShowWin();
      touchState.active = false;
      scene.isGameOver = true;
      if (scene.physics) scene.physics.pause();
      if (scene.spawnTimer) scene.spawnTimer.paused = true;
      if (scene.fireTimer) scene.fireTimer.paused = true;

      // Dark overlay for victory
      scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2,
        scene.scale.width,
        scene.scale.height,
        0x000000,
        0.5
      ).setDepth(3001);

      // "DOWNLOAD NOW" Button Box
      var downloadBtn = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2 + 150,
        340, 80, 0x18BA31, 1
      ).setDepth(3002).setInteractive({ useHandCursor: true });

      var downloadText = scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 + 150,
        "DOWNLOAD NOW",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "36px",
          color: "#ffffff",
          fontStyle: "bold"
        }
      ).setOrigin(0.5).setDepth(3003);

      scene.tweens.add({
        targets: [downloadBtn, downloadText],
        scale: 1.1,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      // Simple external link action instead of internal scene restart
      downloadBtn.on("pointerdown", function () {
         window.open("https://play.google.com/store/apps/details?id=com.kunpan.en.monchanic&pli=1", "_blank");
      });
    };

    console.log("[mobile_patch] All patches applied successfully.");
  }
})();
