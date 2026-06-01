// Loads an image and converts one selected color channel into a 2D number array.
// The level generator uses this for height maps:
// - green channel = terrain height
// - red channel = village spawn rate (still experimental, so disabled in level editor)
//
// The image is drawn to a temporary canvas because Canvas API allows reading
// exact pixel values through getImageData().
export async function loadImageChannelToArray(imagePath, channel = 0) {
  const image = await loadImage(imagePath);

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const result = [];

  for (let y = 0; y < image.height; y++) {
    result[y] = [];

    for (let x = 0; x < image.width; x++) {
      const pixel = context.getImageData(x, y, 1, 1).data;
      result[y][x] = pixel[channel];
    }
  }

  return result;
}
// Wraps browser image loading into a Promise so generation code can use await.
function loadImage(imagePath) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));

    image.src = imagePath;
  });
}
// Converts raw 0-255 pixel values into a smaller integer range.
// (for example a 0..255 height map channel can be compressed into 0..8 block levels.)
export function mapRange(array2d, layersNumber, maxNumber = 255) {
  const coefficient = layersNumber / maxNumber;
  const nextArray = [];

  for (let y = 0; y < array2d.length; y++) {
    nextArray[y] = [];

    for (let x = 0; x < array2d[y].length; x++) {
      nextArray[y][x] = Math.round(array2d[y][x] * coefficient);
    }
  }

  return nextArray;
}
// Takes a square crop from a larger 2D array.
// Each level uses a random crop from the template/noise images, which makes
// the same level preset look slightly different every time.
// (making it look like "procedural generation")
export function crop2DArray(array2d, offsetY, offsetX, size) {
  const result = [];

  for (let y = 0; y < size; y++) {
    result[y] = [];

    for (let x = 0; x < size; x++) {
      result[y][x] = array2d[y + offsetY][x + offsetX];
    }
  }

  return result;
}