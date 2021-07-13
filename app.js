const BULLET_SIZE = 2;
const WIDTH = 750, HEIGHT = 750;
const TOTAL_ZOMBIES = 15;
const TIMEOUT = 45000;
const SCREEN_W = 240;
const SCREEN_H = 320;

var PLAYING = false;

var ROUND = 0;
var SPAWN_TIMER = null;
var COUNTDOWN_TIMER = null;
var ZOMBIE_RESPAWN_TIME = TIMEOUT/1000;
var SCORE = 0;
var HP = 100;
var ZOMBIES_SPAWNED = 0;

var currentPlayer = null;
var zombies = {};
var povLock = false;

function displayKaiAds() {
  var display = true;
  if (window['kaiadstimer'] == null) {
    window['kaiadstimer'] = new Date();
  } else {
    var now = new Date();
    if ((now - window['kaiadstimer']) < 300000) {
      display = false;
    } else {
      window['kaiadstimer'] = now;
    }
  }
  console.log('Display Ads:', display);
  if (!display)
    return;
  getKaiAd({
    publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
    app: 'zombiepunk-2078',
    slot: 'kaios',
    onerror: err => console.error(err),
    onready: ad => {
      ad.call('display')
      setTimeout(() => {
        document.body.style.position = '';
      }, 1000);
    }
  })
}

function getRandomInt(min, max) {
  if (min === 0 && max === 1) {
    var y = Math.random();
    if (y < 0.5)
      return 0;
    else
      return 1;
  }
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function randomID() {
  return '_' + Math.random().toString(36).substr(2, 9);
};

function spawnZombies() {
  ROUND += 1
  document.getElementById('s_round').textContent = ROUND;
  ZOMBIE_RESPAWN_TIME = TIMEOUT/1000
  num = ((ROUND - 1) * 2) + TOTAL_ZOMBIES;
  ZOMBIES_SPAWNED += num;
  document.getElementById('s_total').textContent = ZOMBIES_SPAWNED;
  for (var i=0;i<num;i++) {
    const _id = randomID();
    zombies[_id] = me.game.world.addChild(me.pool.pull("zombie", _id));
  }
  if (SPAWN_TIMER) {
    clearInterval(SPAWN_TIMER);
    SPAWN_TIMER = null;
  }
  SPAWN_TIMER = setInterval(spawnZombies, TIMEOUT + 1);
  if (COUNTDOWN_TIMER) {
    clearInterval(COUNTDOWN_TIMER);
    COUNTDOWN_TIMER = null;
  }
  COUNTDOWN_TIMER = setInterval(() => {
    ZOMBIE_RESPAWN_TIME -= 1;
    document.getElementById('s_spawn').textContent = ZOMBIE_RESPAWN_TIME;
  }, 1000);
  me.audio.play("zombie_moan", true, null, 1);
}

function newGame() {
  hideGameoverMenu();
  document.getElementById('s_hp').textContent = 100;
  document.getElementById('s_kill').textContent = 0;
  document.getElementById('s_round').textContent = 0;
  document.getElementById('s_spawn').textContent = 0;
  hideWelcomeMenu();
  PLAYING = true;
  ROUND = 0;
  SPAWN_TIMER = null;
  COUNTDOWN_TIMER = null;
  ZOMBIE_RESPAWN_TIME = 60;
  SCORE = 0;
  HP = 100;
  ZOMBIES_SPAWNED = 0;

  currentPlayer = me.game.world.addChild(me.pool.pull("human"));
  zombies = {};
  povLock = false;
  spawnZombies();
  follow(currentPlayer);
}

function gameOver() {
  try {
    showGameoverMenu()
    me.audio.pause("zombie_moan");
    if (SPAWN_TIMER) {
      clearInterval(SPAWN_TIMER);
      SPAWN_TIMER = null;
    }
    if (COUNTDOWN_TIMER) {
      clearInterval(COUNTDOWN_TIMER);
      COUNTDOWN_TIMER = null;
    }
    for (var t in zombies) {
      me.game.world.removeChild(zombies[t]);
      delete zombies[t];
    }
    if (currentPlayer)
      me.game.world.removeChild(currentPlayer);
    PLAYING = false;
  } catch(e) {
    // console.log(e);
  }
}

function showWelcomeMenu() {
  const menu = document.getElementById('welcome-menu')
  menu.style.display = 'block';
}

function hideWelcomeMenu() {
  const menu = document.getElementById('welcome-menu')
  menu.style.display = 'none';
}

function showGameoverMenu() {
  displayKaiAds();
  const menu = document.getElementById('gameover-menu')
  menu.style.display = 'block';
}

function hideGameoverMenu() {
  const menu = document.getElementById('gameover-menu')
  menu.style.display = 'none';
}

var game = {
  resources: [
    { name: "map", type: "image", "src": "/map.jpg", },
    { name: "human", type: "image", "src": "/shooter.png", },
    { name: "zombie", type: "image", "src": "/zombie.png", },
    { name: "gun", type: "audio", "src": "", },
    { name: "zombie_moan", type: "audio", "src": "", },
    { name: "bg-music", type: "audio", "src": "", }
  ],
  loaded: function() {
    me.timer.maxfps = 30;
    me.game.world.fps = 30;
    me.game.world.resize(WIDTH, HEIGHT);
    me.pool.register("human", game.Human);
    me.pool.register("zombie", game.Zombie);
    me.pool.register("bullet", game.Bullet);
    me.pool.register("map", game.Map);
    this.playScreen = new game.PlayScreen();
    me.state.set(me.state.PLAY, this.playScreen);
    me.state.change(me.state.PLAY);
    me.audio.play("bg-music", true, null, 1);
    const menu = document.getElementById('score-board')
    menu.style.visibility = 'visible';
    showWelcomeMenu();
  },
  onload: function () {
    if (!me.video.init(SCREEN_W, SCREEN_H, {
        parent: document.getElementById('playground'),
        scale: "auto",
        renderer: me.video.AUTO,
        powerPreference: 'high-performance',
        antiAlias: false
      })) {
      alert("Your browser does not support HTML5 Canvas :(");
      return;
    }

    me.audio.init("mp3");
    me.loader.preload(game.resources, this.loaded.bind(this));
  },
};

game.PlayScreen = me.Stage.extend({
  onResetEvent: function() {
    me.game.world.addChild(me.pool.pull("map", WIDTH/2, HEIGHT/2))
    me.input.bindKey(me.input.KEY.LEFT, "left");
    me.input.bindKey(me.input.KEY.RIGHT, "right");
    me.input.bindKey(me.input.KEY.UP, "up");
    me.input.bindKey(me.input.KEY.DOWN, "down");
    me.input.bindKey(me.input.KEY.SPACE, "space");
    me.input.bindKey(me.input.KEY.ENTER, "enter");
  },
  onDestroyEvent: function() {
    me.input.unbindKey(me.input.KEY.LEFT);
    me.input.unbindKey(me.input.KEY.RIGHT);
    me.input.unbindKey(me.input.KEY.UP);
    me.input.unbindKey(me.input.KEY.DOWN);
    me.input.unbindKey(me.input.KEY.SPACE);
    me.input.unbindKey(me.input.KEY.ENTER);
  }
});

var idleTimer = null;
var reloding = false;

me.event.subscribe(me.event.KEYDOWN, function (action, keyCode, edge) {
  console.log(`keyCode`, keyCode);
  const plyr = currentPlayer
  const yAxis = ['up', 'down'];
  if ((keyCode === 32 || keyCode === 57) && !reloding && plyr != null) {
    me.audio.play("gun", false, null, 1);
    reloding = true;
    var bX, bY, bD;
    if (yAxis.indexOf(plyr.__DIRECTION__) > -1) {
      if (plyr.__DIRECTION__ === 'down') {
        bX = plyr.pos.x - (BULLET_SIZE / 2) - 5
        bY = plyr.pos.y + (plyr.height / 2)
        bD = 'down';
      } else {
        bX = plyr.pos.x - (BULLET_SIZE / 2) + 5
        bY = plyr.pos.y - (plyr.height / 2) - BULLET_SIZE
        bD = 'up';
      }
    } else {
      if (plyr.__DIRECTION__ === 'right') {
        bX = plyr.pos.x + (plyr.width / 2) + 5
        bY = plyr.pos.y - (BULLET_SIZE / 2) + 5
        bD = 'right';
      } else {
        bX = plyr.pos.x - (plyr.width / 2) - BULLET_SIZE - 5
        bY = plyr.pos.y - (BULLET_SIZE / 2) - 5
        bD = 'left';
      }
    }
    const b = me.game.world.addChild(me.pool.pull("bullet", bX, bY))
    b.__DIRECTION__ = bD;

    if (plyr.isCurrentAnimation("shoot")) {
    } else {
      plyr.setCurrentAnimation("shoot");
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    idleTimer = setTimeout(() => {
      plyr.setCurrentAnimation("idle");
      clearTimeout(idleTimer);
      idleTimer = null;
    }, 400);
    setTimeout(() => {
      reloding = false;
    }, 300);
  } else if (keyCode === 54 && PLAYING) {
    povLock = !povLock;
  } else {
    // console.log(keyCode);
  }
  
});

game.Human = me.Sprite.extend({
  init: function() {
    this._super(me.Sprite, "init", [
      WIDTH / 2 - 20,
      HEIGHT / 2 + 20,
      {
        image: me.loader.getImage("human"),
        framewidth: 27.35,
        frameheight: 41.3333333333
      }
    ]);

    this.addAnimation("idle", [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], 300);
    this.addAnimation("move", [20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39], 300);
    this.addAnimation("shoot", [40,41,42], 10);
    this.setCurrentAnimation("idle");

    this.__DIRECTION__ = 'down';
    this.vel = 50;
    this.minX = (this.width / 2);
    this.maxX = WIDTH - (this.height / 2);
    this.minY = (this.height / 2);
    this.maxY = HEIGHT - (this.height / 2);

    //this.body = new me.Body(this);
    //// add a default collision shape
    //this.body.addShape(new me.Rect(0, 0, this.width, this.height));
    //// configure max speed and friction
    //this.body.setFriction(0.4, 0);
    //// enable physic collision (off by default for basic me.Renderable)
    //this.isKinematic = false;
    //this.body.setVelocity(0, 0);
    //this.body.setMaxVelocity(0, 0);
    //this.body.collisionType = me.collision.types.PLAYER_OBJECT;

  },
  update: function(time) {
    this._super(me.Sprite, "update", [time]);

    var newX = this.pos.x, newY = this.pos.y;
    const oldX = this.pos.x, oldY = this.pos.y;
    if (me.input.isKeyPressed("left")) {
      if (this.__DIRECTION__ !== 'left' && !povLock) {
        rotateEntity(this, 'left');
      } else
        newX -= this.vel * time / 1000;
    } else if (me.input.isKeyPressed("right")) {
      if (this.__DIRECTION__ !== 'right' && !povLock) {
        rotateEntity(this, 'right');
      } else
        newX += this.vel * time / 1000;
    } else if (me.input.isKeyPressed("up")) {
      if (this.__DIRECTION__ !== 'up' && !povLock) {
        rotateEntity(this, 'up');
      } else
        newY -= this.vel * time / 1000;
    } else if (me.input.isKeyPressed("down")) {
      if (this.__DIRECTION__ !== 'down' && !povLock) {
        rotateEntity(this, 'down');
      } else
        newY += this.vel * time / 1000;
    }
    if (newX !== oldX || newY !== oldY) {
      if (!this.isCurrentAnimation("move")) {
        this.setCurrentAnimation("move");
      }
      this.pos.x = me.Math.clamp(newX, this.minX, this.maxX);
      this.pos.y = me.Math.clamp(newY, this.minY, this.maxY);
      follow(this);
    } else if (!idleTimer) {
      if (!this.isCurrentAnimation("idle")) {
        this.setCurrentAnimation("idle");
      }
    }

    return true;
  }
});

game.Zombie = me.Sprite.extend({
  init: function(id="NONE") {
    var random = [
      [50, 50],
      [getRandomInt((WIDTH - 51), 51), 50],
      [WIDTH - 50, 50],
      [50, HEIGHT - 50],
      [WIDTH - 50, getRandomInt((HEIGHT - 51), 51)],
      [WIDTH - 50, HEIGHT - 50],
    ]
    var pos = random[getRandomInt(0,5)];
    this._super(me.Sprite, "init", [
      pos[0],
      pos[1],
      {
        image: me.loader.getImage("zombie"),
        framewidth: 35,
        frameheight: 32.3333333333
      }
    ]);

    this.addAnimation("idle", [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
    this.addAnimation("move", [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33]);
    this.addAnimation("attack", [34,35,36,37,38,39,40,41,42], 100);
    this.setCurrentAnimation("idle");

    this.__DIRECTION__ = 'down';
    this.__DIRECTION_STACK__ = 0;
    this.__ACTION__ = 'idle';
    this.vel = 42;
    this.minX = (this.width / 2);
    this.maxX = WIDTH - (this.height / 2);
    this.minY = (this.height / 2);
    this.maxY = HEIGHT - (this.height / 2);

    //this.body = new me.Body(this);
    //// add a default collision shape
    //this.body.addShape(new me.Rect(0, 0, this.width, this.height));
    //// configure max speed and friction
    //this.body.setFriction(0.4, 0);
    //// enable physic collision (off by default for basic me.Renderable)
    //this.isKinematic = false;
    //this.body.setVelocity(0, 0);
    //this.body.setMaxVelocity(0, 0);
    //this.body.collisionType = me.collision.types.NO_OBJECT;
    this.alwaysUpdate = true;

  },
  update: function(time) {
    this._super(me.Sprite, "update", [time]);
    const v = Math.sqrt(Math.pow((this.pos.x - currentPlayer.pos.x), 2) + Math.pow((this.pos.y - currentPlayer.pos.y), 2));
    if (v > 15) {
      this.__ACTION__ = 'idle';
    } else {
      this.__ACTION__ = 'attack';
      HP -= 0.05
      if (HP <= 0) {
        HP = 0;
      }
      document.getElementById('s_hp').textContent = Math.floor(HP);
      if (HP <= 0) {
        gameOver()
      }
    }

    if (this.__ACTION__ === 'attack') {
      if (!this.isCurrentAnimation("attack")) {
        this.setCurrentAnimation("attack");
      }
      return
    }
    var oldDirection = this.__DIRECTION__;
    var newDirection = this.__DIRECTION__;
    if (this.pos.x < currentPlayer.pos.x && this.pos.y < currentPlayer.pos.y) {
      newDirection = ['right','down'][getRandomInt(0, 1)];
    } else if (this.pos.x < currentPlayer.pos.x && this.pos.y > currentPlayer.pos.y) {
      newDirection = ['right','up'][getRandomInt(0, 1)];
    } else if (this.pos.x > currentPlayer.pos.x && this.pos.y > currentPlayer.pos.y) {
      newDirection = ['left','up'][getRandomInt(0, 1)];
    } else if (this.pos.x > currentPlayer.pos.x && this.pos.y < currentPlayer.pos.y) {
      newDirection = ['left','down'][getRandomInt(0, 1)];
    }
    if (oldDirection !== newDirection && this.__DIRECTION_STACK__ < 10) {
      newDirection = oldDirection;
      this.__DIRECTION_STACK__ += 1;
    } else {
      this.__DIRECTION_STACK__ = 0;
    }
    if (oldDirection !== newDirection) {
      rotateEntity(this, newDirection);
    } else {
      this.__ACTION__ == 'move';
      if (!this.isCurrentAnimation("move")) {
        this.setCurrentAnimation("move");
      }
      var newX = this.pos.x, newY = this.pos.y;
      const oldX = this.pos.x, oldY = this.pos.y;
      if (oldDirection === "left") {
        newX -= this.vel * 16 / 1000;
      } else if (oldDirection === "right") {
        newX += this.vel * 16 / 1000;
      } else if (oldDirection === "up") {
        newY -= this.vel * 16 / 1000;
      } else if (oldDirection === "down") {
        newY += this.vel * 16 / 1000;
      }
      if (newX !== oldX || newY !== oldY) {
        this.pos.x = me.Math.clamp(newX, this.minX, this.maxX);
        this.pos.y = me.Math.clamp(newY, this.minY, this.maxY);
      }
    }
    return true;
  }
});

game.Map = me.Sprite.extend({
  init: function(x, y) {
    this._super(me.Sprite, "init", [
      x,
      y,
      {
        image: me.loader.getImage('map'),
      }
    ]);
  }
});

game.Bullet = me.Entity.extend({
    init : function (x, y) {
      this._super(me.Entity, "init", [x, y, { width: BULLET_SIZE, height: BULLET_SIZE }]);
      this.vel = 250;
      this.body.collisionType = me.collision.types.NO_OBJECT;
      this.renderable = new (me.Renderable.extend({
        init : function () {
          this._super(me.Renderable, "init", [0, 0, BULLET_SIZE, BULLET_SIZE]);
        },
        destroy : function () {},
        draw : function (renderer) {
          var color = renderer.getColor();
          renderer.setColor('#000');
          renderer.fillRect(0, 0, this.width, this.height);
          renderer.setColor(color);
        }
      }));
      this.alwaysUpdate = true;
    },

    update : function (time) {
      if (this.__DIRECTION__) {
        if (this.__DIRECTION__ === 'down') {
          this.pos.y += this.vel * time / 1000;
          if (this.pos.y + this.height >= HEIGHT) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'up') {
          this.pos.y -= this.vel * time / 1000;
          if (this.pos.y - this.height <= 0) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'right') {
          this.pos.x += this.vel * time / 1000;
          if (this.pos.x + this.width >= WIDTH) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'left') {
          this.pos.x -= this.vel * time / 1000;
          if (this.pos.x - this.width <= 0) {
              me.game.world.removeChild(this);
          }
        }
      }

      if (this.pos.x && this.pos.y) {
        for (var t in zombies) {
          const v = Math.sqrt(Math.pow((this.pos.x - zombies[t].pos.x), 2) + Math.pow((this.pos.y - zombies[t].pos.y), 2));
          if (v <= 5) {
            me.game.world.removeChild(zombies[t]);
            me.game.world.removeChild(this);
            delete zombies[t];
            SCORE += 1;
            document.getElementById('s_kill').textContent = SCORE;
            if (Object.keys(zombies).length === 0)
              me.audio.pause("zombie_moan");
            break;
          }
        }
      }
      me.collision.check(this);
      return true;
    }
});

function follow(plyr) {

  var mX = plyr.pos.x - (SCREEN_W / 2);
  mX = mX <= (SCREEN_W / 2) ? mX - 1 : mX;
  mX = mX <= 0 ? 0 : mX;
  if ((WIDTH - plyr.pos.x) <= (SCREEN_W / 2)) {
    mX = WIDTH - SCREEN_W
  }

  var mY = plyr.pos.y - (SCREEN_H / 2);
  mY = mY <= (SCREEN_H / 2) ? mY - 1 : mY;
  mY = mY <= 0 ? 0 : mY;
  if ((HEIGHT - plyr.pos.y) <= (SCREEN_H / 2)) {
    mY = HEIGHT - SCREEN_H
  }

  me.game.viewport.moveTo(mX, mY)
}

function rotateEntity(entity, to) {
  const dirAngle = {up: 0, right: 90, down: 180, left: 270};
  const x = dirAngle[to] - dirAngle[entity.__DIRECTION__];
  entity.__DIRECTION__ = to;
  entity.rotate(x * Math.PI / 180);
}

window.addEventListener("load", function() {

  displayKaiAds();

  me.device.onReady(function onReady() {
    game.onload();
  });

  document.addEventListener('keydown', (evt) => {
    me.input.triggerKeyEvent(evt.keyCode, true);
    if ((evt.keyCode === 49 || evt.key === 'Call') && !PLAYING) {
      newGame()
    } else if (evt.key === 'Backspace' || evt.key === 'EndCall') {
      window.close();
    }
  });

  document.addEventListener('keyup', (evt) => {
    me.input.triggerKeyEvent(evt.keyCode, false);
  });

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      displayKaiAds();
    }
  });

})
