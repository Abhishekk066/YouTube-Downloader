function generateSecretKey(length) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charArray = [];

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    charArray.push(charset[randomIndex]);
  }

  return charArray.join("");
}

const secretKey = generateSecretKey(32);
let previousVideoUrl = null;
let activeHls = null;

const platformMocks = {
  "https://www.youtube.com/watch?v=aqz-KE-bpKQ": {
    thumbnailUrl: "https://img.youtube.com/vi/aqz-KE-bpKQ/maxresdefault.jpg",
    videoTitle: "Big Buck Bunny (YouTube Sample)",
    fileName: "Yt_Converter - Big Buck Bunny (YouTube Sample)",
    channelName: "Blender Foundation",
    videoTimestamp: "10:34",
    duration: 634,
    qualityLabelMp3: [320, 256, 192, 128],
    contentLengthMp3Sizes: ["10.1 MB", "8.1 MB", "6.1 MB", "4.0 MB"],
    qualityLabelMp4: ["1080p", "720p", "480p", "360p"],
    contentLengthMp4Sizes: ["120.4 MB", "75.2 MB", "45.1 MB", "25.0 MB"],
    qualityLabelWebm: ["1080p", "720p"],
    contentLengthWebm: ["110.2 MB", "68.5 MB"],
    discription: "A large and lovable rabbit deals with bullying forest creatures."
  },
  "https://www.instagram.com/p/CG4961zjvW-/": {
    thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600",
    videoTitle: "Nature & Travel Moments (Instagram Sample)",
    fileName: "Yt_Converter - Nature & Travel Moments (Instagram Sample)",
    channelName: "Travel Explorer",
    videoTimestamp: "10:34",
    duration: 634,
    qualityLabelMp3: [128],
    contentLengthMp3Sizes: ["4.8 MB"],
    qualityLabelMp4: ["720p", "480p"],
    contentLengthMp4Sizes: ["75.2 MB", "45.1 MB"],
    qualityLabelWebm: [],
    contentLengthWebm: [],
    discription: "Stunning nature shots."
  },
  "https://www.tiktok.com/@mrbeast/video/7376378434400783658": {
    thumbnailUrl: "https://images.unsplash.com/photo-1611605698335-8b15d27e03f3?w=600",
    videoTitle: "Extreme Fun & Challenges (TikTok Sample)",
    fileName: "Yt_Converter - Extreme Fun & Challenges (TikTok Sample)",
    channelName: "MrBeast",
    videoTimestamp: "10:34",
    duration: 634,
    qualityLabelMp3: [128],
    contentLengthMp3Sizes: ["4.8 MB"],
    qualityLabelMp4: ["720p", "540p"],
    contentLengthMp4Sizes: ["75.2 MB", "45.1 MB"],
    qualityLabelWebm: [],
    contentLengthWebm: [],
    discription: "Tiktok short challenge."
  },
  "https://twitter.com/NASA/status/1780282103561339174": {
    thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
    videoTitle: "Space Station Flyover (Twitter Sample)",
    fileName: "Yt_Converter - Space Station Flyover (Twitter Sample)",
    channelName: "NASA",
    videoTimestamp: "10:34",
    duration: 634,
    qualityLabelMp3: [128],
    contentLengthMp3Sizes: ["4.8 MB"],
    qualityLabelMp4: ["720p", "360p"],
    contentLengthMp4Sizes: ["75.2 MB", "45.1 MB"],
    qualityLabelWebm: [],
    contentLengthWebm: [],
    discription: "Space station views."
  },
  "https://www.facebook.com/watch/?v=10158221590472429": {
    thumbnailUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600",
    videoTitle: "Global Connectivity Highlights (Facebook Sample)",
    fileName: "Yt_Converter - Global Connectivity Highlights (Facebook Sample)",
    channelName: "Meta",
    videoTimestamp: "10:34",
    duration: 634,
    qualityLabelMp3: [128],
    contentLengthMp3Sizes: ["4.8 MB"],
    qualityLabelMp4: ["720p", "460p"],
    contentLengthMp4Sizes: ["75.2 MB", "45.1 MB"],
    qualityLabelWebm: [],
    contentLengthWebm: [],
    discription: "Facebook connectivity summary."
  }
};

const restoreThumbContainer = () => {
  const downloaderCon = document.getElementById("downloader");
  if (downloaderCon) {
    const thumbContainer = downloaderCon.querySelector(".thumb");
    if (thumbContainer) {
      thumbContainer.innerHTML = `
        <div class="load" id="loader3" style="display: none;"></div>
        <img
          height="100%"
          width="100%"
          id="thumbnail"
          alt="Video Thumbnail"
          style="display: none;"
        />
      `;
    }
  }
};

const restoreSbContainer = () => {
  const downloaderCon = document.getElementById("downloader");
  if (downloaderCon) {
    const sbContainer = downloaderCon.querySelector(".sb");
    if (sbContainer) {
      sbContainer.innerHTML = "";
    }
  }
};

const cleanupActivePlayer = () => {
  document.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
      video.src = "";
      video.load();
    } catch (e) {}
  });
  if (activeHls) {
    try {
      activeHls.destroy();
    } catch (e) {}
    activeHls = null;
  }
  restoreThumbContainer();
  restoreSbContainer();
};

function buildVideoPlayer(containerEl, videoLink, durationsInSeconds, videoDurationFull, titleText, ownerNameText, isInline = false, posterUrl = "") {
  containerEl.innerHTML = "";

  const videoContainer = document.createElement("div");
  videoContainer.className = "video-container";
  containerEl.appendChild(videoContainer);

  const bufferingIndicator = document.createElement("div");
  bufferingIndicator.className = "buffering-indicator";
  bufferingIndicator.id = "buffering-indicator";
  bufferingIndicator.innerText = "";
  videoContainer.appendChild(bufferingIndicator);

  const centerIcon = document.createElement("div");
  centerIcon.className = "vid-center-icon";
  videoContainer.appendChild(centerIcon);

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.id = "controls";
  videoContainer.appendChild(controls);

  const playPauseButton = document.createElement("button");
  playPauseButton.id = "play-pause";
  playPauseButton.className = "control-button";
  playPauseButton.innerHTML = "<i class='fa-solid fa-play'></i>";
  controls.appendChild(playPauseButton);

  const video = document.createElement("video");
  video.id = "video";
  video.volume = 0.5;
  video.autoplay = false;
  if (posterUrl) {
    video.poster = posterUrl;
  }

  let seekOffset = 0;
  let currentQuality = "360p";

  function loadStream(t, quality) {
    const wasPlaying = !video.paused;
    if (quality != null) currentQuality = quality;
    bufferingIndicator.style.display = "block";

    const manifestUrl = `/hls/manifest?url=${encodeURIComponent(videoLink)}&q=${currentQuality}`;

    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      seekOffset = 0;
      if (activeHls) {
        activeHls.destroy();
      }
      activeHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startFragPrefetch: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 3,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 15000,
            maxLoadTimeMs: 120000,
            timeoutRetry: {
              maxNumRetry: 4,
              retryDelayMs: 0,
              maxRetryDelayMs: 0,
            },
            errorRetry: {
              maxNumRetry: 6,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
            },
          },
        },
      });
      activeHls.loadSource(manifestUrl);
      activeHls.attachMedia(video);
      activeHls.on(Hls.Events.MANIFEST_PARSED, function () {
        if (t > 0) {
          video.currentTime = t;
        }
        if (wasPlaying) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err.name !== "AbortError") {
                bufferingIndicator.style.display = "none";
                videoContainer.addEventListener(
                  "click",
                  () => {
                    video.play().catch(() => {});
                  },
                  { once: true },
                );
              }
            });
          }
        } else {
          bufferingIndicator.style.display = "none";
        }
      });
      activeHls.on(Hls.Events.FRAG_BUFFERED, () => {
        bufferingIndicator.style.display = "none";
      });
      activeHls.on(Hls.Events.ERROR, function (_event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              activeHls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              activeHls.recoverMediaError();
              break;
            default:
              activeHls.destroy();
              activeHls = null;
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      seekOffset = 0;
      video.src = manifestUrl;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (t > 0) {
            video.currentTime = t;
          }
          if (wasPlaying) {
            video.play().catch(() => {});
          }
        },
        { once: true },
      );
    } else {
      seekOffset = t;
      video.src = `/preview/stream?url=${encodeURIComponent(videoLink)}&q=${currentQuality}&t=${t}`;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (wasPlaying) {
            video.play().catch(() => {});
          }
        },
        { once: true },
      );
    }
  }

  video.addEventListener("play", () => {
    playPauseButton.innerHTML = "<i class='fa-solid fa-pause'></i>";
    video.style.display = "block";
  });

  videoContainer.appendChild(video);
  loadStream(0, "360p");

  if (!isInline) {
    const vidInfo = document.createElement("div");
    vidInfo.className = "vid-info";
    vidInfo.innerHTML = `
      <div class="vid-info-title">${titleText || ""}</div>
      <div class="vid-info-meta">${ownerNameText || ""}<span class="vid-info-dot">·</span>${videoDurationFull}</div>`;
    containerEl.appendChild(vidInfo);
  }

  const timeDisplay = document.createElement("span");
  timeDisplay.id = "time-display";
  timeDisplay.innerText = `0:00 / 0:00`;
  controls.appendChild(timeDisplay);

  const seekBar = document.createElement("input");
  seekBar.type = "range";
  seekBar.id = "seek-bar";
  seekBar.value = 0;
  controls.appendChild(seekBar);

  const seekTooltip = document.createElement("div");
  seekTooltip.className = "seek-tooltip";
  seekTooltip.id = "seek-tooltip";
  seekTooltip.innerHTML = `
    <div class="seek-tooltip-img-box" id="seek-tooltip-img-box">
      <img id="seek-tooltip-image" src="" alt="" style="display: none;" />
    </div>
    <div id="seek-tooltip-time">0:00</div>
  `;
  videoContainer.appendChild(seekTooltip);

  const muteButton = document.createElement("button");
  muteButton.id = "mute";
  muteButton.className = "control-button";
  muteButton.innerHTML = "<i class='fa-solid fa-volume-high'></i>";
  controls.appendChild(muteButton);

  const volumeBar = document.createElement("input");
  volumeBar.type = "range";
  volumeBar.id = "volume-bar";
  volumeBar.value = 1;
  volumeBar.max = 1;
  volumeBar.step = 0.1;
  controls.appendChild(volumeBar);

  const qualityButton = document.createElement("button");
  qualityButton.id = "quality";
  qualityButton.className = "control-button";
  qualityButton.innerHTML =
    "<i class='fa-solid fa-ellipsis-vertical'></i>";
  controls.appendChild(qualityButton);

  const qualityMenu = document.createElement("div");
  qualityMenu.className = "quality-menu";
  qualityMenu.id = "quality-menu";
  controls.appendChild(qualityMenu);

  const qualityOptions = ["720p", "480p", "360p", "240p", "144p"];

  qualityOptions.forEach((q) => {
    const btnOpt = document.createElement("button");
    btnOpt.innerText = q;
    btnOpt.dataset.quality = q;
    if (q === currentQuality) btnOpt.classList.add("active");
    qualityMenu.appendChild(btnOpt);
  });

  let hideControlsTimeout;
  let playflag = true;
  const showControls = () => {
    controls.classList.add("show");
    clearTimeout(hideControlsTimeout);
    playflag = true;
    videoContainer.addEventListener("click", onclickOnVideoPlay);
    hideControlsTimeout = setTimeout(
      () => controls.classList.remove("show"),
      5000,
    );
  };

  function pulseCenterIcon(icon) {
    centerIcon.innerHTML = `<i class="fa-solid fa-${icon}"></i>`;
    centerIcon.classList.remove("vid-center-active");
    void centerIcon.offsetWidth;
    centerIcon.classList.add("vid-center-active");
  }

  const togglePlayPause = () => {
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      playPauseButton.innerHTML = "<i class='fa-solid fa-pause'></i>";
      pulseCenterIcon("play");
    } else {
      video.pause();
      playPauseButton.innerHTML = "<i class='fa-solid fa-play'></i>";
      pulseCenterIcon("pause");
    }
  };

  let isDraggingSeekBar = false;

  function isTimeBuffered(vid, time) {
    if (!vid || !vid.buffered) return false;
    for (let i = 0; i < vid.buffered.length; i++) {
      if (
        time >= vid.buffered.start(i) &&
        time <= vid.buffered.end(i) - 0.2
      ) {
        return true;
      }
    }
    return false;
  }

  const updateSeekBarVisuals = (absTime) => {
    const playedPct = Math.min(100, (100 / durationsInSeconds) * absTime);

    let bufferedPct = playedPct;
    if (video.buffered.length > 0) {
      const localTime = absTime - seekOffset;
      for (let i = 0; i < video.buffered.length; i++) {
        if (
          video.buffered.start(i) <= localTime &&
          localTime <= video.buffered.end(i)
        ) {
          const bufAbsEnd = seekOffset + video.buffered.end(i);
          bufferedPct = Math.min(
            100,
            (100 / durationsInSeconds) * bufAbsEnd,
          );
          break;
        }
      }
    }

    seekBar.value = playedPct;
    seekBar.style.background = `linear-gradient(to right,
      #f00 0%, #f00 ${playedPct}%,
      rgba(255,255,255,0.35) ${playedPct}%, rgba(255,255,255,0.35) ${bufferedPct}%,
      rgba(255,255,255,0.15) ${bufferedPct}%, rgba(255,255,255,0.15) 100%
    )`;
    seekBar.style.setProperty("--seek-pct", `${playedPct}%`);

    const minutes = Math.floor(absTime / 60);
    const seconds = Math.floor(absTime % 60);
    timeDisplay.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds} / ${videoDurationFull}`;
  };

  const updateSeekBar = () => {
    if (isDraggingSeekBar) return;
    const absTime = seekOffset + video.currentTime;
    updateSeekBarVisuals(absTime);
  };

  const changeVolume = () => {
    video.volume = volumeBar.value;
    const value = volumeBar.value * 100;
    volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${value}%, rgba(255, 255, 255, 0.25) ${value}%, rgba(255, 255, 255, 0.25) 100%)`;
    muteButton.innerHTML =
      value > 65
        ? `<i class="fa-solid fa-volume-high"></i>`
        : value == 0
          ? `<i class="fa-solid fa-volume-xmark"></i>`
          : `<i class="fa-solid fa-volume-low"></i>`;
  };
  changeVolume();

  const toggleMute = () => {
    video.muted = !video.muted;
    muteButton.innerHTML = video.muted
      ? `<i class="fa-solid fa-volume-xmark"></i>`
      : `<i class="fa-solid fa-volume-high"></i>`;
  };

  const toggleQualityMenu = () => {
    qualityMenu.style.display =
      qualityMenu.style.display === "block" ? "none" : "block";
  };

  const changeQuality = (e) => {
    const quality = e.target.dataset.quality;
    if (!quality) return;
    qualityMenu
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    const currentAbsTime = seekOffset + video.currentTime;
    loadStream(currentAbsTime, quality);
    qualityMenu.style.display = "none";
  };

  function onclickOnVideoPlay() {
    if (!playflag) {
      return;
    }
    showControls();
    togglePlayPause();
  }
  videoContainer.addEventListener("mousemove", showControls);
  videoContainer.addEventListener("click", onclickOnVideoPlay);

  playPauseButton.addEventListener("click", togglePlayPause);
  video.addEventListener("timeupdate", updateSeekBar);

  seekBar.addEventListener("mousedown", () => {
    isDraggingSeekBar = true;
  });
  seekBar.addEventListener(
    "touchstart",
    () => {
      isDraggingSeekBar = true;
    },
    { passive: true },
  );

  const handleSeekInput = () => {
    const targetTime = (seekBar.value / 100) * durationsInSeconds;
    updateSeekBarVisuals(targetTime);
  };

  seekBar.addEventListener("input", handleSeekInput);

  const handleSeekChange = () => {
    isDraggingSeekBar = false;
    const targetTime = (seekBar.value / 100) * durationsInSeconds;
    const localTargetTime = targetTime - seekOffset;

    if (activeHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.currentTime = localTargetTime;
    } else {
      if (
        localTargetTime >= 0 &&
        isTimeBuffered(video, localTargetTime)
      ) {
        video.currentTime = localTargetTime;
      } else {
        loadStream(targetTime, null);
      }
    }
  };

  seekBar.addEventListener("change", handleSeekChange);

  const FRAME_CACHE_MAX = 30;
  const frameCache = new Map();
  let frameAbortCtrl = null;
  let hoverTimeout;
  let lastShownT = -1;
  let tooltipWidth = 160;

  const imgElement = seekTooltip.querySelector("#seek-tooltip-image");
  const imgBox = seekTooltip.querySelector("#seek-tooltip-img-box");

  function evictFrameCache() {
    while (frameCache.size > FRAME_CACHE_MAX) {
      const oldestKey = frameCache.keys().next().value;
      URL.revokeObjectURL(frameCache.get(oldestKey));
      frameCache.delete(oldestKey);
    }
  }

  function showFrame(objectURL) {
    imgElement.src = objectURL;
    imgElement.onload = () => {
      imgElement.style.display = "block";
      imgBox.classList.add("has-frame");
      imgBox.classList.remove("loading");
    };
    imgElement.onerror = () => {};
  }

  function prefetch(t) {
    if (t < 0 || frameCache.has(t)) return;
    fetch(
      `/preview/frame?url=${encodeURIComponent(videoLink)}&q=${currentQuality}&t=${t}`,
    )
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || frameCache.has(t)) return;
        frameCache.set(t, URL.createObjectURL(blob));
        evictFrameCache();
      })
      .catch(() => {});
  }

  const handleSeekBarMouseMove = (e) => {
    if (isNaN(durationsInSeconds) || durationsInSeconds <= 0) return;

    const rect = seekBar.getBoundingClientRect();
    const offsetX = Math.max(
      0,
      Math.min(e.clientX - rect.left, rect.width),
    );
    const pct = offsetX / rect.width;
    const targetTime = pct * durationsInSeconds;
    const tRounded = Math.round(targetTime);

    const containerRect = videoContainer.getBoundingClientRect();
    const halfW = tooltipWidth / 2;
    const rawX = rect.left - containerRect.left + offsetX;
    const clampedX = Math.max(
      halfW,
      Math.min(containerRect.width - halfW, rawX),
    );
    seekTooltip.style.left = `${clampedX}px`;
    seekTooltip.classList.add("show");

    const m = Math.floor(targetTime / 60);
    const s = Math.floor(targetTime % 60);
    seekTooltip.querySelector("#seek-tooltip-time").innerText =
      `${m}:${s < 10 ? "0" : ""}${s}`;

    if (tRounded === lastShownT) return;

    if (frameCache.has(tRounded)) {
      clearTimeout(hoverTimeout);
      if (frameAbortCtrl) {
        frameAbortCtrl.abort();
        frameAbortCtrl = null;
      }
      showFrame(frameCache.get(tRounded));
      lastShownT = tRounded;
      prefetch(tRounded - 1);
      prefetch(tRounded + 1);
      return;
    }

    imgBox.classList.add("loading");
    if (!imgElement.src || lastShownT === -1) {
      imgElement.style.display = "none";
    }

    if (frameAbortCtrl) {
      frameAbortCtrl.abort();
      frameAbortCtrl = null;
    }
    clearTimeout(hoverTimeout);

    hoverTimeout = setTimeout(async () => {
      const ctrl = new AbortController();
      frameAbortCtrl = ctrl;

      try {
        const r = await fetch(
          `/preview/frame?url=${encodeURIComponent(videoLink)}&q=${currentQuality}&t=${tRounded}`,
          { signal: ctrl.signal },
        );
        if (ctrl.signal.aborted) return;
        if (!r.ok) {
          imgBox.classList.remove("loading");
          return;
        }
        const blob = await r.blob();
        if (ctrl.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        frameCache.set(tRounded, url);
        evictFrameCache();
        lastShownT = tRounded;
        showFrame(url);
        prefetch(tRounded - 1);
        prefetch(Math.min(Math.round(durationsInSeconds), tRounded + 1));
      } catch (err) {
        if (err.name === "AbortError") return;
        imgBox.classList.remove("loading");
      }
    }, 50);
  };

  const handleSeekBarMouseLeave = () => {
    clearTimeout(hoverTimeout);
    if (frameAbortCtrl) {
      frameAbortCtrl.abort();
      frameAbortCtrl = null;
    }
    seekTooltip.classList.remove("show");
    imgBox.classList.add("loading");
    imgBox.classList.remove("has-frame");
    imgElement.style.display = "none";
    imgElement.src = "";
    lastShownT = -1;
  };

  seekBar.addEventListener("mousemove", handleSeekBarMouseMove);
  seekBar.addEventListener("mouseleave", handleSeekBarMouseLeave);

  const stopDrag = () => {
    isDraggingSeekBar = false;
  };
  seekBar.addEventListener("mouseup", stopDrag);
  seekBar.addEventListener("touchend", stopDrag, { passive: true });

  controls.addEventListener("click", () => {
    playflag = false;
    videoContainer.removeEventListener("click", onclickOnVideoPlay);
  });
  controls.addEventListener("mouseover", () => {
    playflag = false;
    videoContainer.removeEventListener("click", onclickOnVideoPlay);
  });

  muteButton.addEventListener("click", toggleMute);
  volumeBar.addEventListener("input", changeVolume);
  qualityButton.addEventListener("click", toggleQualityMenu);
  qualityMenu.addEventListener("click", changeQuality);

  const showLoader = () => (bufferingIndicator.style.display = "block");
  const hideLoader = () => (bufferingIndicator.style.display = "none");

  video.addEventListener("waiting", showLoader);
  video.addEventListener("stalled", showLoader);
  video.addEventListener("seeking", showLoader);
  video.addEventListener("playing", hideLoader);
  video.addEventListener("canplay", hideLoader);
  video.addEventListener("seeked", hideLoader);
}

try {
  const storedUrl = sessionStorage.getItem("videoUrl");
  if (storedUrl) {
    previousVideoUrl = JSON.parse(storedUrl);
  }
} catch (e) {}
let currentDetectedUrl = null;

function decryptResponse(encryptedData, key) {
  const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
  const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
  return decryptedData;
}

function showToast(msg, type = "info", duration = 3500) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const iconMap = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    info: "fa-circle-info",
    warning: "fa-triangle-exclamation",
  };
  const icon = iconMap[type] || iconMap.info;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icon} toast-icon"></i><span class="toast-message">${msg}</span><button class="toast-close" aria-label="Dismiss">&times;</button><div class="toast-progress"></div>`;
  container.appendChild(toast);

  requestAnimationFrame(() =>
    requestAnimationFrame(() => toast.classList.add("toast-visible")),
  );

  const progress = toast.querySelector(".toast-progress");
  progress.style.transition = `transform ${duration}ms linear`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => (progress.style.transform = "scaleX(0)")),
  );

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hidden");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
  };

  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  const tid = setTimeout(dismiss, duration);
  toast.addEventListener("mouseenter", () => clearTimeout(tid));
  toast.addEventListener("mouseleave", () => setTimeout(dismiss, 800));
}

window.addEventListener("DOMContentLoaded", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(readClipboard, 800);
  try {
    initBackgroundParticles();
  } catch (e) {}
});

window.scrollTo({
  top: 0,
  behavior: "smooth",
});

const linkReg =
  /^(https?:\/\/)?(www\.)?(youtube\.com|m\.youtube\.com|youtu\.be)\/.+$/;
const playlistReg =
  /^(https?:\/\/)?(www\.)?(m\.youtube\.com|youtube\.com)\/playlist\?.+$/;
const channelReg =
  /^(https?:\/\/)?(www\.)?(m\.youtube\.com\/|youtube\.com\/)(@([a-zA-Z0-9_-]+))|(@([a-zA-Z0-9_-]+)\/channels)|(@([a-zA-Z0-9_-]+)\/about)$/;
const supportedUrlReg =
  /^https?:\/\/(www\.)?(youtube\.com|m\.youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|tiktok\.com|vm\.tiktok\.com|twitter\.com|x\.com|reddit\.com|vimeo\.com|dailymotion\.com)\//i;

const urlInput = document.getElementById("urlInput");
const container = document.getElementById("downloader");
const loader = document.getElementById("loader");
const message = document.getElementById("message");
const downloadBtn = document.getElementById("dnbtn");
const link = document.getElementById("a");
const loader2 = document.getElementById("loader2");
const select = document.getElementById("select");
const howbtn = document.getElementById("howbtn");
const goBack = document.getElementById("go-back");
const goBack2 = document.getElementById("go-back2");
const searchCon = document.getElementById("search-container");
const searchModal = document.getElementById("searchModal");
const searchbtn = document.getElementById("search-btn");
const closeX = document.getElementById("close-X");
const cardColor = document.querySelectorAll(".card-color");
const suggestionsList = document.getElementById("suggestionsList");
const suggestCon = document.querySelector(".suggest-con");
const onlineMsg = document.querySelector(".online-msg");
const randomNumber = Math.floor(Math.random() * 6);
const colors = [
  "#d97706",
  "#d97706",
  "#d97706",
  "#d97706",
  "#d97706",
  "#d97706",
];
const colorsHover = [
  "#92400e",
  "#92400e",
  "#92400e",
  "#92400e",
  "#92400e",
  "#92400e",
];

downloadBtn.style.backgroundColor = colorsHover[randomNumber];
downloadBtn.onmouseout = () => {
  if (select.value == "select") {
    downloadBtn.style.backgroundColor = colorsHover[randomNumber];
  } else {
    downloadBtn.style.backgroundColor = colors[randomNumber];
  }
};
downloadBtn.onmouseover = () => {
  downloadBtn.style.backgroundColor = colorsHover[randomNumber];
};

loader.style.borderTopColor = colors[randomNumber];
loader2.style.borderTopColor = colors[randomNumber];
urlInput.style.borderColor = colors[randomNumber];
urlInput.style.outlineColor = colors[randomNumber];
urlInput.focus();
cardColor.forEach((element) => (element.style.color = colors[randomNumber]));
closeX.style.display = "none";
searchbtn.style.disabled = true;
searchbtn.style.cursor = "not-allowed";
searchbtn.style.backgroundColor = colorsHover[randomNumber];

let timeoutId;
let intervalId;
let isOnline = true;
let stopSuggestions = false;
let stopMultipleReq = 0;

let _pasteListenerAdded = false;
function activeDownloader() {
  if (_pasteListenerAdded) return;
  _pasteListenerAdded = true;
  urlInput.addEventListener("paste", (event) => {
    const videoUrl = event.clipboardData.getData("text/plain").trim();
    if (supportedUrlReg.test(videoUrl)) {
      event.preventDefault();
      urlInput.value = videoUrl;
      urlInput.dispatchEvent(new Event("input"));
      runDownloader(videoUrl);
    }
  });
}

const switchDownloader = (event) => {
  event.preventDefault();
  const videoUrl =
    event.type === "paste"
      ? event.clipboardData.getData("text/plain")
      : event.target.value.trim();

  runDownloader(videoUrl);
};

const runDownloader = (videoUrl) => {
  cleanupActivePlayer();
  if (!isOnline) {
    return;
  }
  previousVideoUrl = videoUrl;
  sessionStorage.setItem("videoUrl", JSON.stringify(videoUrl));

  stopSuggestions = true;
  suggestCon.style.marginTop = "0";
  suggestionsList.innerHTML = "";
  suggestionsList.style.display = "none";
  searchCon.style.display = "none";
  container.style.display = "none";

  if (playlistReg.test(videoUrl)) {
    showToast("Playlist downloads are not supported", "warning");
    urlInput.style.outlineColor = colors[randomNumber];
    stopSuggestions = false;
    closeX.style.display = "none";
    searchbtn.disabled = true;
    searchbtn.style.cursor = "not-allowed";
    searchbtn.style.backgroundColor = colorsHover[randomNumber];
  } else if (channelReg.test(videoUrl)) {
    showToast("Channel downloads are not supported", "warning");
    urlInput.style.outlineColor = colors[randomNumber];
    stopSuggestions = false;
    closeX.style.display = "none";
    searchbtn.disabled = true;
    searchbtn.style.cursor = "not-allowed";
    searchbtn.style.backgroundColor = colorsHover[randomNumber];
  } else if (
    (extractVideoId(videoUrl) != null && linkReg.test(videoUrl)) ||
    supportedUrlReg.test(videoUrl)
  ) {
    stopMultipleReq++;
    if (stopMultipleReq > 1) {
      console.log("multiple requests");
      return;
    }
    if (extractVideoId(videoUrl) != null && linkReg.test(videoUrl))
      convertImage(videoUrl);
    (() => {
      loader.style.display = "block";
      urlInput.blur();
      message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
      message.innerText = "Loading Please Wait";
      function startSearchAnimation() {
        let dots = 0;
        intervalId = setInterval(() => {
          dots = (dots + 1) % 4;
          message.innerText = "Loading Please Wait" + ".".repeat(dots);
        }, 320);
      }
      startSearchAnimation();

      function stopSearchAnimation() {
        clearInterval(intervalId);
      }
      setTimeout(async () => {
        try {
          let data;
          if (platformMocks[videoUrl]) {
            data = platformMocks[videoUrl];
          } else {
            const response = await fetch("/process-url", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ videoUrl, s: secretKey }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const dataRes = await response.text();

            if (dataRes == "Can't download live Video") {
              loader.style.display = "none";
              stopSuggestions = false;
              stopSearchAnimation();
              stopMultipleReq = 0;
              message.innerText = "";
              showToast("Live videos cannot be downloaded", "error");
              goBack2.click();
              urlInput.style.outlineColor = colors[randomNumber];
              urlInput.style.borderColor = colors[randomNumber];
              return;
            }

            const decryptedResponse = decryptResponse(dataRes, secretKey);
            data = JSON.parse(decryptedResponse);
          }

          document.getElementById("title").innerText = data.videoTitle;
          document.getElementById("channel").innerHTML = `<i class="fa-solid fa-circle-user"></i> ${data.channelName}`;
          document.getElementById("timestamp").innerHTML = `<i class="fa-solid fa-clock"></i> ${data.videoTimestamp}`;

          cleanupActivePlayer();
          const thumbContainer = document.querySelector("#downloader .thumb");
          if (thumbContainer) {
            let streamUrl = videoUrl;
            if (platformMocks[videoUrl]) {
              streamUrl = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
            }
            setTimeout(() => {
              buildVideoPlayer(
                thumbContainer,
                streamUrl,
                data.duration || 0,
                data.videoTimestamp,
                data.videoTitle,
                data.channelName,
                true,
                data.thumbnailUrl
              );
            }, 50);
          }
          const fileName = data.fileName;
          const videoQualities = data.qualityLabelMp4;
          const qualityLabelMp3 = data.qualityLabelMp3;
          const contentLengthMp3Sizes = data.contentLengthMp3Sizes;
          const contentLengthMp4Sizes = data.contentLengthMp4Sizes;

          const pairedVideoQualities = videoQualities.map((quality, index) => {
            return {
              quality: quality,
              size: contentLengthMp4Sizes[index] || "Unknown Size",
            };
          });

          pairedVideoQualities.sort((a, b) => {
            const parseQuality = (quality) => {
              const match = quality.match(/(\d+p\d*)( HDR)?(\d+)?/);
              return match
                ? {
                    resolution: parseInt(match[1]),
                    hdr: !!match[2],
                    framerate: match[3] ? parseInt(match[3], 10) : 0,
                  }
                : null;
            };

            const qualityA = parseQuality(a.quality);
            const qualityB = parseQuality(b.quality);

            if (qualityA && qualityB) {
              const numSort = qualityB.resolution - qualityA.resolution;
              if (numSort !== 0) {
                return numSort;
              }
              if (qualityB.hdr !== qualityA.hdr) {
                return qualityB.hdr - qualityA.hdr;
              }
              return qualityB.framerate - qualityA.framerate;
            }
            return 0;
          });

          const sbContainer = document.querySelector("#downloader .sb");
          if (sbContainer) {
            sbContainer.innerHTML = "";

            let html = `<div class="format-groups">`;

            // Video Qualities Group
            if (pairedVideoQualities.length > 0) {
              html += `
                <div class="format-group">
                  <div class="format-group-title">MP4 Video</div>
                  <div class="format-buttons">
              `;
              pairedVideoQualities.forEach((qItem) => {
                if (qItem.quality !== "") {
                  html += `
                    <button class="format-btn" data-type="video" data-value="${qItem.quality}">
                      <i class="fa-solid fa-video"></i> ${qItem.quality} <span style="opacity: 0.6; font-size: 0.75rem; font-weight: 400;">(${qItem.size})</span>
                    </button>
                  `;
                }
              });
              html += `
                  </div>
                </div>
              `;
            }

            // Audio Qualities Group
            if (qualityLabelMp3.length > 0) {
              html += `
                <div class="format-group">
                  <div class="format-group-title">MP3 Audio</div>
                  <div class="format-buttons">
              `;
              qualityLabelMp3.forEach((q, idx) => {
                html += `
                  <button class="format-btn" data-type="audio" data-value="${q}">
                    <i class="fa-solid fa-music"></i> ${q}k <span style="opacity: 0.6; font-size: 0.75rem; font-weight: 400;">(${contentLengthMp3Sizes[idx]})</span>
                  </button>
                `;
              });
              html += `
                  </div>
                </div>
              `;
            }

            html += `</div>`;
            sbContainer.innerHTML = html;

            // Attach click listeners to the format buttons
            sbContainer.querySelectorAll(".format-btn").forEach((btn) => {
              btn.addEventListener("click", () => {
                const type = btn.getAttribute("data-type");
                const val = btn.getAttribute("data-value");

                // Intercept sample platform mock downloads
                if (platformMocks[videoUrl]) {
                  const dummyLink = document.createElement("a");
                  dummyLink.href = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
                  if (type === "audio") {
                    dummyLink.download = `${fileName}_${val}k.mp3`;
                  } else {
                    dummyLink.download = `${fileName}_${val}.mp4`;
                  }
                  dummyLink.target = "_blank";
                  document.body.appendChild(dummyLink);
                  dummyLink.click();
                  document.body.removeChild(dummyLink);
                  showToast("Download started successfully (Sample File)", "success");
                  return;
                }

                // Real download triggers
                if (type === "audio") {
                  audioDownload(fileName, videoUrl, val, btn);
                } else {
                  videoDownload(fileName, videoUrl, val, btn);
                }
              });
            });
          }

          stopSearchAnimation();
          stopMultipleReq = 0;
          container.style.display = "block";
          document.body.classList.add("scroll");
          container.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
          });
          message.innerText = "";
          showToast("Video info loaded successfully", "success");
          loader.style.display = "none";
          closeX.style.display = "none";
          window.scrollTo({
            top: 125,
            behavior: "smooth",
          });

          goBack.style.display = "block";
          goBack.onclick = () => {
            cleanupActivePlayer();
            stopMultipleReq = 0;
            stopSearchAnimation();
            stopSuggestions = false;
            container.style.display = "none";
            message.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 500,
            });
            setTimeout(() => (message.innerText = ""), 500);
            message.style = "";
            urlInput.value = "";
            urlInput.focus();
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            goBack.style.display = "none";
          };

          setTimeout(() => {
            urlInput.blur();
          }, 6000);
        } catch (error) {
          console.error("Error:", error);
          loader.style.display = "none";
          stopSearchAnimation();
          stopMultipleReq = 0;
          message.innerText = "";
          showToast("Something went wrong.", "error");
          stopSuggestions = false;
          searchbtn.disabled = true;
          searchbtn.style.cursor = "not-allowed";
          searchbtn.style.backgroundColor = colorsHover[randomNumber];
          searchbtn.onmouseout = null;
          searchbtn.onmouseover = null;
          searchbtn.style.display = "block";
          urlInput.style.display = "block";
          closeX.style.display = "none";
          searchModal.style.display = "none";
          searchCon.innerHTML = "";
          searchCon.style.display = "none";
          document.body.classList.add("scroll");
          urlInput.value = "";
          urlInput.focus();
          goBack.style.display = "none";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 10);
    })();

    async function startDownloadJob(formatSelector, btnEl) {
      const targetBtn = btnEl || downloadBtn;
      const originalBtnHtml = targetBtn ? targetBtn.innerHTML : "";
      const setBtn = (html) => {
        if (targetBtn) targetBtn.innerHTML = html;
      };

      loader2.style.display = "block";
      
      if (targetBtn) {
        targetBtn.disabled = true;
        targetBtn.style.cursor = "not-allowed";
        targetBtn.style.backgroundColor = colorsHover[randomNumber];
      }
      
      const allButtons = document.querySelectorAll("#downloader .format-btn");
      allButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = "not-allowed";
      });
      
      if (select) {
        select.disabled = true;
        select.style.cursor = "not-allowed";
      }
      
      setBtn(`<i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Preparing...`);
      showToast("Download queued, preparing...", "info");

      try {
        const jobResp = await fetch("/api/media/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoUrl, format_id: formatSelector }),
        });
        if (!jobResp.ok) throw new Error("Failed to start job");
        const { job_id } = await jobResp.json();

        while (true) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusResp = await fetch(`/api/media/status/${job_id}`);
          if (!statusResp.ok) continue;
          const job = await statusResp.json();

          if (job.status === "completed") {
            setBtn(`<i class="fa-solid fa-circle-check"></i>&nbsp;Ready!`);
            link.setAttribute("href", `/api/media/file/${job_id}`);
            link.click();
            showToast("Download started successfully!", "success", 5000);
            window.scrollTo({ top: 125, behavior: "smooth" });
            break;
          }

          if (job.status === "failed") {
            throw new Error(job.error || "Download failed on server");
          }

          const pct = Math.round(job.progress || 0);
          setBtn(
            pct > 0
              ? `<i class="fa-solid fa-spinner fa-spin"></i>&nbsp;${pct}%`
              : `<i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Downloading...`,
          );
        }
      } catch (error) {
        console.error("Download error:", error);
        showToast("Download failed. Please try again.", "error");
        setBtn(`<i class="fa-solid fa-triangle-exclamation"></i>&nbsp;Failed`);
      } finally {
        setTimeout(() => {
          loader2.style.display = "none";
          if (targetBtn) {
            targetBtn.disabled = false;
            targetBtn.style.cursor = "";
            targetBtn.style.backgroundColor = colorsHover[randomNumber];
          }
          allButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.cursor = "pointer";
          });
          if (select) {
            select.disabled = false;
            select.style.cursor = "";
            select.value = "select";
          }
          setBtn(originalBtnHtml);
          link.removeAttribute("href");
          urlInput.style.borderColor = colors[randomNumber];
        }, 3000);
      }
    }

    function audioDownload(_fileName, _videoUrl, values, btnEl) {
      const formatSelector = `bestaudio[abr<=${values}]/bestaudio/best`;
      startDownloadJob(formatSelector, btnEl);
    }

    function videoDownload(_fileName, _videoUrl, values, btnEl) {
      const height = values.replace(/p.*/, "");
      const formatSelector =
        `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]` +
        `/bestvideo[height<=${height}]+bestaudio` +
        `/best[height<=${height}]`;
      startDownloadJob(formatSelector, btnEl);
    }

    async function convertImage(videoUrl) {
      const thumbnailUrlWebp = document.getElementById("thumbnail");
      const loader3 = document.getElementById("loader3");
      loader3.style.display = "block";
      if (window.innerWidth > 768) {
        loader3.style.marginTop = "5.5rem";
      } else {
        loader3.style.marginTop = "16%";
      }
      thumbnailUrlWebp.style.display = "none";
      loader3.style.borderTopColor = colors[randomNumber];

      thumbnailUrlWebp.src = "";
      let flag = 0;
      var timerForChange;
      try {
        const response = await fetch("/previewImage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoUrl,
            s: secretKey,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const dataRes = await response.text();

        if (dataRes == "Something is wrong") {
          console.log(dataRes);
          return;
        }

        const decryptedResponse = decryptResponse(dataRes, secretKey);
        const data = JSON.parse(decryptedResponse);
        loader3.style.display = "none";

        const thumbnailImage = [data[0], data[1], data[2], data[3]];

        thumbnailUrlWebp.style.display = "block";
        thumbnailUrlWebp.src = thumbnailImage[0];
        thumbnailUrlWebp.animate([{ opacity: 0.7 }, { opacity: 1 }], {
          duration: 500,
        });

        thumbnailUrlWebp.onmouseover = () => {
          timerForChange = setInterval(() => {
            try {
              flag++;
              if (flag >= thumbnailImage.length) {
                flag = 0;
                clearInterval(timerForChange);
              }
              thumbnailUrlWebp.animate([{ opacity: 0.7 }, { opacity: 1 }], {
                duration: 500,
              });
              thumbnailUrlWebp.src = thumbnailImage[flag];
            } catch (error) {
              console.error(error.message);
              clearInterval(timerForChange);
            }
          }, 2000);
        };

        thumbnailUrlWebp.onmouseout = () => {
          thumbnailUrlWebp.src = thumbnailImage[0];
          clearInterval(timerForChange);
        };
      } catch (error) {
        console.error("Error:", error);
      }
    }
  } else {
    if (linkReg.test(videoUrl)) {
      showToast("Please paste a valid YouTube URL", "warning");
      urlInput.style.outlineColor = colors[randomNumber];
      stopSuggestions = false;
      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
    } else {
      search();
    }
  }
};

let isEvent = false;
function handleCloseX() {
  isEvent = true;
  urlInput.value = "";
  urlInput.focus();
  suggestCon.style.marginTop = "0";
  suggestionsList.innerHTML = "";
  suggestionsList.style.display = "none";
  searchbtn.disabled = true;
  searchbtn.style.cursor = "not-allowed";
  searchbtn.style.backgroundColor = colorsHover[randomNumber];
  closeX.style.display = "none";
  searchbtn.onmouseout = null;
  searchbtn.onmouseover = null;
}
closeX.addEventListener("click", handleCloseX);

function showOffline() {
  isOnline = false;
  onlineMsg.innerText = "No Internet Connection";
  onlineMsg.style.backgroundColor = "red";
  onlineMsg.style.bottom = "0";
  setTimeout(() => {
    urlInput.disabled = true;
    urlInput.blur();
    urlInput.disabled = true;
    searchbtn.disabled = true;
    searchbtn.style.cursor = "not-allowed";
    closeX.style.display = "none";
  }, 710);
}

function showOnline() {
  isOnline = true;
  onlineMsg.innerText = "";
  onlineMsg.style.bottom = "-100%";
  urlInput.disabled = false;
}

function checkOnlineStatus() {
  if (navigator.onLine) {
    showOnline();
    activeDownloader();
  } else {
    showOffline();
  }
}

window.addEventListener("load", checkOnlineStatus);
window.addEventListener("online", checkOnlineStatus);
window.addEventListener("offline", checkOnlineStatus);

window.addEventListener("online", () => {
  onlineMsg.innerText = "Back Online";
  onlineMsg.style.backgroundColor = "#27aa27";
  onlineMsg.style.bottom = "0";
  timeoutId = setTimeout(function () {
    urlInput.focus();
    onlineMsg.innerText = "";
    onlineMsg.style.bottom = "-100%";
    urlInput.style.borderColor = colors[randomNumber];
  }, 2300);
});

urlInput.onfocus = () => {
  clearTimeout(timeoutId);
  urlInput.style = "";
  urlInput.style.outlineColor = colors[randomNumber];
};

let newFlag;
let suggestTimeoutId;
const suggestKeyword = () => {
  clearTimeout(suggestTimeoutId);
  suggestTimeoutId = setTimeout(async () => {
    const query = urlInput.value.trim();
    if (query.length == 0) {
      return;
    }
    if (query.length >= 50) {
      message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      setTimeout(() => (message.innerText = ""), 500);
      closeX.style.display = "none";
      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
      searchbtn.onmouseout = null;
      searchbtn.onmouseover = null;
      return;
    }

    if (newFlag == query) {
      return;
    }
    newFlag = query;
    try {
      const response = await fetch(
        `/suggestions?q=${encodeURIComponent(query)}&s=${encodeURIComponent(
          secretKey,
        )}`,
      );
      const dataRes = await response.text();
      const decryptedResponse = decryptResponse(dataRes, secretKey);
      const suggestions = JSON.parse(decryptedResponse);
      displaySuggestions(suggestions, query);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, 300);
};

urlInput.oninput = () => {
  if (urlInput.value.length > 0) {
    window.scrollTo({
      top: 125,
      behavior: "smooth",
    });
    closeX.style.display = "block";
    urlInput.style.paddingRight = "36px";
    searchbtn.disabled = false;
    searchbtn.style.cursor = "pointer";
    searchbtn.style.backgroundColor = colors[randomNumber];
    searchbtn.onmouseout = () =>
      (searchbtn.style.backgroundColor = colors[randomNumber]);
    searchbtn.onmouseover = () =>
      (searchbtn.style.backgroundColor = colorsHover[randomNumber]);
    suggestKeyword();
  } else {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    clearTimeout(suggestTimeoutId);
    suggestCon.style.marginTop = "0";
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "none";
    closeX.style.display = "none";
    urlInput.style.paddingRight = "12px";
    searchbtn.disabled = true;
    searchbtn.style.cursor = "not-allowed";
    searchbtn.style.backgroundColor = colorsHover[randomNumber];
    searchbtn.onmouseout = null;
    searchbtn.onmouseover = null;
  }
};

function displaySuggestions(suggestions, query) {
  if (stopSuggestions == true) {
    return;
  }
  suggestCon.style.marginTop = "0.6rem";
  suggestionsList.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  suggestionsList.style.display = "block";
  suggestionsList.innerHTML = "";
  const againSuggestion =
    query == suggestions[0] ? suggestions : [query, ...suggestions];
  againSuggestion.forEach((suggestion) => {
    const li = document.createElement("li");
    li.innerHTML = `<i
    class="fa-solid fa-magnifying-glass magnifying-glass"
  ></i> ${suggestion}`;
    li.classList.add("suggest");
    li.addEventListener("click", (e) => {
      e.preventDefault();
      urlInput.value = suggestion;
      suggestCon.style.marginTop = "0";
      li.classList.remove("suggest");
      searchCon.innerHTML = "";
      searchCon.style.display = "none";
      search();
    });
    suggestionsList.appendChild(li);
  });
}
document.body.addEventListener("click", () => (suggestionsList.innerHTML = ""));

searchModal.style.display = "none";
searchModal.addEventListener("click", function (event) {
  if (event.target === searchModal) {
    stopSuggestions = false;
    document.body.classList.add("scroll");
    searchModal.style.display = "none";
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "none";
    goBack.style.display = "none";
    message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
    setTimeout(() => (message.innerText = ""), 500);
    urlInput.style.display = "block";
    urlInput.focus();
    searchCon.innerHTML = "";
    searchCon.style.display = "none";
    suggestCon.style.marginTop = "0";
    closeX.style.display = "none";
    searchbtn.disabled = true;
    searchbtn.style.cursor = "not-allowed";
    searchbtn.style.display = "block";
    searchbtn.style.backgroundColor = colorsHover[randomNumber];
    searchbtn.onmouseout = null;
    searchbtn.onmouseover = null;
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
});

searchbtn.disabled = true;
let flag = 0;

const searchNext = async (info, data) => {
  try {
    const info2 = "nextVideos";
    flag++;
    if (flag > 1) {
      console.log("multiple req");
      return;
    }
    const response = await fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ info, info2, s: secretKey }),
    });
    const dataRes = await response.text();
    const decryptedResponse = decryptResponse(dataRes, secretKey);
    const data2 = JSON.parse(decryptedResponse);
    const titles = [...data.titles, ...data2.titles];
    const thumbnails = [...data.thumbnails, ...data2.thumbnails];
    const videoTimestamps = [...data.videoTimestamps, ...data2.videoTimestamps];
    const videoUrl = [...data.videoUrl, ...data2.videoUrl];
    const videoView = [...data.videoView, ...data2.videoView];
    const videoUpload = [...data.videoUpload, ...data2.videoUpload];
    const ownerName = [...data.ownerName, ...data2.ownerName];
    const durationsInSeconds = [
      ...data.durationsInSeconds,
      ...data2.durationsInSeconds,
    ];
    const newData = {
      titles,
      thumbnails,
      videoTimestamps,
      videoUrl,
      videoView,
      videoUpload,
      ownerName,
      durationsInSeconds,
    };

    searchCon.innerHTML = "";
    htmlContent(newData);
    const loadMore1 = document.createElement("div");
    const dataLoader1 = document.createElement("div");
    loadMore1.classList.add("more");

    if (data2.titles.length == 0) {
      loadMore1.innerText = "Load Again";
    } else {
      loadMore1.innerText = "Load More";
    }

    dataLoader1.classList.add("data-loader");
    loadMore1.addEventListener("mouseover", () => {
      loadMore1.style.backgroundColor = colors[randomNumber];
    });
    loadMore1.addEventListener("mouseout", () => {
      loadMore1.style.backgroundColor = "";
    });
    loadMore1.addEventListener("click", () => {
      loadMore1.style.display = "none";
      dataLoader1.style.display = "block";
      dataLoader1.style.borderTopColor = colors[randomNumber];
      searchNext(info, newData);
    });
    searchCon.appendChild(loadMore1);
    searchCon.appendChild(dataLoader1);
    flag = 0;
    predl(newData);
  } catch (e) {
    console.error(e);
  }
};

function search() {
  cleanupActivePlayer();
  flag++;
  if (flag > 1) {
    console.log("multiple req");
    return;
  }
  const info = urlInput.value;
  if (extractVideoId(info) !== null && linkReg.test(info)) {
    runDownloader(info);
    return;
  }

  if (linkReg.test(info)) {
    showToast("Please paste a valid YouTube URL", "warning");
    urlInput.style.outlineColor = colors[randomNumber];
    return;
  }

  if (message.innerText == "Loading Please Wait...") {
    return;
  }

  if (info.length == 0) {
    return;
  }

  stopSuggestions = true;
  suggestCon.style.marginTop = "0";
  suggestionsList.innerHTML = "";
  container.style.display = "none";
  suggestionsList.style.display = "none";
  searchCon.innerHTML = "";
  searchCon.style.display = "none";
  loader.style.display = "block";
  loader.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
  message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
  message.innerText = "Searching";
  function startSearchAnimation() {
    let dots = 0;
    intervalId = setInterval(() => {
      dots = (dots + 1) % 4;
      message.innerText = "Searching" + ".".repeat(dots);
    }, 320);
  }
  startSearchAnimation();

  function stopSearchAnimation() {
    clearInterval(intervalId);
  }

  setTimeout(async () => {
    try {
      const info2 = "videos";
      const response = await fetch("/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ info, info2, s: secretKey }),
      });
      const dataRes = await response.text();
      const decryptedResponse = decryptResponse(dataRes, secretKey);
      const data = JSON.parse(decryptedResponse);
      flag = 0;
      urlInput.blur();
      renderResults(data, info);
      searchModal.style.display = "block";
      document.body.classList.remove("scroll");
      stopSearchAnimation();
      setTimeout(() => (message.innerText = ""), 500);
      goBack.style.display = "block";
      closeX.style.display = "none";
      loader.style.display = "none";
      urlInput.value = "";
      searchCon.style.display = "flex";
      window.scrollTo({
        top: 125,
        behavior: "smooth",
      });
      goBack.onclick = () => {
        cleanupActivePlayer();
        stopSuggestions = false;
        searchbtn.disabled = true;
        searchbtn.style.cursor = "not-allowed";
        searchbtn.style.backgroundColor = colorsHover[randomNumber];
        searchbtn.onmouseout = null;
        searchbtn.onmouseover = null;
        searchbtn.style.display = "block";
        urlInput.style.display = "block";
        urlInput.value = "";
        urlInput.focus();
        closeX.style.display = "none";
        searchModal.style.display = "none";
        searchCon.innerHTML = "";
        searchCon.style.display = "none";
        document.body.classList.add("scroll");
        message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
        setTimeout(() => (message.innerText = ""), 500);
        urlInput.focus();
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        goBack.style.display = "none";
      };
    } catch (error) {
      console.error("Error:", error);
      loader.style.display = "none";
      stopSearchAnimation();
      message.innerText = "";
      showToast("Something went wrong.", "error");
      stopSuggestions = false;
      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
      searchbtn.onmouseout = null;
      searchbtn.onmouseover = null;
      searchbtn.style.display = "block";
      urlInput.style.display = "block";
      closeX.style.display = "none";
      searchModal.style.display = "none";
      searchCon.innerHTML = "";
      searchCon.style.display = "none";
      document.body.classList.add("scroll");
      urlInput.value = "";
      urlInput.focus();
      goBack.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, 10);
}
searchbtn.addEventListener("click", search);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    search();
  }
});

const renderResults = (data, info) => {
  htmlContent(data);
  searchCon.insertAdjacentHTML(
    "afterbegin",
    `<div class="s-add">Results for - "${info.toString().toLowerCase()}"</div>`,
  );

  const loadMore = document.createElement("div");
  const dataLoader = document.createElement("div");
  loadMore.classList.add("more");
  loadMore.innerText = "Load More";
  dataLoader.classList.add("data-loader");
  let stopmr = 0;
  function searchNextData() {
    stopmr++;
    if (stopmr > 1) {
      return;
    }
    stopmr = 0;
    loadMore.style.display = "none";
    dataLoader.style.display = "block";
    dataLoader.style.borderTopColor = colors[randomNumber];
    searchNext(info, data);
    loadMore.removeEventListener("click", searchNextData);
  }
  loadMore.addEventListener("mouseover", () => {
    loadMore.style.backgroundColor = colors[randomNumber];
  });
  loadMore.addEventListener("mouseout", () => {
    loadMore.style.backgroundColor = "";
  });
  loadMore.addEventListener("click", searchNextData);
  searchCon.appendChild(loadMore);
  searchCon.appendChild(dataLoader);
  predl(data);
};

function htmlContent(data) {
  if (data.titles.length !== 0) {
    searchCon.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 300 });
  }
  searchCon.innerHTML = data.titles
    .map(
      (title, index) => `
  <div class="s-inner-con">
    <div class="s-thumb">
      <img src="${data.thumbnails[index]}" alt=" thumbnail image" class="s-thumbnail" />
      <div class="s-timeStamp">${data.videoTimestamps[index]}</div>
       <div class="loadCon" id="loaderCon${index}"></div>
    </div>
    <div class="s-view-upload">${data.ownerName[index]} . ${data.videoView[index]} views ${data.videoUpload[index]}</div>
    <div class="s-title">${title}</div>
    <div class="s-btn">
      <button type="button" class="btn-pre">Preview</button>
      <button type="Button" class="btn-dl"><i class="fa-solid fa-download"></i></button>
    </div>
  </div>`,
    )
    .join("");
}

function predl(data) {
  const previewButtons = document.querySelectorAll(".btn-pre");
  const downloadButtons = document.querySelectorAll(".btn-dl");
  const playButtons = document.querySelectorAll(".s-thumb");

  let previousIndex = null;
  let previousIndex2 = null;

  function playOnClick(button, index) {
    const previewButton = previewButtons[index];
    if (previewButton) {
      button.addEventListener("click", () => {
        if (previousIndex2 == index) {
          console.log("return");
          return;
        }
        previewButton.click();
      });
    }
  }

  playButtons.forEach((button, index) => playOnClick(button, index));

  previewButtons.forEach((button, index) => {
    const btnPreInf = document.querySelectorAll(".btn-pre")[index];

    function handleMouseOver() {
      btnPreInf.innerHTML = "Play";
      btnPreInf.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 200 });
    }

    function handleMouseOut() {
      btnPreInf.innerHTML = "Preview";
      btnPreInf.animate([{ opacity: 0.8 }, { opacity: 1 }], { duration: 200 });
    }

    function handleResize() {
      if (window.innerWidth > 768) {
        button.addEventListener("mouseover", handleMouseOver);
        button.addEventListener("mouseout", handleMouseOut);
      } else {
        button.removeEventListener("mouseover", handleMouseOver);
        button.removeEventListener("mouseout", handleMouseOut);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    button.addEventListener("click", async () => {
      const loaderCon = document.getElementById(`loaderCon${index}`);
      const videoLink = data.videoUrl[index];
      const videoDurationFull = data.videoTimestamps[index];
      const durationsInSeconds = data.durationsInSeconds[index];

      loaderCon.style.display = "block";
      button.disabled = true;
      button.style.cursor = "not-allowed";
      button.style.backgroundColor = "#5f5f5f";
      loaderCon.style.borderTopColor = colors[randomNumber];

      try {
        loaderCon.style.display = "none";
        button.disabled = false;
        button.style.cursor = "pointer";
        button.style.backgroundColor = "";

        cleanupActivePlayer();
        buildVideoPlayer(videoPlayerWrapper, videoLink, durationsInSeconds, videoDurationFull, data.titles[index], data.ownerName[index], false, data.thumbnails[index]);

        videoModal.style.display = "block";
        document.body.classList.remove("scroll");
      } catch (error) {
        console.error("An error occurred:", error);
        loaderCon.style.display = "none";
        button.disabled = false;
        button.style.cursor = "pointer";
        button.style.backgroundColor = "";
      }
    });
  });

  downloadButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      searchCon.style.display = "none";
      closePreviewModal();

      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
      searchbtn.onmouseout = null;
      searchbtn.onmouseover = null;
      suggestCon.style.marginTop = "0";
      suggestionsList.innerHTML = "";
      suggestionsList.style.display = "none";
      searchModal.style.display = "none";
      runDownloader(data.videoUrl[index]);
      goBack.style.display = "none";
      goBack2.style.display = "block";
      goBack2.onclick = () => {
        cleanupActivePlayer();
        suggestCon.style.marginTop = "0";
        suggestionsList.innerHTML = "";
        suggestionsList.style.display = "none";
        container.style.display = "none";
        searchCon.style.display = "flex";
        searchCon.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
        searchModal.style.display = "block";
        message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
        setTimeout(() => (message.innerText = ""), 500);
        goBack2.style.display = "none";
        goBack.style.display = "block";
      };
    });
  });
}

const videoModal = document.getElementById("videoModal");
const videoPlayerWrapper = document.getElementById("videoPlayerWrapper");
const closeVideoModal = document.getElementById("closeVideoModal");

const closePreviewModal = () => {
  if (videoModal) {
    videoModal.style.display = "none";
    document.body.classList.add("scroll");
    const video = videoPlayerWrapper.querySelector("video");
    if (video) {
      video.pause();
    }
    if (activeHls) {
      activeHls.destroy();
      activeHls = null;
    }
    videoPlayerWrapper.innerHTML = "";
  }
};

if (closeVideoModal) {
  closeVideoModal.addEventListener("click", closePreviewModal);
}
if (videoModal) {
  videoModal.addEventListener("click", (e) => {
    if (e.target === videoModal) {
      closePreviewModal();
    }
  });
}

const modal = document.getElementById("myModal");
const modalData = document.getElementById("modalData");
const thumImg = document.getElementById("thumImg");
const continueBtn = document.getElementById("continueBtn");

function extractVideoId(url) {
  const videoIdRegex =
    /(?:https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|https?:\/\/(?:m\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(videoIdRegex);
  return match ? match[1] : null;
}

continueBtn.style.backgroundColor = colors[randomNumber];
continueBtn.onmouseout = () =>
  (continueBtn.style.backgroundColor = colors[randomNumber]);
continueBtn.onmouseenter = () =>
  (continueBtn.style.backgroundColor = colorsHover[randomNumber]);

continueBtn.addEventListener("click", function () {
  if (currentDetectedUrl) {
    urlInput.value = currentDetectedUrl;
    urlInput.dispatchEvent(new Event("input"));
    runDownloader(currentDetectedUrl);
    closeModal();
  }
});

function closeModal() {
  modal.style.display = "none";
  document.body.classList.add("scroll");
  const titleEl = document.getElementById("modalVideoTitle");
  if (titleEl && titleEl._abortController) {
    titleEl._abortController.abort();
    titleEl._abortController = null;
  }
  if (currentDetectedUrl) {
    previousVideoUrl = currentDetectedUrl;
    sessionStorage.setItem("videoUrl", JSON.stringify(previousVideoUrl));
  }
}

modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

function readClipboard() {
  if (modal.style.display === "block") {
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    return;
  }
  navigator.clipboard
    .readText()
    .then((videoUrl) => {
      videoUrl = videoUrl.trim();
      if (!supportedUrlReg.test(videoUrl) || videoUrl === previousVideoUrl) {
        return;
      }

      currentDetectedUrl = videoUrl;
      const videoId = extractVideoId(videoUrl);
      thumImg.onerror = () => {
        thumImg.style.display = "none";
      };
      if (videoId) {
        thumImg.src = `https://i.ytimg.com/vi_webp/${videoId}/mqdefault.webp`;
        thumImg.style.display = "block";
      } else {
        thumImg.style.display = "none";
      }
      modal.style.display = "block";
      document.body.classList.remove("scroll");
      modalData.innerHTML = videoUrl.slice(0, 50);

      const titleEl = document.getElementById("modalVideoTitle");
      if (titleEl) {
        titleEl.innerText = "Loading...";
        const titleTimeout = setTimeout(() => {
          if (titleEl.innerText === "Loading...") titleEl.innerText = "Video";
        }, 10000);
        const controller = new AbortController();
        fetch("/process-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl, s: secretKey }),
          signal: controller.signal,
        })
          .then((res) => {
            clearTimeout(titleTimeout);
            if (!res.ok) throw new Error();
            return res.text();
          })
          .then((dataRes) => {
            if (dataRes === "Can't download live Video") {
              titleEl.innerText = "Live Video (Not Supported)";
              return;
            }
            const decryptedResponse = decryptResponse(dataRes, secretKey);
            const data = JSON.parse(decryptedResponse);
            if (data && data.videoTitle) {
              titleEl.innerText = data.videoTitle;
              if (data.thumbnailUrl) {
                const isYouTube =
                  data.thumbnailUrl.includes("youtube.com") ||
                  data.thumbnailUrl.includes("youtu.be") ||
                  data.thumbnailUrl.includes("ytimg.com");
                thumImg.src = isYouTube
                  ? data.thumbnailUrl
                  : `/proxy-image?url=${encodeURIComponent(data.thumbnailUrl)}`;
                thumImg.style.display = "block";
              }
            } else {
              titleEl.innerText = "Video";
            }
          })
          .catch(() => {
            clearTimeout(titleTimeout);
            titleEl.innerText = "Video";
          });
        titleEl._abortController = controller;
      }
    })
    .catch(() => {});
}

window.addEventListener("focus", readClipboard);

document.addEventListener("click", (e) => {
  const qualityMenu = document.getElementById("quality-menu");
  const qualityButton = document.getElementById("quality");
  if (qualityMenu && qualityMenu.style.display === "block") {
    if (
      !qualityMenu.contains(e.target) &&
      (!qualityButton || !qualityButton.contains(e.target))
    ) {
      qualityMenu.style.display = "none";
    }
  }
});

function initBackgroundParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];

  const mouse = {
    x: null,
    y: null,
    radius: 150,
  };

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener("click", (event) => {
    if (
      event.target.tagName === "BUTTON" ||
      event.target.tagName === "INPUT" ||
      event.target.tagName === "A" ||
      event.target.closest("button") ||
      event.target.closest("a")
    ) {
      createBurst(event.clientX, event.clientY, 8);
    } else {
      createBurst(event.clientX, event.clientY, 24);
    }
  });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor(x, y, isBurst = false) {
      if (isBurst) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.0 + 1.0;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.8 + 0.8;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        this.opacity = Math.random() * 0.85 + 0.4;
        this.isBurst = true;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.012;
      } else {
        this.reset(true);
      }
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.0 + 0.2;
      this.speedX = Math.random() * 0.5 - 0.25;
      this.speedY = Math.random() * 0.5 - 0.25;
      this.opacity = Math.random() * 0.55 + 0.25;
      this.isBurst = false;
      this.life = 1.0;

      const colorRand = Math.random();
      if (colorRand < 0.5) {
        this.colorBase = { r: 168, g: 85, b: 247 };
      } else {
        this.colorBase = { r: 20, g: 184, b: 166 };
      }
    }

    update() {
      if (this.isBurst) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedX *= 0.96;
        this.speedY *= 0.96;
        this.life -= this.decay;
        if (this.life <= 0) {
          this.isBurst = false;
          this.speedX = Math.random() * 0.5 - 0.25;
          this.speedY = Math.random() * 0.5 - 0.25;
          this.opacity = Math.random() * 0.55 + 0.25;
        }
        return true;
      }

      this.x += this.speedX;
      this.y += this.speedY;

      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;

          this.x += (dx / distance) * force * 0.6;
          this.y += (dy / distance) * force * 0.6;
          this.tempSize = this.size + force * 1.5;
          this.tempOpacity = Math.min(0.95, this.opacity + force * 0.4);
        } else {
          this.tempSize = this.size;
          this.tempOpacity = this.opacity;
        }
      } else {
        this.tempSize = this.size;
        this.tempOpacity = this.opacity;
      }

      if (this.x < -10) this.x = canvas.width + 10;
      if (this.x > canvas.width + 10) this.x = -10;
      if (this.y < -10) this.y = canvas.height + 10;
      if (this.y > canvas.height + 10) this.y = -10;

      return true;
    }

    draw() {
      const currentOpacity = this.isBurst
        ? this.opacity * this.life
        : this.tempOpacity;
      const currentSize = this.isBurst ? this.size * this.life : this.tempSize;

      const r = this.colorBase.r;
      const g = this.colorBase.g;
      const b = this.colorBase.b;
      const colorStr = `rgba(${r}, ${g}, ${b}, ${currentOpacity})`;

      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = colorStr;

      ctx.shadowBlur = currentSize * 3.0;
      ctx.shadowColor = colorStr;
      ctx.fill();
    }
  }

  function createBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y, true);
      const colorRand = Math.random();
      if (colorRand < 0.5) {
        p.colorBase = { r: 168, g: 85, b: 247 };
      } else {
        p.colorBase = { r: 20, g: 184, b: 166 };
      }
      particles.push(p);
    }
  }

  function drawConnections() {
    const maxDistance = 125;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const baseOpacity = (maxDistance - distance) / maxDistance;
          const opacity = baseOpacity * 0.13;

          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);

          const r = Math.round(
            (particles[i].colorBase.r + particles[j].colorBase.r) / 2,
          );
          const g = Math.round(
            (particles[i].colorBase.g + particles[j].colorBase.g) / 2,
          );
          const b = Math.round(
            (particles[i].colorBase.b + particles[j].colorBase.b) / 2,
          );

          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      if (mouse.x !== null && mouse.y !== null) {
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const baseOpacity = (mouse.radius - distance) / mouse.radius;
          const opacity = baseOpacity * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);

          const r = particles[i].colorBase.r;
          const g = particles[i].colorBase.g;
          const b = particles[i].colorBase.b;
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function init() {
    resizeCanvas();
    const particleCount = Math.max(
      60,
      Math.min(140, Math.floor((canvas.width * canvas.height) / 11000)),
    );
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((p) => p.update());

    ctx.shadowBlur = 0;
    drawConnections();

    for (let i = 0; i < particles.length; i++) {
      particles[i].draw();
    }

    requestAnimationFrame(animate);
  }

  init();
  animate();

  window.addEventListener("resize", () => {
    init();
  });
}

// Register platform badge click handlers
document.querySelectorAll(".platform-badge").forEach((badge) => {
  badge.style.cursor = "pointer";
  badge.addEventListener("click", (e) => {
    e.preventDefault();
    let sampleUrl = "";
    if (badge.classList.contains("yt")) {
      sampleUrl = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
    } else if (badge.classList.contains("ig")) {
      sampleUrl = "https://www.instagram.com/p/CG4961zjvW-/";
    } else if (badge.classList.contains("tt")) {
      sampleUrl = "https://www.tiktok.com/@mrbeast/video/7376378434400783658";
    } else if (badge.classList.contains("tw")) {
      sampleUrl = "https://twitter.com/NASA/status/1780282103561339174";
    } else if (badge.classList.contains("fb")) {
      sampleUrl = "https://www.facebook.com/watch/?v=10158221590472429";
    }

    if (sampleUrl) {
      urlInput.value = sampleUrl;
      urlInput.dispatchEvent(new Event("input"));
      runDownloader(sampleUrl);
    }
  });
});
