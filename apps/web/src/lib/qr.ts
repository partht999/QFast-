import QRCode from 'qrcode';

export function generateQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 600,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  });
}

export async function downloadQrCode(value: string, filename: string): Promise<void> {
  const dataUrl = await generateQrDataUrl(value);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
