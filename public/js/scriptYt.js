// --------------------Downlaoder --------------------
// Function to generate a random secret key
function generateSecretKey(length) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charArray = [];

  // Fill charArray with random characters
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    charArray.push(charset[randomIndex]);
  }

  return charArray.join("");
}
// Generate a 32-character (256-bit) random secret key
const secretKey = generateSecretKey(32);

function decryptResponse(encryptedData, key) {
  const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
  const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
  return decryptedData;
}

window.addEventListener("DOMContentLoaded", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
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
let isOnline = true;
let stopSuggestions = false;
let stopMultipleReq = 0;

function activeDownloader() {
  urlInput.addEventListener("paste", switchDownloader);
  urlInput.addEventListener("change", switchDownloader);
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
  stopSuggestions = true;
  suggestCon.style.marginTop = "0";
  suggestionsList.innerHTML = "";
  suggestionsList.style.display = "none";
  searchCon.style.display = "none";
  container.style.display = "none";

  if (playlistReg.test(videoUrl)) {
    message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    message.innerText = "Playlist not Supported";
    urlInput.style.cssText = "border: 2px solid; color: black;";
    urlInput.style.borderColor = colors[randomNumber];
    timeoutId = setTimeout(() => {
      message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      setTimeout(() => (message.innerText = ""), 500);
      urlInput.style.color = "";
      urlInput.style.borderColor = "";
      urlInput.style.border = "";
      urlInput.style.outlineColor = colors[randomNumber];
      stopSuggestions = false;
      closeX.style.display = "none";
      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
    }, 2000);
  } else if (channelReg.test(videoUrl)) {
    message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    message.innerText = "Channel not supported";
    urlInput.style.cssText = "border: 2px solid; color: black;";
    urlInput.style.borderColor = colors[randomNumber];
    timeoutId = setTimeout(() => {
      message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      setTimeout(() => (message.innerText = ""), 500);
      urlInput.style.color = "";
      urlInput.style.borderColor = "";
      urlInput.style.border = "";
      urlInput.style.outlineColor = colors[randomNumber];
      stopSuggestions = false;
      closeX.style.display = "none";
      searchbtn.disabled = true;
      searchbtn.style.cursor = "not-allowed";
      searchbtn.style.backgroundColor = colorsHover[randomNumber];
    }, 2000);
  } else if (extractVideoId(videoUrl) != null && linkReg.test(videoUrl)) {
    stopMultipleReq++;
    if (stopMultipleReq > 1) {
      console.log("multiple requests");
      return;
    }
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
            message.style.color = "red";
            stopSearchAnimation();
            stopMultipleReq = 0;
            message.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 300,
            });
            message.innerText = dataRes;
            timeoutId = setTimeout(() => {
              message.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 500,
              });
              setTimeout(() => (message.innerText = ""), 500);
              message.style = "";
              goBack2.click();
              urlInput.style.outlineColor = colors[randomNumber];
              urlInput.style.borderColor = colors[randomNumber];
            }, 3000);
            return;
          }

          const decryptedResponse = decryptResponse(dataRes, secretKey);
          const data = JSON.parse(decryptedResponse);

          document.getElementById("title").innerText = data.videoTitle;
          document.getElementById("title").innerText = data.videoTitle;
          document.getElementById("channel").innerText = data.channelName;
          document.getElementById("timestamp").innerText = data.videoTimestamp;
          const fileName = data.fileName;
          const videoQualities = data.qualityLabelMp4;
          const qualityLabelMp3 = data.qualityLabelMp3;
          const contentLengthMp3Sizes = data.contentLengthMp3Sizes;
          const contentLengthMp4Sizes = data.contentLengthMp4Sizes;

          function sortResolutionsAscending(resolutions) {
            const resolutionValue = (resolution) => parseInt(resolution);
            resolutions.sort((a, b) => resolutionValue(b) - resolutionValue(a));
            return resolutions;
          }

          let sortedResolutions = sortResolutionsAscending(videoQualities);
          const sortedVideoQualities = sortedResolutions.sort((a, b) => {
            const parseQuality = (quality) => {
              const match = quality.match(/(\d+p\d+)( HDR)?(\d+)?/);
              return match
                ? {
                    resolution: match[1],
                    hdr: !!match[2],
                    framerate: match[3] ? parseInt(match[3], 10) : 0,
                  }
                : null;
            };

            const qualityA = parseQuality(a);
            const qualityB = parseQuality(b);

            if (qualityA && qualityB) {
              const numSort =
                parseInt(qualityB.resolution) - parseInt(qualityA.resolution);
              if (numSort !== 0) {
                return numSort;
              }
              if (qualityB.hdr !== qualityA.hdr) {
                return qualityB.hdr - qualityA.hdr;
              }
              return qualityB.framerate - qualityA.framerate;
            }
          });

          select.innerHTML = "";
          select.insertAdjacentHTML(
            "afterbegin",
            `<option value="select">--: Select format :--</option>`
          );
          const categories = ["Mp4 Video Qualities", "Mp3 Audio Qualities"];

          for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const categoryOptions = [];
            if (category === "Mp4 Video Qualities") {
              if (sortedVideoQualities.length === 0) {
                categoryOptions.push(
                  `<option disabled> No Videos Qualities Found </option>`
                );
              } else {
                for (let j = 0; j < sortedVideoQualities.length; j++) {
                  if (sortedVideoQualities[j] === "") {
                    categoryOptions.push(
                      `<option> No Videos Qualities Found </option>`
                    );
                  } else {
                    categoryOptions.push(
                      `<option value="${sortedVideoQualities[j]}">${sortedVideoQualities[j]} ( ${contentLengthMp4Sizes[j]} )</option>`
                    );
                  }
                }
              }
            } else if (category === "Mp3 Audio Qualities") {
              for (let j = 0; j < qualityLabelMp3.length; j++) {
                categoryOptions.push(
                  `<option value="${qualityLabelMp3[j]}">${qualityLabelMp3[j]} k ( ${contentLengthMp3Sizes[j]} )</option>`
                );
              }
            }
            select.insertAdjacentHTML(
              "beforeend",
              `<optgroup label="${category}">${categoryOptions.join(
                ""
              )}</optgroup>`
            );
          }

          stopSearchAnimation();
          stopMultipleReq = 0;
          container.style.display = "block";
          document.body.classList.add("scroll");
          container.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
          });
          message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
          message.innerText = "Loaded Successfully";
          message.style.color = "limegreen";
          loader.style.display = "none";
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
            message.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 500,
            });
            setTimeout(() => (message.innerText = ""), 500);
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
            if (["160", "128", "64", "48"].includes(values)) {
              audioDownload(fileName, videoUrl, values);
            } else if (
              [
                "4320p60 HDR",
                "2160p60 HDR",
                "2160p",
                "1440p60 HDR",
                "1440p",
                "1080p60 HDR",
                "1080p60",
                "1080p",
                "720p60 HDR",
                "720p60",
                "720p",
                "480p60 HDR",
                "480p",
                "360p60 HDR",
                "360p",
                "240p60 HDR",
                "240p",
                "144p60 HDR",
                "144p",
              ].includes(values)
            ) {
              videoDownload(fileName, videoUrl, values);
            } else {
              console.error("error");
              loader2.style.display = "none";
              message.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 500,
              });
              setTimeout(() => (message.innerText = ""), 500);
            }
          };
        } catch (error) {
          console.error("Error:", error);
          loader.style.display = "none";
          stopSearchAnimation();
          stopMultipleReq = 0;
          message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
          message.innerText = "Something went wrong.";
          message.style.color = "red";
          setTimeout(() => {
            message.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 300,
            });
            message.innerText = "Check your Internet connection and Try again.";
            setTimeout(() => {
              message.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 500,
              });
              setTimeout(() => {
                searchbtn.animate([{ opacity: 0 }, { opacity: 1 }], {
                  duration: 500,
                });
                urlInput.animate([{ opacity: 0 }, { opacity: 1 }], {
                  duration: 500,
                });
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
                message.innerText = "";
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }, 500);
              goBack.style.display = "none";
            }, 2000);
          }, 2000);
        }
      }, 2000);
    })();

    function sameValue() {
      link.click();
      select.disabled = true;
      select.style.cursor = "not-allowed";
      downloadBtn.disabled = true;
      downloadBtn.style.cursor = "not-allowed";
      downloadBtn.style.backgroundColor = colorsHover[randomNumber];
      loader2.style.display = "block";
      message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      message.innerText = "Download Starting...";
      setTimeout(() => {
        select.value = "select";
        link.removeAttribute("href");
        link.removeAttribute("download");
        link.download = "#";
        select.disabled = false;
        select.style.cursor = "";
        loader2.style.display = "none";
        message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        message.innerText = "Download started Successfully";
        urlInput.style.color = "limegreen";
        loader.style.display = "none";
        window.scrollTo({
          top: 125,
          behavior: "smooth",
        });
        setTimeout(() => {
          message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
          setTimeout(() => (message.innerText = ""), 500);
          urlInput.style.borderColor = colors[randomNumber];
        }, 5000);
      }, 6000);
    }

    function audioDownload(fileName, videoUrl, values) {
      try {
        const url = `/audio?url=${encodeURIComponent(
          videoUrl
        )}&quality=${values}`;
        link.setAttribute("href", `${url}`);
        // link.setAttribute("download", `${fileName}_${values}k.mp3`);
        console.log("Audio Downloading in process");
        sameValue();
      } catch (error) {
        console.error("Error during audio download setup:", error);
        message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        message.innerText = "Please try again later.";
        loader2.style.display = "none";
      }
    }

    function videoDownload(fileName, videoUrl, values) {
      try {
        const url = `/video?url=${encodeURIComponent(
          videoUrl
        )}&quality=${values}`;
        link.setAttribute("href", `${url}`);
        //link.setAttribute("download", `${fileName}_${values}.mp4`);
        console.log("video Downloading in process");
        sameValue();
      } catch (error) {
        console.error("Error during audio download setup:", error);
        message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        message.innerText = "Please try again later.";
        loader2.style.display = "none";
      }
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
    if (linkReg.test(videoUrl) || videoUrl.length >= 41) {
      message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      message.innerText = "Please Paste Valid URL...";
      message.style.color = "red";
      timeoutId = setTimeout(() => {
        message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
        setTimeout(() => (message.innerText = ""), 500);
        message.style = "";
        urlInput.style.outlineColor = colors[randomNumber];
        stopSuggestions = false;
        searchbtn.disabled = true;
        searchbtn.style.cursor = "not-allowed";
        searchbtn.style.backgroundColor = colorsHover[randomNumber];
      }, 2000);
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
  urlInput.addEventListener("change", switchDownloader);
}
closeX.addEventListener("click", handleCloseX);
closeX.addEventListener("mouseover", () => {
  urlInput.removeEventListener("change", switchDownloader);
});

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
  urlInput.style.border = `2px solid ${colors[randomNumber]}`;
};

//-------------------------- suggest keyword ---------------------------
//-------------------------- suggest keyword ---------------------------

let newFlag;
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
const suggestKeyword = () => {
  setTimeout(async () => {
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
          secretKey
        )}`
      );
      const dataRes = await response.text();
      const decryptedResponse = decryptResponse(dataRes, secretKey);
      const suggestions = JSON.parse(decryptedResponse);
      displaySuggestions(suggestions, query);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, 2000);
};

function displaySuggestions(suggestions, query) {
  if (stopSuggestions == true) {
    return;
  }
  suggestCon.style.marginTop = "-2rem";
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
//-------------------------- search youtube ---------------------------
//----------------------------search youtube ------------------------

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
    message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    message.innerText = "Please Paste Valid URL...";
    message.style.colort = "red";
    urlInput.style.outlineColor = "red";
    timeoutId = setTimeout(() => {
      message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      setTimeout(() => (message.innerText = ""), 500);
      message.style = "";
      urlInput.style.outlineColor = colors[randomNumber];
    }, 2000);
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
      message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      message.innerText = "Something went wrong.";
      message.style.color = "red";
      setTimeout(() => {
        message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        message.innerText = "Check your Internet connection and Try again.";
        setTimeout(() => {
          message.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
          setTimeout(() => {
            searchbtn.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 500,
            });
            urlInput.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 500,
            });
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
            message.innerText = "";
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }, 500);
          goBack.style.display = "none";
        }, 2000);
      }, 2000);
    }
  }, 3000);
}
searchbtn.addEventListener("click", search);

const renderResults = (data, info) => {
  htmlContent(data);
  searchCon.insertAdjacentHTML(
    "afterbegin",
    `<div class="s-add">Results for - "${urlInput.value
      .toString()
      .toLowerCase()}"</div>`
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
  </div>`
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
      const img = document.querySelectorAll(".s-thumbnail")[index];
      const timeStampChild = document.querySelectorAll(".s-timeStamp")[index];
      const playBackground = document.querySelectorAll(".s-inner-con")[index];
      const videoLink = data.videoUrl[index];
      const videoDurationFull = data.videoTimestamps[index];
      const durationsInSeconds = data.durationsInSeconds[index];

      img.style.display = "none";
      loaderCon.style.display = "block";
      timeStampChild.style.display = "none";
      button.disabled = true;
      button.style.cursor = "not-allowed";
      button.style.backgroundColor = "#5f5f5f";
      loaderCon.style.borderTopColor = colors[randomNumber];

      if (previousIndex !== null && previousIndex !== index) {
        const prevImg =
          document.querySelectorAll(".s-thumbnail")[previousIndex];
        const prevTimeStampChild =
          document.querySelectorAll(".s-timeStamp")[previousIndex];

        const prevVideo = document.querySelector(".video-container");
        const prevPauseButton = document.querySelector(".btn-pause");
        const prevPlayButton = document.querySelector(".btn-play");

        if (prevImg && prevVideo) {
          prevImg.style.display = "block";
          prevTimeStampChild.style.display = "block";
          prevVideo.remove();
          prevPauseButton.remove();
          prevPlayButton.remove();
          previewButtons[previousIndex].style.display = "block";
          previewButtons[previousIndex].disabled = false;
          previewButtons[previousIndex].style.cursor = "pointer";
          previewButtons[previousIndex].style.backgroundColor = "";
        }
      }

      try {
        const videoPlayUrl = `/videopreview?url=${encodeURIComponent(
          videoLink
        )}&q=`;

        loaderCon.style.display = "none";
        button.style.display = "none";
        const randomPlay = Math.floor(Math.random() * 6);

        const videoContainer = document.createElement("div");
        videoContainer.className = "video-container";
        img.parentNode.appendChild(videoContainer);

        const bufferingIndicator = document.createElement("div");
        bufferingIndicator.className = "buffering-indicator";
        bufferingIndicator.id = "buffering-indicator";
        bufferingIndicator.innerText = "Buffering...";
        videoContainer.appendChild(bufferingIndicator);

        const controls = document.createElement("div");
        controls.className = "controls";
        controls.id = "controls";
        videoContainer.appendChild(controls);

        const playPauseButton = document.createElement("button");
        playPauseButton.id = "play-pause";
        playPauseButton.className = "control-button";
        playPauseButton.innerHTML = "<i class='fa-solid fa-play i-play2'></i>";
        controls.appendChild(playPauseButton);

        const pauseButton = document.createElement("button");
        const playButton = document.createElement("button");
        playButton.style.display = "none";
        pauseButton.style.display = "block";
        pauseButton.classList.add("btn-pause");
        pauseButton.innerHTML = "<i class='fa-solid fa-play i-play'></i>";
        playButton.classList.add("btn-play");
        playButton.innerHTML = "<i class='fa-solid fa-pause i-pause'></i>";

        pauseButton.addEventListener("click", () => {
          pauseButton.style.display = "none";
          playButton.style.display = "block";
          playPauseButton.innerHTML =
            "<i class='fa-solid fa-pause i-pause2'></i>";
          img.style.display = "none";
          videoContainer.style.display = "block";
          timeStampChild.style.display = "none";
          video.style.display = "block";
          if (video) {
            video.play();
          }
        });

        playButton.addEventListener("click", () => {
          pauseButton.style.display = "block";
          playButton.style.display = "none";
          playPauseButton.innerHTML =
            "<i class='fa-solid fa-play i-play2'></i>";
          if (video) {
            video.pause();
          }
        });

        button.parentNode.insertBefore(
          playButton,
          button.parentNode.firstChild
        );
        button.parentNode.insertBefore(
          pauseButton,
          button.parentNode.firstChild
        );

        const video = document.createElement("video");
        video.id = "video";
        video.setAttribute("type", "video/mp4");
        video.setAttribute("loop", "");
        video.src = `${videoPlayUrl}360p`;
        video.volume = 0.5;
        video.autoplay = true;

        video.addEventListener("play", () => {
          playBackground.style.background = `url(../img/index${randomPlay}.svg)`;
          playBackground.style.backgroundPosition = "center";
          playBackground.style.backgroundSize = "cover";
          playPauseButton.innerHTML =
            "<i class='fa-solid fa-pause i-pause2'></i>";
          img.style.display = "none";
          timeStampChild.style.display = "none";
          video.style.display = "block";
          pauseButton.style.display = "none";
          playButton.style.display = "block";
        });

        video.addEventListener("playing", () => {
          playBackground.style.background = `url(../img/index${randomPlay}.svg)`;
          playBackground.style.backgroundPosition = "center";
          playBackground.style.backgroundSize = "cover";
        });

        video.addEventListener(
          "waiting",
          () => (playBackground.style.background = "rgba(77,77,77,0.6)")
        );

        video.addEventListener("pause", () => {
          playBackground.style.background = "rgba(77,77,77,0.6)";
          pauseButton.style.display = "block";
          playButton.style.display = "none";
        });

        videoContainer.appendChild(video);

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

        const qualityOptions = [
          { quality: "720p", src: `${videoPlayUrl}720p` },
          { quality: "480p", src: `${videoPlayUrl}480p` },
          { quality: "360p", src: `${videoPlayUrl}360p` },
          { quality: "240p", src: `${videoPlayUrl}240p` },
          { quality: "144p", src: `${videoPlayUrl}144p` },
        ];

        qualityOptions.forEach((option) => {
          const button = document.createElement("button");
          button.innerText = option.quality;
          button.dataset.src = option.src;
          qualityMenu.appendChild(button);
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
            5000
          );
        };

        const togglePlayPause = () => {
          if (video.paused) {
            video.play();
            playPauseButton.innerHTML =
              "<i class='fa-solid fa-pause i-pause2'></i>";
          } else {
            video.pause();
            playPauseButton.innerHTML =
              "<i class='fa-solid fa-play i-play2'></i>";
          }
        };

        const updateSeekBar = () => {
          const value = (100 / durationsInSeconds) * video.currentTime;
          seekBar.value = value;
          seekBar.style.background = `linear-gradient(to right, #ff0 0%, #ff0 ${value}%, #f5f5f5 ${value}%, #f5f5f5 100%)`;

          const minutes = Math.floor(video.currentTime / 60);
          const seconds = Math.floor(video.currentTime % 60);
          timeDisplay.innerText = `${minutes}:${
            seconds < 10 ? "0" : ""
          }${seconds} / ${videoDurationFull}`;
        };

        const changeVolume = () => {
          video.volume = volumeBar.value;
          const value = volumeBar.value * 100;
          volumeBar.style.background = `linear-gradient(to right, #ff0 0%, #ff0 ${value}%, #f5f5f5 ${value}%, #f5f5f5 100%)`;
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
          const newSource = e.target.dataset.src;
          const currentTime = video.currentTime;
          const isPlaying = !video.paused;
          video.src = newSource;
          video.currentTime = currentTime;
          if (isPlaying) {
            video.play();
          }
          qualityMenu.style.display = "none";
        };

        function onclickOnVideoPlay() {
          if (!playflag) {
            console.log("return");
            return;
          }
          showControls();
          togglePlayPause();
        }
        videoContainer.addEventListener("mousemove", showControls);
        videoContainer.addEventListener("click", onclickOnVideoPlay);

        playPauseButton.addEventListener("click", togglePlayPause);
        video.addEventListener("timeupdate", updateSeekBar);
        seekBar.addEventListener(
          "input",
          () => (video.currentTime = (seekBar.value / 100) * durationsInSeconds)
        );

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

        video.addEventListener(
          "waiting",
          () => (bufferingIndicator.style.display = "block")
        );
        video.addEventListener(
          "playing",
          () => (bufferingIndicator.style.display = "none")
        );

        previousIndex = index;
      } catch (error) {
        console.error("An error occurred:", error);
        loaderCon.style.display = "none";
        img.style.display = "block";
        timeStampChild.style.display = "block";
        button.disabled = false;
        button.style.cursor = "pointer";
        button.style.backgroundColor = "";
      }
    });
  });

  downloadButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      searchCon.style.display = "none";
      const img = document.querySelectorAll(".s-thumbnail")[index];
      const video = document.querySelector(".video-play");
      if (img && video) {
        img.style.display = "block";
        video.style.display = "none";
        video.pause();
        previewButtons[previousIndex].disabled = false;
      }
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
// const goPrevious = () => {
//   if (window.scrollY > 5) {
//     goBack.style.display = "none";
//   } else {
//     goBack.style.display = "block";
//   }
// };

//------------------------link Detection ----------------------

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

let previousVideoUrl = null;

continueBtn.style.backgroundColor = colors[randomNumber];
continueBtn.onmouseout = () =>
  (continueBtn.style.backgroundColor = colors[randomNumber]);
continueBtn.onmouseenter = () =>
  (continueBtn.style.backgroundColor = colorsHover[randomNumber]);

continueBtn.addEventListener("click", function () {
  navigator.clipboard
    .readText()
    .then((videoUrl) => {
      if (!linkReg.test(videoUrl) || videoUrl == previousVideoUrl) {
        return;
      }
      runDownloader(videoUrl);
      closeModal();
    })
    .catch((err) => {});
});

function closeModal() {
  modal.style.display = "none";
  document.body.classList.add("scroll");
  window.removeEventListener("focus", readClipboard);
  window.removeEventListener("blur", readClipboard);
  window.removeEventListener("focus", readClipboard2);
  window.removeEventListener("blur", readClipboard2);
}
modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

previousVideoUrl = JSON.parse(sessionStorage.getItem("videoUrl"));

function readClipboard2() {
  navigator.clipboard
    .readText()
    .then((videoUrl) => {
      if (!linkReg.test(videoUrl) || videoUrl == previousVideoUrl) {
        return;
      }
      if (videoUrl !== JSON.parse(sessionStorage.getItem("videoUrl"))) {
        window.addEventListener("focus", readClipboard);
        readClipboard();
      } else {
        closeModal();
      }
      sessionStorage.setItem("videoUrl", JSON.stringify(videoUrl));
    })
    .catch((err) => {});
}

window.addEventListener("focus", readClipboard2);
window.addEventListener("blur", readClipboard2);

function readClipboard() {
  navigator.clipboard
    .readText()
    .then((videoUrl) => {
      if (!linkReg.test(videoUrl) || videoUrl == previousVideoUrl) {
        return;
      }

      sessionStorage.setItem("videoUrl", JSON.stringify(videoUrl));
      convertImage(videoUrl);
    })
    .catch((err) => {});
}

window.addEventListener("focus", readClipboard);
window.addEventListener("blur", readClipboard);

async function convertImage(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);
    if (videoId == "null" || videoId == null) {
      return;
    }
    thumImg.src = `https://i.ytimg.com/vi_webp/${videoId}/mqdefault.webp`;
    modal.style.display = "block";
    document.body.classList.remove("scroll");
    modalData.innerHTML = videoUrl.slice(0, 43);
  } catch (error) {}
}
