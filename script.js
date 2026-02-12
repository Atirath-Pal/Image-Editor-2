let filters = {
    brightness: {
        value: 100,
        min: 0,
        max: 200,
        unit: "%"
    },
    contrast:  {
        value: 100,
        min: 0,
        max: 200,
        unit: "%"
    },
    saturation:  {
        value: 100,
        min: 0,
        max: 200,
        unit: "%"
    },
    hueRotation:  {
        value: 0,
        min: 0,
        max: 360,
        unit: "deg"
    },
    blur:  {
        value: 0,
        min: 0,
        max: 20,
        unit: "px"
    },
    grayscale: {
        value: 0,
        min: 0,
        max: 100,
        unit: "%"
    },
    sepia: {
        value: 0,
        min: 0,
        max: 100,
        unit: "%"
    },
    opacity: {
        value: 100,
        min: 0,
        max: 100,
        unit: "%"
    },
    invert: {
        value: 0,
        min: 0,
        max: 100,
        unit: "%"
    }
}

const imageCanvas = document.querySelector("#image-canvas")
const imgInput = document.querySelector("#image-input")
const canvasCtx = imageCanvas.getContext("2d")
const resetButton = document.querySelector("#reset-btn")
const downloadButton = document.querySelector("#download-btn")
const presetsContainer = document.querySelector(".presets")
const undoButton = document.querySelector("#undo-btn")
const redoButton = document.querySelector("#redo-btn")

let file = null
let image = null

const filtersContainer = document.querySelector(".filters")

// Mobile UI elements
const mobileFilterTrack = document.querySelector(".mobile-filter-track")
const mobilePresetsContainer = document.querySelector(".mobile-presets")
const mobileSliderOverlay = document.querySelector("#mobile-slider-overlay")
const mobileSliderInput = document.querySelector("#mobile-slider-input")
const mobileSliderLabel = document.querySelector("#mobile-slider-label")
const mobileSliderClose = document.querySelector("#mobile-slider-close")
const presetsToggleButton = document.querySelector("#presets-toggle")
const presetsDrawer = document.querySelector("#presets-drawer")
const presetsDrawerClose = document.querySelector("#presets-drawer-close")

// History state for undo/redo
let history = []
let historyPointer = -1
const MAX_HISTORY = 50

// Mapping from filter name to its DOM elements (desktop)
const filterElements = {}

const friendlyFilterNames = {
    brightness: "Brightness",
    contrast: "Contrast",
    saturation: "Saturation",
    hueRotation: "Hue",
    blur: "Blur",
    grayscale: "Grayscale",
    sepia: "Sepia",
    opacity: "Opacity",
    invert: "Invert"
}

let activeMobileFilter = null

function cloneFiltersState(source) {
    return JSON.parse(JSON.stringify(source))
}

function formatFilterLabel(name) {
    const displayName = friendlyFilterNames[name] || name
    const filter = filters[name]
    return `${displayName}: ${filter.value}${filter.unit}`
}

function syncDesktopFilterUI(name) {
    const entry = filterElements[name]
    if (!entry) return
    entry.input.value = filters[name].value
    entry.label.innerText = formatFilterLabel(name)
}

function syncAllDesktopFilters() {
    Object.keys(filters).forEach(name => {
        syncDesktopFilterUI(name)
    })
}

function pushHistory() {
    // Trim any "future" states if we've undone
    history = history.slice(0, historyPointer + 1)
    history.push(cloneFiltersState(filters))
    if (history.length > MAX_HISTORY) {
        history.shift()
    }
    historyPointer = history.length - 1
    updateHistoryButtons()
}

function applyFiltersFromHistoryState(state) {
    filters = cloneFiltersState(state)
    syncAllDesktopFilters()
    applyFilters()
}

function updateHistoryButtons() {
    if (!undoButton || !redoButton) return
    undoButton.disabled = historyPointer <= 0
    redoButton.disabled = historyPointer === -1 || historyPointer >= history.length - 1
}

function createFilterElement(name, unit="%", value , min , max) {

    const div = document.createElement("div")
    div.classList.add("filter")

    const input = document.createElement("input")
    input.type = "range"
    input.min = min
    input.max = max
    input.value = value
    input.id = name

    const p = document.createElement("p")
    p.innerText = formatFilterLabel(name)

    div.appendChild(p)
    div.appendChild(input)

    input.addEventListener("input", (event) => {
        // console.log(input.value)
        // console.log(filters)
        filters[name].value = Number(input.value)
        // console.log(name, filters[name])
        applyFilters()
        p.innerText = formatFilterLabel(name)

        // Keep mobile slider in sync if it's editing the same filter
        if (activeMobileFilter === name && mobileSliderInput) {
            mobileSliderInput.value = filters[name].value
            mobileSliderLabel.innerText = formatFilterLabel(name)
        }
    })

    // Save history only when the user releases the slider
    input.addEventListener("change", () => {
        pushHistory()
    })

    filterElements[name] = {
        input,
        label: p
    }

    return div
}

function createFilters(){
    Object.keys(filters).forEach(key => {       
        const filterElement = createFilterElement(key, filters[key].unit , filters[key].value , filters[key].min , filters[key].max)
        filtersContainer.appendChild(filterElement)
    })
}
createFilters()

// Create mobile filter buttons (names only; sliders appear in overlay)
function createMobileFilters(){
    if (!mobileFilterTrack) return
    mobileFilterTrack.innerHTML = ""
    Object.keys(filters).forEach(name => {
        const btn = document.createElement("button")
        btn.classList.add("btn","mobile-filter-btn")
        btn.dataset.filter = name
        btn.innerText = friendlyFilterNames[name] || name
        btn.addEventListener("click", () => {
            openMobileSlider(name)
        })
        mobileFilterTrack.appendChild(btn)
    })
}
createMobileFilters()

imgInput.addEventListener("change", (event) => {
    const file = event.target.files[0]
    const imagePlaceholder = document.querySelector(".placeholder")
    imageCanvas.style.display = "block"
    imagePlaceholder.style.display = "none"
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
        image = img
        imageCanvas.width = img.width
        imageCanvas.height = img.height
        canvasCtx.drawImage(img,0,0)
        // Initial history state with default filters once an image is loaded
        if (history.length === 0) {
            pushHistory()
        }
    }
})

// function applyBlur(){
//     canvasCtx.filter = `blur(5px)`
//     canvasCtx.drawImage(image,0,0)
// }

function applyFilters(){
    canvasCtx.clearRect( 0 , 0 , imageCanvas.width , imageCanvas.height )
    canvasCtx.filter = 
    `
    brightness(${filters.brightness.value}${filters.brightness.unit})
    contrast(${filters.contrast.value}${filters.contrast.unit})
    saturate(${filters.saturation.value}${filters.saturation.unit})
    hue-rotate(${filters.hueRotation.value}${filters.hueRotation.unit})
    blur(${filters.blur.value}${filters.blur.unit})
    grayscale(${filters.grayscale.value}${filters.grayscale.unit})
    sepia(${filters.sepia.value}${filters.sepia.unit})
    opacity(${filters.opacity.value}${filters.opacity.unit})
    invert(${filters.invert.value}${filters.invert.unit})
    
    `
    canvasCtx.drawImage(image,0,0)
}

resetButton.addEventListener("click", () => {
    filters = {
        brightness: {
            value: 100,
            min: 0,
            max: 200,
            unit: "%"
        },
        contrast:  {
            value: 100,
            min: 0,
            max: 200,
            unit: "%"
        },
        saturation:  {
            value: 100,
            min: 0,
            max: 200,
            unit: "%"
        },
        hueRotation:  {
            value: 0,
            min: 0,
            max: 360,
            unit: "deg"
        },
        blur:  {
            value: 0,
            min: 0,
            max: 20,
            unit: "px"
        },
        grayscale: {
            value: 0,
            min: 0,
            max: 100,
            unit: "%"
        },
        sepia: {
            value: 0,
            min: 0,
            max: 100,
            unit: "%"
        },
        opacity: {
            value: 100,
            min: 0,
            max: 100,
            unit: "%"
        },
        invert: {
            value: 0,
            min: 0,
            max: 100,
            unit: "%"
        }
    }
    syncAllDesktopFilters()
    applyFilters()
    pushHistory()
})

downloadButton.addEventListener("click" , () => {
    const link = document.createElement("a")
    link.download = "edited-image.png"
    link.href = imageCanvas.toDataURL()
    link.click()
})

const presets = {

  /* =========================
     CLASSIC / CREATIVE
  ========================== */

  vintage: {
    brightness: 110, contrast: 90, saturation: 130, hueRotation: 0,
    blur: 0, grayscale: 0, sepia: 30, opacity: 100, invert: 0
  },

  noir: {
    brightness: 90, contrast: 160, saturation: 0, hueRotation: 0,
    blur: 0, grayscale: 100, sepia: 0, opacity: 100, invert: 0
  },

  dramaticNoir: {
    brightness: 80, contrast: 180, saturation: 0, hueRotation: 0,
    blur: 0, grayscale: 100, sepia: 0, opacity: 100, invert: 0
  },

  washedOut: {
    brightness: 115, contrast: 80, saturation: 80, hueRotation: 0,
    blur: 0, grayscale: 0, sepia: 10, opacity: 100, invert: 0
  },

  dreamy: {
    brightness: 115, contrast: 85, saturation: 110, hueRotation: 0,
    blur: 1.5, grayscale: 0, sepia: 20, opacity: 100, invert: 0
  },

  xray: {
    brightness: 120, contrast: 120, saturation: 0, hueRotation: 0,
    blur: 0, grayscale: 100, sepia: 0, opacity: 100, invert: 100
  },

  cyberpunk: {
    brightness: 110, contrast: 130, saturation: 160, hueRotation: 160,
    blur: 0, grayscale: 0, sepia: 0, opacity: 100, invert: 0
  },

  nightVision: {
    brightness: 120, contrast: 140, saturation: 60, hueRotation: 90,
    blur: 0, grayscale: 0, sepia: 0, opacity: 100, invert: 0
  },

  /* =========================
     INSTAGRAM STYLE
  ========================== */

  sunsetGlow: {
    brightness: 110, contrast: 105, saturation: 135, hueRotation: 350,
    blur: 0, grayscale: 0, sepia: 15, opacity: 100, invert: 0
  },

  goldenHour: {
    brightness: 115, contrast: 95, saturation: 125, hueRotation: 340,
    blur: 0, grayscale: 0, sepia: 25, opacity: 100, invert: 0
  },

  softPortrait: {
    brightness: 108, contrast: 90, saturation: 105, hueRotation: 0,
    blur: 1, grayscale: 0, sepia: 10, opacity: 100, invert: 0
  },

  vibrantPop: {
    brightness: 105, contrast: 120, saturation: 160, hueRotation: 0,
    blur: 0, grayscale: 0, sepia: 0, opacity: 100, invert: 0
  },

  fadedFeed: {
    brightness: 110, contrast: 80, saturation: 85, hueRotation: 0,
    blur: 0, grayscale: 0, sepia: 20, opacity: 100, invert: 0
  },

  coolInfluencer: {
    brightness: 105, contrast: 110, saturation: 95, hueRotation: 210,
    blur: 0, grayscale: 0, sepia: 0, opacity: 100, invert: 0
  },

  /* =========================
     CINEMATIC LUT STYLE
  ========================== */

  tealOrange: {
    brightness: 105, contrast: 130, saturation: 115, hueRotation: 180,
    blur: 0, grayscale: 0, sepia: 5, opacity: 100, invert: 0
  },

  blockbuster: {
    brightness: 95, contrast: 150, saturation: 110, hueRotation: 10,
    blur: 0, grayscale: 0, sepia: 10, opacity: 100, invert: 0
  },

  darkCinema: {
    brightness: 85, contrast: 160, saturation: 90, hueRotation: 0,
    blur: 0, grayscale: 0, sepia: 5, opacity: 100, invert: 0
  },

  moodyBlue: {
    brightness: 90, contrast: 140, saturation: 85, hueRotation: 210,
    blur: 0, grayscale: 0, sepia: 0, opacity: 100, invert: 0
  },

  warmDrama: {
    brightness: 100, contrast: 140, saturation: 120, hueRotation: 350,
    blur: 0, grayscale: 0, sepia: 20, opacity: 100, invert: 0
  },

  indieFilm: {
    brightness: 105, contrast: 90, saturation: 95, hueRotation: 15,
    blur: 0, grayscale: 10, sepia: 15, opacity: 100, invert: 0
  }

};

function applyPreset(presetName){
    const preset = presets[presetName]
    Object.keys(preset).forEach(filterName => {
        filters[filterName].value = preset[filterName]
        syncDesktopFilterUI(filterName)
    })
    applyFilters()
    pushHistory()
}

Object.keys(presets).forEach(presetName => {
    const presetButton = document.createElement("button")
    presetButton.classList.add("btn")
    presetButton.innerText = presetName
    presetsContainer.appendChild(presetButton)

    presetButton.addEventListener("click" , ()=>{
        applyPreset(presetName)
    })

    // Mobile preset buttons (in right-side drawer)
    if (mobilePresetsContainer) {
        const mobilePresetButton = document.createElement("button")
        mobilePresetButton.classList.add("btn")
        mobilePresetButton.innerText = presetName
        mobilePresetsContainer.appendChild(mobilePresetButton)
        mobilePresetButton.addEventListener("click", () => {
            applyPreset(presetName)
        })
    }
})

// Undo / Redo handlers
if (undoButton) {
    undoButton.addEventListener("click", () => {
        if (historyPointer <= 0) return
        historyPointer -= 1
        applyFiltersFromHistoryState(history[historyPointer])
        updateHistoryButtons()
    })
}

if (redoButton) {
    redoButton.addEventListener("click", () => {
        if (historyPointer === -1 || historyPointer >= history.length - 1) return
        historyPointer += 1
        applyFiltersFromHistoryState(history[historyPointer])
        updateHistoryButtons()
    })
}

// Mobile contextual slider for filters
function openMobileSlider(name){
    if (!mobileSliderOverlay || !mobileSliderInput || !mobileSliderLabel) return
    activeMobileFilter = name
    const filter = filters[name]
    mobileSliderInput.min = filter.min
    mobileSliderInput.max = filter.max
    mobileSliderInput.value = filter.value
    mobileSliderLabel.innerText = formatFilterLabel(name)
    mobileSliderOverlay.classList.add("open")
    // Highlight active filter button in bar
    if (mobileFilterTrack) {
        mobileFilterTrack.querySelectorAll(".mobile-filter-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.filter === name)
        })
    }
}

function closeMobileSlider(){
    if (!mobileSliderOverlay) return
    activeMobileFilter = null
    mobileSliderOverlay.classList.remove("open")
    if (mobileFilterTrack) {
        mobileFilterTrack.querySelectorAll(".mobile-filter-btn").forEach(btn => {
            btn.classList.remove("active")
        })
    }
}

if (mobileSliderInput) {
    mobileSliderInput.addEventListener("input", () => {
        if (!activeMobileFilter) return
        filters[activeMobileFilter].value = Number(mobileSliderInput.value)
        applyFilters()
        syncDesktopFilterUI(activeMobileFilter)
        mobileSliderLabel.innerText = formatFilterLabel(activeMobileFilter)
    })

    mobileSliderInput.addEventListener("change", () => {
        if (!activeMobileFilter) return
        pushHistory()
    })
}

if (mobileSliderClose) {
    mobileSliderClose.addEventListener("click", () => {
        closeMobileSlider()
    })
}

// Presets drawer toggle
if (presetsToggleButton && presetsDrawer) {
    presetsToggleButton.addEventListener("click", () => {
        presetsDrawer.classList.toggle("open")
    })
}

if (presetsDrawerClose && presetsDrawer) {
    presetsDrawerClose.addEventListener("click", () => {
        presetsDrawer.classList.remove("open")
    })
}

// Close slider and presets drawer when tapping outside
document.addEventListener("click", (event) => {
    const sliderOpen = mobileSliderOverlay && mobileSliderOverlay.classList.contains("open")
    const drawerOpen = presetsDrawer && presetsDrawer.classList.contains("open")

    // Nothing to do if neither UI element is open
    if (!sliderOpen && !drawerOpen) return

    const overlayClicked = mobileSliderOverlay?.contains(event.target)
    const barClicked = document.querySelector("#mobile-filter-bar")?.contains(event.target)
    const drawerClicked = presetsDrawer?.contains(event.target)
    const toggleClicked = presetsToggleButton?.contains(event.target)

    // Click outside slider-related areas closes the slider overlay
    if (sliderOpen && !overlayClicked && !barClicked && !drawerClicked && !toggleClicked) {
        closeMobileSlider()
    }

    // Click outside drawer and its toggle closes the presets drawer
    if (drawerOpen && !drawerClicked && !toggleClicked) {
        presetsDrawer.classList.remove("open")
    }
}, true)

// Initialize undo/redo button disabled state
updateHistoryButtons()
