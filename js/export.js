// Dependency-free SVG / PNG export helpers.

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadSVG(svgText, filename) {
  downloadBlob(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export function svgToPngBlob(svgText, width, height) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width || img.naturalWidth || 1000));
        canvas.height = Math.max(1, Math.round(height || img.naturalHeight || 680));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#102017';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(png => {
          URL.revokeObjectURL(url);
          if (png) resolve(png);
          else reject(new Error('Canvas export failed'));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG could not be rasterised'));
    };
    img.src = url;
  });
}

export async function downloadPNG(svgText, filename, width, height) {
  try {
    const png = await svgToPngBlob(svgText, width, height);
    downloadBlob(png, filename);
  } catch (err) {
    console.error('PNG export failed:', err);
    downloadSVG(svgText, filename.replace(/\.png$/i, '.svg'));
  }
}
