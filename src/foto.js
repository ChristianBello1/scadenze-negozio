// Rimpicciolisce e comprime la foto (≈15-25 KB) per risparmiare spazio su Firebase.
export async function comprimiFoto(file, lato = 360, qualita = 0.6) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    const s = Math.min(1, lato / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    let out = c.toDataURL("image/jpeg", qualita);
    if (out.length > 60000) out = c.toDataURL("image/jpeg", 0.45);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
