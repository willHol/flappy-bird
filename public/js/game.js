/* global PIXI */

// Aliases
const Container = PIXI.Container;
const loader = PIXI.loader;
const Sprite = PIXI.Sprite;

// Avaliable everywhere
const renderer = PIXI.autoDetectRenderer(144, 256);
const stage = new Container();
const id = loader.resources['public/images/sprites.json'].textures;

const init = () => {
  const background = new Sprite(id['day-bg.png']);

  stage.addChild(background);

  renderer.render(stage);
};

loader
  .add('public/images/sprites.json')
  .load(init);
