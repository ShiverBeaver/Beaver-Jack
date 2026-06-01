// The texture atlas is arranged as an 8x8 grid, so one tile is 1/8 = 0.125.
export const UV_OFFSET = 0.125;
// Assigns UV coordinates for one tile from the texture atlas.
// xOffset/yOffset select which atlas tile should appear on a generated plane.
export function setUVCoordinates(xOffset, yOffset, uvArray) {
  uvArray[0] = xOffset * UV_OFFSET;
  uvArray[1] = yOffset * UV_OFFSET + UV_OFFSET;

  uvArray[2] = xOffset * UV_OFFSET + UV_OFFSET;
  uvArray[3] = yOffset * UV_OFFSET + UV_OFFSET;

  uvArray[4] = xOffset * UV_OFFSET;
  uvArray[5] = yOffset * UV_OFFSET;

  uvArray[6] = xOffset * UV_OFFSET + UV_OFFSET;
  uvArray[7] = yOffset * UV_OFFSET;
}