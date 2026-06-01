export function getRandomInt(min, max) {
  const minValue = Math.ceil(min);
  const maxValue = Math.floor(max);
  return Math.floor(Math.random() * (maxValue - minValue) + minValue);
}

export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}