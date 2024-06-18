var jcrop, selection

var overlay = ((active) => (state) => {
  active = typeof state === 'boolean' ? state : state === null ? active : !active
  $('.jcrop-holder')[active ? 'show' : 'hide']()
  chrome.runtime.sendMessage({message: 'active', active})
})(false)

var image = (done) => {
  var image = new Image()
  image.id = 'fake-image'
  image.src = chrome.runtime.getURL('/content/pixel.png')
  image.onload = () => {
    $('body').append(image)
    done()
  }
}

var init = (done) => {
  $('#fake-image').Jcrop({
    bgColor: 'none',
    onSelect: (e) => {
      selection = e
      capture()
    },
    onChange: (e) => {
      selection = e
    },
    onRelease: (e) => {
      setTimeout(() => {
        selection = null
      }, 100)
    }
  }, function ready () {
    jcrop = this

    $('.jcrop-hline, .jcrop-vline').css({
      backgroundImage: `url(${chrome.runtime.getURL('/vendor/Jcrop.gif')})`
    })

    if (selection) {
      jcrop.setSelect([
        selection.x, selection.y,
        selection.x2, selection.y2
      ])
    }

    done && done()
  })
}

var capture = () => {
  if (selection) {
    jcrop.release()
    setTimeout(() => {
      var _selection = selection
      chrome.runtime.sendMessage({
        message: 'capture', format: 'png', quality: 100
      }, (res) => {
        overlay(false)
        crop(res.image, _selection, devicePixelRatio, true, 'png', (image) => {
          copy(image)
          selection = null
        })
      })
    }, 50)
  }
}

var copy = async (image) => {
  const worker = await Tesseract.createWorker("eng", 1, {
    workerPath: chrome.runtime.getURL("vendor/tesseractjs/tesseract.js@v5.0.4_dist_worker.min.js"),
    corePath: chrome.runtime.getURL("vendor/tesseractjs/"),
    langPath: chrome.runtime.getURL("vendor/tesseractjs/languages/")
  });
  await worker.setParameters({
    preserve_interword_spaces: "1",
  });
  const { data: { text } } = await worker.recognize(image);
  navigator.clipboard.writeText(text)
  await worker.terminate()
}

window.addEventListener('resize', ((timeout) => () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    jcrop.destroy()
    init(() => overlay(null))
  }, 100)
})())

chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({}) // prevent re-injecting
    if (!jcrop) {
      image(() => init(() => {
        overlay()
        capture()
      }))
    }
    else {
      overlay()
      capture()
    }
  }
  return true
})
