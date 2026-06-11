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
  "#3484ff",
  "#9220fd",
  "#ff34aa",
  "#3484ff",
  "#9220fd",
  "#ff34aa",
];
const colorsHover = [
  "#2062c4",
  "#8021d8",
  "#e02f97",
  "#2062c4",
  "#8021d8",
  "#e02f97",
];

howbtn.style.backgroundColor = colors[randomNumber];
howbtn.onmouseout = () => (howbtn.style.backgroundColor = colors[randomNumber]);
howbtn.onmouseover = () =>
  (howbtn.style.backgroundColor = colorsHover[randomNumber]);
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
          const data = JSON.parse(decryptedResponse);

          document.getElementById("title").innerText = data.videoTitle;
          document.getElementById("title").innerText = data.videoTitle;
          document.getElementById("channel").innerText = data.channelName;
          document.getElementById("timestamp").innerText = data.videoTimestamp;

          const mainThumbnail = document.getElementById("thumbnail");
          const loader3 = document.getElementById("loader3");
          if (mainThumbnail) {
            mainThumbnail.onerror = () => {
              mainThumbnail.style.display = "none";
            };
            const isYouTube =
              extractVideoId(videoUrl) != null && linkReg.test(videoUrl);
            if (!isYouTube) {
              if (data.thumbnailUrl) {
                if (loader3) loader3.style.display = "none";
                mainThumbnail.src = `/proxy-image?url=${encodeURIComponent(data.thumbnailUrl)}`;
                mainThumbnail.style.display = "block";
              } else {
                if (loader3) loader3.style.display = "none";
                mainThumbnail.style.display = "none";
              }
            }
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

          select.innerHTML = "";
          select.insertAdjacentHTML(
            "afterbegin",
            `<option value="select">--: Select format :--</option>`,
          );
          const categories = ["Mp4 Video Qualities", "Mp3 Audio Qualities"];

          for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const categoryOptions = [];
            if (category === "Mp4 Video Qualities") {
              if (pairedVideoQualities.length === 0) {
                categoryOptions.push(
                  `<option disabled> No Videos Qualities Found </option>`,
                );
              } else {
                for (let j = 0; j < pairedVideoQualities.length; j++) {
                  if (pairedVideoQualities[j].quality === "") {
                    categoryOptions.push(
                      `<option> No Videos Qualities Found </option>`,
                    );
                  } else {
                    categoryOptions.push(
                      `<option value="${pairedVideoQualities[j].quality}">${pairedVideoQualities[j].quality} ( ${pairedVideoQualities[j].size} )</option>`,
                    );
                  }
                }
              }
            } else if (category === "Mp3 Audio Qualities") {
              for (let j = 0; j < qualityLabelMp3.length; j++) {
                categoryOptions.push(
                  `<option value="${qualityLabelMp3[j]}">${qualityLabelMp3[j]} k ( ${contentLengthMp3Sizes[j]} )</option>`,
                );
              }
            }
            select.insertAdjacentHTML(
              "beforeend",
              `<optgroup label="${category}">${categoryOptions.join(
                "",
              )}</optgroup>`,
            );
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
          goBack.addEventListener("click", () => {
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
          });

          setTimeout(() => {
            urlInput.blur();
          }, 6000);

          downloadBtn.disabled = true;
          downloadBtn.style.cursor = "not-allowed";
          select.style.borderColor = colors[randomNumber];
          select.addEventListener("change", () => {
            if (select.value === "select") {
              downloadBtn.disabled = true;
              downloadBtn.style.cursor = "not-allowed";
              downloadBtn.style.backgroundColor = colorsHover[randomNumber];
            } else {
              downloadBtn.disabled = false;
              downloadBtn.style.cursor = "";
              downloadBtn.style.backgroundColor = colors[randomNumber];
            }
          });

          downloadBtn.onclick = () => {
            const values = select.value;
            if (!values || values === "select") return;
            if (/^\d+$/.test(values)) {
              
              audioDownload(fileName, videoUrl, values);
            } else if (/^\d+p/.test(values)) {
              videoDownload(fileName, videoUrl, values);
            } else {
              console.error("Unknown format value:", values);
              loader2.style.display = "none";
              showToast("Invalid format selected. Please try again.", "error");
            }
          };
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

    async function startDownloadJob(formatSelector) {
      const originalBtnHtml = downloadBtn.innerHTML;
      const setBtn = (html) => {
        downloadBtn.innerHTML = html;
      };

      loader2.style.display = "block";
      downloadBtn.disabled = true;
      downloadBtn.style.cursor = "not-allowed";
      downloadBtn.style.backgroundColor = colorsHover[randomNumber];
      select.disabled = true;
      select.style.cursor = "not-allowed";
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
      } finally {
        setTimeout(() => {
          loader2.style.display = "none";
          downloadBtn.disabled = false;
          downloadBtn.style.cursor = "";
          select.disabled = false;
          select.style.cursor = "";
          select.value = "select";
          downloadBtn.style.backgroundColor = colorsHover[randomNumber];
          setBtn(originalBtnHtml);
          link.removeAttribute("href");
          urlInput.style.borderColor = colors[randomNumber];
        }, 3000);
      }
    }

    function audioDownload(_fileName, _videoUrl, values) {
      const formatSelector = `bestaudio[abr<=${values}]/bestaudio/best`;
      startDownloadJob(formatSelector);
    }

    function videoDownload(_fileName, _videoUrl, values) {
      const height = values.replace(/p.*/, "");
      const formatSelector =
        `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]` +
        `/bestvideo[height<=${height}]+bestaudio` +
        `/best[height<=${height}]`;
      startDownloadJob(formatSelector);
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
      searchCon.style.display = "block";
      window.scrollTo({
        top: 125,
        behavior: "smooth",
      });
      goBack.addEventListener("click", () => {
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
      });
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
    <div class="s-view-upload">${data.ownerName[index]} . ${data.videoView[index]} views . ${data.videoUpload[index]}</div>
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

        videoPlayerWrapper.innerHTML = "";

        const videoContainer = document.createElement("div");
        videoContainer.className = "video-container";
        videoPlayerWrapper.appendChild(videoContainer);

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
        video.autoplay = true;

        let seekOffset = 0;
        let currentQuality = "360p";

        function loadStream(t, quality) {
          if (quality != null) currentQuality = quality;
          seekOffset = t;
          bufferingIndicator.style.display = "block";
          video.src = `/preview/stream?url=${encodeURIComponent(videoLink)}&q=${currentQuality}&t=${t}`;
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
        }

        video.addEventListener("play", () => {
          playPauseButton.innerHTML = "<i class='fa-solid fa-pause'></i>";
          video.style.display = "block";
        });

        video.addEventListener("playing", () => {});
        video.addEventListener("waiting", () => {});
        video.addEventListener("pause", () => {});

        videoContainer.appendChild(video);
        loadStream(0, "360p");

        const vidInfo = document.createElement("div");
        vidInfo.className = "vid-info";
        vidInfo.innerHTML = `
          <div class="vid-info-title">${data.titles[index] || ""}</div>
          <div class="vid-info-meta">${data.ownerName[index] || ""}<span class="vid-info-dot">·</span>${videoDurationFull}</div>`;
        videoPlayerWrapper.appendChild(vidInfo);

        const timeDisplay = document.createElement("span");
        timeDisplay.id = "time-display";
        timeDisplay.innerText = `0:00 / 0:00`;
        controls.appendChild(timeDisplay);

        const seekBar = document.createElement("input");
        seekBar.type = "range";
        seekBar.id = "seek-bar";
        seekBar.value = 0;
        controls.appendChild(seekBar);

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
          seekBar.style.setProperty('--seek-pct', `${playedPct}%`);

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
          const localTargetTime = targetTime - seekOffset;

          
          if (localTargetTime >= 0 && isTimeBuffered(video, localTargetTime)) {
            video.currentTime = localTargetTime;
          }

          updateSeekBarVisuals(targetTime);
        };

        seekBar.addEventListener("input", handleSeekInput);

        const handleSeekChange = () => {
          isDraggingSeekBar = false;
          const targetTime = (seekBar.value / 100) * durationsInSeconds;
          const localTargetTime = targetTime - seekOffset;

          if (localTargetTime >= 0 && isTimeBuffered(video, localTargetTime)) {
            video.currentTime = localTargetTime;
          } else {
            loadStream(targetTime, null);
          }
        };

        seekBar.addEventListener("change", handleSeekChange);

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
      goBack2.style.display = "block";
      goBack2.addEventListener("click", () => {
        suggestCon.style.marginTop = "0";
        suggestionsList.innerHTML = "";
        suggestionsList.style.display = "none";
        container.style.display = "none";
        searchCon.style.display = "block";
        searchCon.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
        searchModal.style.display = "block";
        message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
        setTimeout(() => (message.innerText = ""), 500);
        goBack2.style.display = "none";
      });
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

// Close quality menu when clicking outside
document.addEventListener("click", (e) => {
  const qualityMenu = document.getElementById("quality-menu");
  const qualityButton = document.getElementById("quality");
  if (qualityMenu && qualityMenu.style.display === "block") {
    if (!qualityMenu.contains(e.target) && (!qualityButton || !qualityButton.contains(e.target))) {
      qualityMenu.style.display = "none";
    }
  }
});


function initBackgroundParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  let animationFrameId;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x = Math.random() * canvas.width;
      this.y = init ? Math.random() * canvas.height : canvas.height + 10;
      this.size = Math.random() * 2 + 1; 
      this.speedY = -(Math.random() * 0.4 + 0.1); 
      this.speedX = Math.random() * 0.4 - 0.2; 
      this.opacity = Math.random() * 0.5 + 0.15; 
      const colorRand = Math.random();
      if (colorRand < 0.45) {
        this.color = `rgba(124, 58, 237, ${this.opacity})`; 
      } else if (colorRand < 0.85) {
        this.color = `rgba(37, 99, 235, ${this.opacity})`; 
      } else {
        this.color = `rgba(255, 255, 255, ${this.opacity})`; 
      }
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;

      if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
        this.reset(false);
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 2;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
  }

  function init() {
    resizeCanvas();
    const particleCount = Math.max(
      50,
      Math.min(120, Math.floor((canvas.width * canvas.height) / 12000)),
    );
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  init();
  animate();

  window.addEventListener("resize", () => {
    init();
  });
}
