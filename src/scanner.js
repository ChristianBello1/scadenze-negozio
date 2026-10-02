// Scansione del codice a barre con la fotocamera.
// Su Android/Chrome usa il lettore integrato del telefono (veloce);
// altrimenti (es. iPhone) carica ZXing.

const FORMATI = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

export async function scansiona(video) {
  let stream;
  let fermato = false;
  let stopZxing = null;

  const ferma = () => {
    fermato = true;
    stopZxing?.();
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  const risultato = new Promise(async (ok, ko) => {
    try {
      let nativo = null;
      if ("BarcodeDetector" in window) {
        try {
          const supportati = await window.BarcodeDetector.getSupportedFormats();
          const f = FORMATI.filter((x) => supportati.includes(x));
          if (f.length) nativo = new window.BarcodeDetector({ formats: f });
        } catch {}
      }

      if (nativo) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
        const giro = async () => {
          if (fermato) return;
          try {
            const codici = await nativo.detect(video);
            if (codici.length) return ok(codici[0].rawValue);
          } catch {}
          setTimeout(giro, 120);
        };
        giro();
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const lettore = new BrowserMultiFormatReader();
        const ctrl = await lettore.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (res) => {
            if (res && !fermato) ok(res.getText());
          }
        );
        stopZxing = () => ctrl.stop();
      }
    } catch (e) {
      ko(e);
    }
  });

  return { risultato, ferma };
}
