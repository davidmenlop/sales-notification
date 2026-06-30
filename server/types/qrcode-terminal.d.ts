declare module 'qrcode-terminal' {
  interface QRCodeTerminal {
    generate(text: string, options?: { small?: boolean }): void;
  }
  const qrcode: QRCodeTerminal;
  export default qrcode;
}
