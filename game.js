import MainMenuScene from './js/scenes/MainMenuScene.js';
import GameScene from './js/scenes/GameScene.js';
import UIScene from './js/scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    // --- 这是最关键的修复 ---
    // 我们不再预加载所有场景，而是定义它们，让场景管理器去按需加载
    scene: [MainMenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// Exposed only for the local smoke test.
window.__particleSwarmGame = game;
