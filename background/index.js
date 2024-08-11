function inject (tab) {
  chrome.tabs.sendMessage(tab.id, {message: 'init'}, (res) => {
    if (res) {
      clearTimeout(timeout)
    }
  })

  var timeout = setTimeout(() => {
    chrome.scripting.insertCSS({files: ['vendor/jquery.Jcrop.min.css'], target: {tabId: tab.id}})
    chrome.scripting.insertCSS({files: ['content/index.css'], target: {tabId: tab.id}})

    chrome.scripting.executeScript({files: ['vendor/jquery.min.js'], target: {tabId: tab.id}})
    chrome.scripting.executeScript({files: ['vendor/jquery.Jcrop.min.js'], target: {tabId: tab.id}})
    chrome.scripting.executeScript({files: ['vendor/tesseractjs/tesseract.min.js'], target: {tabId: tab.id}})
    chrome.scripting.executeScript({files: ['content/crop.js'], target: {tabId: tab.id}})
    chrome.scripting.executeScript({files: ['content/index.js'], target: {tabId: tab.id}})
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {message: 'init'})
    }, 100)
  }, 100)
}

async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return
  chrome.action.onClicked.addListener(async () => {
    await chrome.offscreen.createDocument({
      url: 'content/offscreen.html',
      reasons: ['WORKERS'],
      justification: "Perform OCR"
    })
  })
}

chrome.action.onClicked.addListener((tab) => {
  inject(tab)
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
      inject(tab[0])
    })
  }
})

chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'capture') {
    chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
      chrome.tabs.captureVisibleTab(tab.windowId, {format: req.format, quality: req.quality}, (image) => {
        // image is base64
        res({message: 'image', image})
      })
    })
  }
  else if (req.message === 'active') {
    if (req.active) {
      chrome.action.setTitle({tabId: sender.tab.id, title: 'Extract Text'})
      chrome.action.setBadgeText({tabId: sender.tab.id, text: '◩'})
    }
    else {
      chrome.action.setTitle({tabId: sender.tab.id, title: 'Copycat'})
      chrome.action.setBadgeText({tabId: sender.tab.id, text: ''})
    }
  }
  else if (req.message === 'analyze') {
    (async () => {
      await createOffscreen()
      chrome.runtime.sendMessage({
        message: 'analyze', image: req.image, offscreen: true
      }, (text) => {
        res(text)
      })
    })()
  }
  return true
})
