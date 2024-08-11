chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (!req.offscreen) {
    return
  }
  switch (req.message) {
    case 'analyze':
      (async () => {
        const text = await performOCR(req.image)
        res(text)
      })()
      break
    default:
      console.warn(`Unexpected message type received: '${req.message}'.`)
  }
  return true
});

async function performOCR(image) {
  const worker = await Tesseract.createWorker("eng", 1, {
    workerPath: chrome.runtime.getURL('vendor/tesseractjs/tesseract.js@v5.0.4_dist_worker.min.js'),
    corePath: chrome.runtime.getURL('vendor/tesseractjs/'),
    langPath: chrome.runtime.getURL('vendor/tesseractjs/languages/'),
    workerBlobURL: false
  });
  await worker.setParameters({
    preserve_interword_spaces: '1',
  });
  const { data: { text } } = await worker.recognize(image);
  console.log(text)
  await worker.terminate()
  return text
}
