/* global PIXI */

// Aliases
const Container = PIXI.Container;
const loader = PIXI.loader;
const Sprite = PIXI.Sprite;

// Avaliable everywhere
const renderer = PIXI.autoDetectRenderer(
  144, 256,
  { resolution: 2, antialias: true },
);
renderer.autoResize = true;

const stage = new Container();
let scoreContainer;
let id;
let state;
let gameTime;
let isDay;

// Sprites
let background;
let darkBackground;
let bird;
let floor;
let gameOver;
let pipes;

const birdAnimationStates = [
  'yellow-bird-1.png',
  'yellow-bird-2.png',
  'yellow-bird-3.png',
  'yellow-bird-2.png',
];

const birdAnimationStatesIterator = {
  animationState: -1,
  [Symbol.iterator]() { return this; },

  next() {
    if (this.animationState > 2) {
      this.animationState = 0;
    } else {
      this.animationState += 1;
    }

    if (bird.vy >= 2.5) {
      this.animationState = 1;
    }

    return { value: birdAnimationStates[this.animationState], done: false };
  },
};

// Constants
const OPEN_SPACE_HEIGHT = 201;
const MAX_ROTATION = Math.PI / 2 - 0.2;
const MIN_ROTATION = -Math.PI / 10;
const DAY_LENGTH = 1000;

let PIPE_SEPARATION = renderer.width * 1;
let gameSpeed = 1;
let currentGapSize = 70;
let gameScore = 0;
let lastPipe;
let animationId;

class Throttler {
  constructor() {
    this.timer = undefined;
  }

  throttleAnimation(fps, fn) {
    if (this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        requestAnimationFrame(fn);
      }, 1000 / fps);
    }
  }
}

// Throttlers
const birdThrottler = new Throttler();

const gameLoop = () => {
  animationId = requestAnimationFrame(gameLoop);

  state();

  renderer.render(stage);
};

const flyClickHandler = () => {
  bird.vy = -2.75;
};

const flySpaceHandler = (event) => {
  if (event.keyCode === 32) {
    flyClickHandler();
  }
};

const generatePipeContainer = (center) => {
  const pipeContainer = new Container();
  const upPipe = new Sprite(id['up-green-pipe.png']);
  const downPipe = new Sprite(id['down-green-pipe.png']);

  upPipe.x = 0;
  upPipe.y = center - (currentGapSize / 2) - upPipe.height;
  upPipe.vx = -gameSpeed;
  downPipe.x = 0;
  downPipe.y = center + (currentGapSize / 2);
  downPipe.vx = -gameSpeed;
  pipeContainer.addChild(upPipe);
  pipeContainer.addChild(downPipe);

  return pipeContainer;
};

const generatePipes = () => {
  // Abort if a pipe has not left the screen
  if (pipes[0].x < -(id['down-green-pipe.png'].width)) {
    pipes.splice(0, 1);
    return;
  }

  const stopGeneratingAt = renderer.width * 2;
  const centerPoint = Math.random() * ((OPEN_SPACE_HEIGHT - currentGapSize) - (currentGapSize)) + currentGapSize;
  let currentPosition = pipes.slice(-1)[0].x + PIPE_SEPARATION;

  while (currentPosition < stopGeneratingAt) {
    const pipeContainer = generatePipeContainer(centerPoint, currentPosition);
    pipeContainer.x = currentPosition;

    pipes.push(pipeContainer);
    stage.addChild(pipeContainer);
    // Move the floor to the front
    stage.setChildIndex(floor, stage.children.length - 1);

    currentPosition += PIPE_SEPARATION;
  }
};

const animatePipes = (speed) => {
  pipes.forEach((pipe) => {
    pipe.x -= speed;
  });
};

const animateBirdWings = () => {
  // Make the wings flap
  bird.texture = id[birdAnimationStatesIterator.next().value];
};

const animateBirdStatic = () => {
  // Animate the bird's wings at 10fps
  birdThrottler.throttleAnimation(10, animateBirdWings);
};

const animateBirdPlay = () => {
  // Animate the bird's wings at 10fps
  birdThrottler.throttleAnimation(10, animateBirdWings);

  // Animate the bird's vertical position
  bird.vy += bird.ay;
  bird.y += bird.vy;

  // Animate the bird's rotation
  if (bird.vy > 0 && bird.rotation < MAX_ROTATION) {
    bird.rotation += 0.04 * bird.vy;
  } else if (bird.vy < 0 && bird.rotation > MIN_ROTATION) {
    bird.rotation -= 0.4;
  }

  // Check if the bird has collided with the ceiling
  if (bird.y - (bird.height / 2) < 0) {
    bird.y = bird.height / 2;
    bird.vy = 0;
  }
};

const checkScore = () => {
  pipes.forEach((pipe) => {
    if (pipe !== lastPipe && (Math.abs(pipe.x + pipe.width) - (bird.x + (bird.width / 2))) < 1) {
      lastPipe = pipe;
      gameScore += 1;
    }
  });
};

const displayScore = (score) => {
  const digits = String(score)
    .split('')
    .map(d => `${d}.png`);

  scoreContainer.removeChildren();

  digits.forEach((digit) => {
    const sprite = new Sprite(id[digit]);
    let lastChildWidth = 0;
    let lastChildX = 0;

    if (scoreContainer.children.length > 0) {
      const lastChild = scoreContainer.getChildAt(scoreContainer.children.length - 1);
      lastChildWidth = lastChild.width;
      lastChildX = lastChild.x;
    }

    sprite.x = lastChildX + lastChildWidth + 1;
    scoreContainer.addChild(sprite);
    stage.setChildIndex(scoreContainer, stage.children.length - 1);
  });

  // Center the scoreContainer
  scoreContainer.x = (renderer.width / 4) - (scoreContainer.width / 2);
};

const checkCollisions = () => {
  let collided = false;

  // Check if the bird has collided with the ground
  if (bird.y + (bird.height / 2) > OPEN_SPACE_HEIGHT) {
    // YOU LOST!!
    bird.y = OPEN_SPACE_HEIGHT - (bird.height / 2);
    collided = true;
  }

  // Check if the bird has collided with a pipe
  const birdRightX = bird.x + bird.width / 2;
  const birdLeftX = bird.x - bird.width / 2;
  const birdTopY = bird.y - bird.height / 2;
  const birdBottomY = bird.y + bird.height / 2;

  pipes.forEach((pipe) => {
    // Between pipe space in X
    if (birdRightX > pipe.x + 5 && birdLeftX < pipe.x + pipe.width - 5) {
      const upPipe = pipe.children[0];
      const downPipe = pipe.children[1];

      if (birdTopY < downPipe.getGlobalPosition().y - currentGapSize - 5
          || birdBottomY > upPipe.getGlobalPosition().y + upPipe.height + currentGapSize + 5) {
        collided = true;
      }
    }
  });

  return collided;
};


const animateGround = (speed) => {
  floor.x -= speed;

  if (floor.x < -23.5) {
    floor.x = 0;
  }
};

const prePlay = () => {
  // Animate the bird
  animateBirdStatic();

  // Animate the floor
  animateGround(gameSpeed);

  // Generate some pipes
  generatePipes();
};

const play = () => {
  // Add time
  gameTime += 1;

  // Animate the bird
  animateBirdPlay();

  // Animate the floor
  animateGround(gameSpeed);

  // Generate some pipes
  generatePipes();

  // Animate pipes
  animatePipes(gameSpeed);

  // Check for collisions
  if (checkCollisions() === true) {
    bird.vy = 0;
    state = preLost;
  }

  // Make gaps smaller
  if (currentGapSize > 48) {
      currentGapSize -= 0.01
  }
  // Make pipes closer together
  if (PIPE_SEPARATION > renderer.width * 0.35) {
    PIPE_SEPARATION -= 0.075;
  }
  // Speed up the ground
  if (gameSpeed < 1.3) {
    gameSpeed += 0.0002;
  }

  if (gameTime % DAY_LENGTH === DAY_LENGTH - 1) {
    isDay = !isDay;
  }

  if (isDay) {
    if (background.alpha < 1) {
      background.alpha += 0.005;
    }
  }

  if (!isDay) {
    if (background.alpha > 0) {
      background.alpha -= 0.005;
    }
  }

  checkScore();

  displayScore(gameScore);
};

const lost = () => {
    // Animate the bird
    animateBirdPlay();

    // Prevent phasing through floor
    checkCollisions();
};

const preLost = () => {
  gameSpeed = 0;

  // Remove the fly click listener
  renderer.view.removeEventListener('click', flyClickHandler);
  document.removeEventListener('keypress', flySpaceHandler);

  gameOver = new Sprite(id['game-over.png']);
  gameOver.x = (renderer.width / 4) - (gameOver.width / 2);
  gameOver.y = (renderer.height / 4) - 60;
  stage.addChild(gameOver);

  document.addEventListener('keypress', function handler(event) {
    if (event.which === 32) {
      document.removeEventListener('keypress', handler);
      reset();
    }
  });

  state = lost;
};

/**
*
* Waits for the player to start the game by tapping/clicking
*/
const prePlaySetup = () => {
  // Waits for the player to click the play space to begin
  renderer.view.addEventListener('click', function starter() {
    state = play;
    renderer.view.removeEventListener('click', starter);
  });
  document.addEventListener('keypress', function starter() {
    if (event.keyCode === 32) {
      state = play;
      document.removeEventListener('keypress', starter);
    }
  });

  // Add the listeners for flying action
  renderer.view.addEventListener('click', flyClickHandler);
  document.addEventListener('keypress', flySpaceHandler);

  state = prePlay;
};

// Ensures pixels are scaled up
// PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

const reset = () => {
  stage.removeChildren();
  cancelAnimationFrame(animationId);

  init();
};

const init = () => {
  gameTime = 0;
  isDay = true;
  birdAnimationStatesIterator.animationState = -1;
  PIPE_SEPARATION = renderer.width * 1;
  gameSpeed = 1;
  currentGapSize = 70;
  gameScore = 0;
  pipes = [];

  // Object which refers to sprites in atlas
  id = loader.resources['public/images/sprites.json'].textures;

  // Adds night background
  darkBackground = new Sprite(id['night-bg.png']);
  stage.addChild(darkBackground);

  // Adds day background
  background = new Sprite(id['day-bg.png']);
  stage.addChild(background);

  // Adds the floor
  floor = new Sprite(id['floor.png']);
  floor.y = OPEN_SPACE_HEIGHT;
  stage.addChild(floor);

  // Adds bird
  bird = new Sprite(id[birdAnimationStates[0]]);
  bird.y = (OPEN_SPACE_HEIGHT / 2) - (bird.height / 2) + 10;
  bird.x = (stage.width / 2) - (40);
  bird.pivot.set(bird.width / 2, bird.height / 2);
  // Bird physics properties
  bird.vy = 0;
  bird.ay = 0.12;
  stage.addChild(bird);

  // Adds a pipe
  const pipeContainer = generatePipeContainer(OPEN_SPACE_HEIGHT / 2);
  pipeContainer.x = renderer.width;
  pipes.push(pipeContainer);
  stage.addChild(pipeContainer);

  // Adds a score container + scores
  scoreContainer = new Container();
  const zeroNum = new Sprite(id['0.png']);
  scoreContainer.x = (renderer.width / 4) - ((zeroNum.width / 2) - 1);
  scoreContainer.y = OPEN_SPACE_HEIGHT / 10;
  scoreContainer.addChild(zeroNum);
  stage.addChild(scoreContainer);

  state = prePlaySetup;

  gameLoop();
};

document.body.appendChild(renderer.view);

loader
  .add('public/images/sprites.json')
  .load(init);
