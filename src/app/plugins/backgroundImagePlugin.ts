import { Plugin, Scale } from 'chart.js';

export const backgroundImagePlugin: Plugin<'scatter'> = {
  id: 'backgroundImagePlugin',
  beforeDraw: (chart) => {
    const ctx = chart.ctx;

    // Safely access the scales by assuming the scales are of type `Scale`
    const xScale = chart.scales['x'] as Scale | undefined;
    const yScale = chart.scales['y'] as Scale | undefined;

    if (!xScale || !yScale) {
      console.error('xScale or yScale not found');
      return;
    }

    let img: HTMLImageElement | null = (backgroundImagePlugin as any)._img;

    const drawImage = () => {
      if (img) {
        ctx.save();

        // Coordinates from your data space
        const dataA = { x: 0.023, y: 22.212 };
        const dataB = { x: -50.354, y: 0.014 };

        // Image pixel coordinates
        const pixelA = { x: 959.5, y: 186 };
        const pixelB = { x: 156, y: 539.5 };

        // Convert data coordinates to canvas pixel coordinates
        const canvasA = {
          x: xScale.getPixelForValue(dataA.x),
          y: yScale.getPixelForValue(dataA.y),
        };
        const canvasB = {
          x: xScale.getPixelForValue(dataB.x),
          y: yScale.getPixelForValue(dataB.y),
        };

        // Calculate the scaling factors
        const scaleX = (canvasB.x - canvasA.x) / (pixelB.x - pixelA.x);
        const scaleY = (canvasB.y - canvasA.y) / (pixelB.y - pixelA.y);

        // Calculate the top-left corner of the image after scaling
        const offsetX = canvasA.x - pixelA.x * scaleX;
        const offsetY = canvasA.y - pixelA.y * scaleY;

        // Draw the image with calculated scaling and positioning
        ctx.drawImage(
          img,
          offsetX, offsetY, // Position on the canvas
          img.width * scaleX, img.height * scaleY // Scale the image
        );

        ctx.restore();
      }
    };

    if (!img) {
      img = new Image();
      img.src = 'assets/track-image.png'; // Replace with the correct path to your image

      img.onload = () => {
        (backgroundImagePlugin as any)._img = img;
        drawImage(); // Draw the image after it's loaded
      };
    } else {
      drawImage(); // If the image is already loaded, just draw it
    }
  }
};
