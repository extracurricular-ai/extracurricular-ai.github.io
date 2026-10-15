import sharp from 'sharp';

// Keep the editable SVG and a PNG that social crawlers can display.
await sharp(new URL('../src/assets/social-card.svg', import.meta.url).pathname)
  .png()
  .toFile(new URL('../src/assets/social-card.png', import.meta.url).pathname);
