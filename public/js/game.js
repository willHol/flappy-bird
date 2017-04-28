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
const PIPE_SEPARATION = renderer.width * 1;

let gameSpeed = 1;
let currentGapSize = 67;


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

const generatePipes = () => {
  // Abort if a pipe has not left the screen
  if (pipes.length > 0 && pipes[0].x < -(id['down-green-pipe.png'].width)) {
    return;
  }

  const generationXStart = pipes.length > 0 ? pipes.slice(-1)[0].x : renderer.width;
  const generationXEnd = renderer.width * 2;
  let currentPosition = generationXStart;

  while (currentPosition < generationXEnd) {
    // Generate a random center point
    const center = (Math.random() * (OPEN_SPACE_HEIGHT - 40)) + 40;

    // Generate a pipe pair + container
    const pipeContainer = new Container();
    const pipeUp = new Sprite(id['up-green-pipe.png']);
    const pipeDown = new Sprite(id['down-green-pipe.png']);
    pipeContainer.addChild(pipeUp);
    pipeContainer.addChild(pipeDown);

    // Position the pipes
    pipeContainer.x = currentPosition;
    pipeContainer.height = OPEN_SPACE_HEIGHT;
    pipeUp.y = center + (currentGapSize / 2);
    pipeDown.y = center - (currentGapSize / 2) - pipeDown.height;

    // Add the pipes to the stage and array
    pipes.unshift(pipeContainer);
    stage.addChild(pipeContainer);
    pipeContainer.x -= 200;

    // Increment currentPosition
    currentPosition += PIPE_SEPARATION;
  }
};

const animatePipes = (gameSpeed) => {
  pipes.forEach((pipe) => {
    pipe.x -= gameSpeed;
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

  // Check if the bird has collided with the ground
  if (bird.y + (bird.height / 2) > OPEN_SPACE_HEIGHT) {
    // YOU LOST!!
    bird.y = OPEN_SPACE_HEIGHT - (bird.height / 2);
    bird.vy = 0;
    gameSpeed = 0;

    // Remove the fly click listener
    renderer.view.removeEventListener('click', flyClickHandler);

    // Activate the game state
    // state = lost;
  }

  // Check if the bird has collided with the ceiling
  if (bird.y - (bird.height / 2) < 0) {
    bird.y = bird.height / 2;
    bird.vy = 0;
  }
};


const animateGround = (speed) => {
  floor.x -= speed;

  if (floor.x < -24) {
    floor.x = 0;
  }
};

const prePlay = () => {
  // Animate the bird
  animateBirdStatic();

  // Animate the floor
  animateGround(gameSpeed);

  // Generate some pipes
  

  // Animate pipes
  
};

const play = () => {
  // Animate the bird
  animateBirdPlay();

  // Animate the floor
  animateGround(gameSpeed);

  // Animate the pipes
  
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
      renderer.view.removeEventListener('keypress', starter);
    }
  });

  // Add the listeners for flying action
  renderer.view.addEventListener('click', flyClickHandler);
  document.addEventListener('keypress', (event) => {
    if (event.keyCode === 32) {
      flyClickHandler();
    }
  });

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

  state = prePlaySetup;

  gameLoop();
};

document.body.appendChild(renderer.view);

loader
  .add('public/images/sprites.json')
  .load(init);
