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
let id;
let state;

// Sprites
let background;
let bird;
let floor;

const pipes = [];

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
const PIPE_SEPARATION = renderer.width * 0.5;

let gameSpeed = 1;
let currentGapSize = 50;


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
  requestAnimationFrame(gameLoop);

  state();

  renderer.render(stage);
};

const flyClickHandler = () => {
  bird.vy = -2.5;
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
    bird.rotation += 0.05 * bird.vy;
  } else if (bird.vy < 0 && bird.rotation > MIN_ROTATION) {
    bird.rotation -= 0.4;
  }

  // Check if the bird has collided with the ceiling
  if (bird.y - (bird.height / 2) < 0) {
    bird.y = bird.height / 2;
    bird.vy = 0;
  }
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
    if (birdRightX > pipe.x && birdLeftX < pipe.x + pipe.width) {
      const upPipe = pipe.children[0];
      const downPipe = pipe.children[1];

      if (birdTopY < downPipe.getGlobalPosition().y - currentGapSize - 1 || birdBottomY > upPipe.getGlobalPosition().y + upPipe.height + currentGapSize + 1) {
        collided = true;
      }
    }
  });

  return collided;
};


const animateGround = (speed) => {
  floor.x -= speed;

  if (floor.x < -23) {
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
    state = lost;
  }
};

const lost = () => {
  bird.ay = 0;
    bird.vy = 0;
    gameSpeed = 0;

    // Remove the fly click listener
    renderer.view.removeEventListener('click', flyClickHandler);
    document.removeEventListener('keypress', flySpaceHandler);
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

const init = () => {
  // Object which refers to sprites in atlas
  id = loader.resources['public/images/sprites.json'].textures;

  // Adds background
  background = new Sprite(id['day-bg.png']);
  stage.addChild(background);

  // Adds the floor
  floor = new Sprite(id['floor.png']);
  floor.y = OPEN_SPACE_HEIGHT;
  stage.addChild(floor);

  // Adds bird
  bird = new Sprite(id[birdAnimationStates[0]]);
  bird.y = (OPEN_SPACE_HEIGHT / 2) - (bird.height / 2);
  bird.x = (stage.width / 2) - (bird.width);
  bird.pivot.set(bird.width / 2, bird.height / 2);
  // Bird physics properties
  bird.vy = 0;
  bird.ay = 0.1;
  stage.addChild(bird);

  // Adds a pipe
  const pipeContainer = generatePipeContainer(OPEN_SPACE_HEIGHT / 2);
  pipeContainer.x = renderer.width;
  pipes.push(pipeContainer);
  stage.addChild(pipeContainer);

  state = prePlaySetup;

  gameLoop();
};

document.body.appendChild(renderer.view);

loader
  .add('public/images/sprites.json')
  .load(init);
