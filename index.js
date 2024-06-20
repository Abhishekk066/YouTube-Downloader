require("dotenv").config();
const express = require("express");
process.env.YTDL_NO_UPDATE = "1";
const ytdl = require("ytdl-core");
const cp = require("child_process");
const axios = require("axios");
const CryptoJS = require("crypto-js");
const path = require("path");
const app = express();
const { Client } = require("youtubei");
const youtube = new Client();

function encryptResponse(data, key) {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    key
  ).toString();
  return encryptedData;
}

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/previewImage", async (req, res) => {
  const { videoUrl } = req.body;
  const secretKey = req.body.s;
  try {
    const info = await ytdl.getInfo(videoUrl);

    if (info.videoDetails.isLiveContent == true) {
      res.send("Something is wrong").status(200);
      return;
    }

    const videoId = info.videoDetails.videoId;

    const thumbnailImage = [
      `https://i.ytimg.com/vi_webp/${videoId}/mqdefault.webp`,
      `https://i.ytimg.com/vi_webp/${videoId}/mq1.webp`,
      `https://i.ytimg.com/vi_webp/${videoId}/mq2.webp`,
      `https://i.ytimg.com/vi_webp/${videoId}/mq3.webp`,
    ];

    const promises = thumbnailImage.map(async (url) => {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      return `data:${response.headers["content-type"]};base64,${Buffer.from(
        response.data
      ).toString("base64")}`;
    });

    const thumbnails = await Promise.all(promises);
    const encryptedResponse = encryptResponse(thumbnails, secretKey);
    res.setHeader("Content-Type", "application/json");
    res.send(encryptedResponse);
  } catch (error) {
    console.error("Error processing image data:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/preview", async (req, res) => {
  try {
    const { videoLink } = req.body;
    const secretKey = req.body.s;
    if (!videoLink || videoLink.length === 0) {
      res.status(200).json({ message: "Something is wrong" });
      return;
    }
    const info = await ytdl.getInfo(videoLink);
    const mp4Format = info.formats.filter(
      (element) =>
        element.hasVideo == true &&
        element.hasAudio == true &&
        element.qualityLabel == "360p" &&
        element.container == "mp4"
    );

    const playVideo = mp4Format.map((element) => element.url);
    const encryptedResponse = encryptResponse(playVideo, secretKey);
    res.setHeader("Content-Type", "application/json");
    res.send(encryptedResponse);
  } catch (error) {
    console.error("Error while processing:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/videopreview", async (req, res) => {
  try {
    const { url: videoUrl, q: videoFormat } = req.query;
    console.log(videoFormat);
    if (!videoUrl || !videoFormat) {
      return res
        .status(400)
        .json({ message: "Video URL and quality format are required." });
    }

    const info = await ytdl.getInfo(videoUrl);
    console.log(info.videoDetails.lengthSeconds);

    if (info.videoDetails.isLiveContent) {
      return res
        .status(200)
        .json({ message: "Live content is not supported." });
    }

    const format = info.formats.find(
      (format) =>
        format.qualityLabel === videoFormat &&
        format.container === "mp4" &&
        !format.colorInfo
    );

    const audioFormat = info.formats.find(
      (format) => format.audioBitrate === 128 || format.audioBitrate === 160
    );

    if (!format) {
      throw new Error(
        `Desired quality (${videoFormat}) not available for this video.`
      );
    }

    res.setHeader("Content-Type", "video/mp4");

    const videoStream = ytdl.downloadFromInfo(info, { format });
    const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
    const ffmpegProcess = cp.spawn(
      "ffmpeg",
      [
        "-i",
        "pipe:3",
        "-i",
        "pipe:4",
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "-",
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
      }
    );

    videoStream.pipe(ffmpegProcess.stdio[3]);
    audioStream.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);

    // let mergedSize = 0;
    //let intervalId;

    // ffmpegProcess.stdio[1].on("data", (chunk) => {
    //   mergedSize += chunk.length;
    // });

    // intervalId = setInterval(() => {
    //   let inMb = (mergedSize / (1024 * 1024)).toFixed(2);
    //   console.log(`video Processed Size: ${inMb} Mb`);
    // }, 2000);

    ffmpegProcess.on("close", () => {
      flag = 0;
      //clearInterval(intervalId);
      console.log("ffmpeg process finished");
    });

    req.on("close", () => {
      videoStream.destroy();
      audioStream.destroy();
    });

    req.on("error", (err) => {
      videoStream.destroy();
      audioStream.destroy();
      if (err == "ECONNRESET") {
        return;
      }
      res.end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/suggestions", async (req, res) => {
  const query = req.query.q;
  const secretKey = req.query.s;
  if (!query.trim()) {
    return;
  }
  try {
    const response = await axios.get(
      `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(
        query
      )}`
    );

    const startIndex = response.data.indexOf("[");
    const endIndex = response.data.lastIndexOf("]");
    const suggestionsData = response.data.substring(startIndex, endIndex + 1);

    const suggestionsArray = JSON.parse(suggestionsData);
    const keywords = suggestionsArray[1]
      .map((suggestion) => suggestion[0])
      .filter((keyword) => !/\bdownload\b/i.test(keyword))
      .slice(0, 9);
    const encryptedResponse = encryptResponse(keywords, secretKey);
    res.setHeader("Content-Type", "application/json");
    res.send(encryptedResponse).status(200);
  } catch (error) {
    console.error("Error fetching suggestions");
    res.status(500).json({ error: "Internal server error" });
  }
});

let previousId = [];

app.post("/search", async (req, res) => {
  try {
    const { info, info2, s: secretKey } = req.body;

    if (!info) {
      res.status(200).json({ message: "Something is wrong" });
      return;
    }

    if (info2 === "videos") {
      const videos = await youtube.search(info, {
        type: "video",
      });

      if (!videos) {
        res.status(200).json({ message: "Something is wrong" });
        return;
      }
      data(videos.items, previousId);
      res.status(200).end();
    } else {
      const videos = await youtube.search(info, {
        type: "video",
      });
      const nextVideos = await videos.next();
      if (!videos || !nextVideos) {
        res.status(200).json({ message: "Something is wrong" });
        return;
      }
      nextData(nextVideos);
      res.status(200).end();
    }

    function data(items) {
      const filteredItems = items.filter((t) => !t.isLive && t.duration < 1500);
      const titles = filteredItems.map((t) => t.title);

      const thumbnails = filteredItems.map(
        (t) => `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`
      );

      const videoUrl = filteredItems.map(
        (v) => `https://www.youtube.com/watch?v=${v.id}`
      );

      const ownerName = filteredItems.map((v) => v.channel.name);

      function formatViews(views) {
        if (views >= 1e9) {
          return (views / 1e9).toFixed(0) + "B";
        } else if (views >= 1e6) {
          return (views / 1e6).toFixed(0) + "M";
        } else if (views >= 1e3) {
          return (views / 1e3).toFixed(0) + "K";
        } else {
          return views.toString();
        }
      }

      const videoView = filteredItems.map((v) => formatViews(v.viewCount));

      const videoUpload = filteredItems.map((v) => v.uploadDate);

      const durationsInSeconds = filteredItems.map((video) => video.duration);

      const timestamps = durationsInSeconds.map(convertSecondsToTimestamp);

      function convertSecondsToTimestamp(seconds) {
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let remainingSeconds = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(
          remainingSeconds
        ).padStart(2, "0")}`;
      }

      const videoTimestamps = timestamps.map((timestamp) => {
        const [hours, minutes, seconds] = timestamp.split(":");
        const formattedHours =
          parseInt(hours, 10) !== 0 ? `${parseInt(hours, 10)}:` : "";
        const formattedMinutes = parseInt(minutes, 10).toString();
        const formattedSeconds = parseInt(seconds, 10).toString();
        const newFormattedSeconds =
          formattedSeconds < 10 ? `0${formattedSeconds}` : formattedSeconds;
        return `${formattedHours}${formattedMinutes}:${newFormattedSeconds}`;
      });

      const jsonData = {
        thumbnails,
        titles,
        videoUrl,
        videoTimestamps,
        durationsInSeconds,
        videoView,
        videoUpload,
        ownerName,
      };

      const encryptedResponse = encryptResponse(jsonData, secretKey);
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(encryptedResponse);
    }

    function nextData(items) {
      const filteredItems = items.filter(
        (item) =>
          !item.isLive && item.duration < 1500 && !previousId.includes(item.id)
      );

      const nextTitles = filteredItems.map((item) => item.title);
      const nextThumbnails = filteredItems.map(
        (item) => `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`
      );
      const nextVideoUrl = filteredItems.map(
        (item) => `https://www.youtube.com/watch?v=${item.id}`
      );

      const nextOwnerName = filteredItems.map((v) => v.channel.name);

      function formatViews(views) {
        if (views >= 1e9) {
          return (views / 1e9).toFixed(0) + "B";
        } else if (views >= 1e6) {
          return (views / 1e6).toFixed(0) + "M";
        } else if (views >= 1e3) {
          return (views / 1e3).toFixed(0) + "K";
        } else {
          return views.toString();
        }
      }

      const nextVideoView = filteredItems.map((v) => formatViews(v.viewCount));

      const nextVideoUpload = filteredItems.map((v) => v.uploadDate);

      const videoId = filteredItems.map((item) => item.id);

      const nextDurationInSeconds = filteredItems.map((item) => item.duration);

      previousId = [...previousId, ...videoId];

      const nextTimestamps = nextDurationInSeconds.map(
        convertSecondsToTimestamp
      );

      function convertSecondsToTimestamp(seconds) {
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let remainingSeconds = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(
          remainingSeconds
        ).padStart(2, "0")}`;
      }

      const nextVideoTimestamps = nextTimestamps.map((timestamp) => {
        const [hours, minutes, seconds] = timestamp.split(":");
        const formattedHours =
          parseInt(hours, 10) !== 0 ? `${parseInt(hours, 10)}:` : "";
        const formattedMinutes = parseInt(minutes, 10).toString();
        const formattedSeconds = parseInt(seconds, 10).toString();
        const newFormattedSeconds =
          formattedSeconds < 10 ? `0${formattedSeconds}` : formattedSeconds;
        return `${formattedHours}${formattedMinutes}:${newFormattedSeconds}`;
      });

      const jsonData = {
        thumbnails: nextThumbnails,
        titles: nextTitles,
        videoUrl: nextVideoUrl,
        videoTimestamps: nextVideoTimestamps,
        durationsInSeconds: nextDurationInSeconds,
        videoView: nextVideoView,
        videoUpload: nextVideoUpload,
        ownerName: nextOwnerName,
      };

      const encryptedResponse = encryptResponse(jsonData, secretKey);
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(encryptedResponse);
    }
  } catch (error) {
    console.error("Error while processing");
    res.status(500).json({ error: error.message });
  }
});

app.get("/audio", async (req, res) => {
  try {
    const { url: videoUrl, quality: videoFormat } = req.query;

    const option = {
      quality: "highestaudio",
      filter: "audioonly",
      format: "mp3",
      bitrate: videoFormat,
    };

    const info = await ytdl.getInfo(videoUrl);
    if (info.videoDetails.isLiveContent == true) {
      res.status(200).json({ message: "Something is wrong" });
      return;
    }

    if (!videoUrl && !videoFormat) {
      return res.status(404).end();
    }

    const videoTitle = info.videoDetails.title;
    const videoDuration = parseInt(info.videoDetails.lengthSeconds - 1);
    const sanitizedVideoTitle = videoTitle
      .replace(/ +/g, "_")
      .replace(/\|/g, "")
      .replace(/__+/g, "_");
    const newSanitized = sanitizedVideoTitle
      .replace(/\//g, "")
      .replace(/#/g, "");
    const fileName = `YT_CONVERTER - ${newSanitized}_${videoFormat}k.mp3`;
    const containtLength = (videoFormat * 1000 * videoDuration) / 8;

    const audioStream = ytdl(videoUrl, option);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept", "Bytes");
    res.setHeader("Content-Length", containtLength);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    const ffmpegProcess = cp.spawn(
      "ffmpeg",
      [
        "-i",
        "pipe:4",
        "-ar",
        "44100",
        "-c:a",
        "libmp3lame",
        "-b:a",
        `${videoFormat}k`,
        "-f",
        "mp3",
        "-",
      ],
      { stdio: ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"] }
    );

    audioStream.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);

    ffmpegProcess.on("exit", () => {
      res.end();
    });
    req.on("close", () => {
      audioStream.destroy();
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/video", async (req, res) => {
  try {
    const { url: videoUrl, quality: videoFormat } = req.query;

    if (!videoUrl || !videoFormat) {
      return res
        .status(400)
        .json({ message: "Video URL and quality format are required." });
    }

    const info = await ytdl.getInfo(videoUrl);
    if (info.videoDetails.isLiveContent) {
      return res
        .status(200)
        .json({ message: "Live content is not supported." });
    }

    const format = info.formats.find(
      (format) =>
        format.qualityLabel === videoFormat &&
        format.container === "mp4" &&
        !format.colorInfo
    );

    const audioFormat = info.formats.find(
      (format) => format.audioBitrate === 128
    );

    if (!format) {
      throw new Error(
        `Desired quality (${videoFormat}) not available for this video.`
      );
    }

    const videoTitle = info.videoDetails.title;
    const videoDuration = info.videoDetails.lengthSeconds;
    const sanitizedVideoTitle = videoTitle
      .replace(/ +/g, "_")
      .replace(/\|/g, "")
      .replace(/__+/g, "_")
      .replace(/\//g, "")
      .replace(/#/g, "");
    const fileName = `YT_CONVERTER - ${sanitizedVideoTitle}_${videoFormat}.mp4`;

    const videoBitrate = parseInt(format.contentLength);
    const audioBitrate = parseInt((128 * 1000 * videoDuration) / 8);
    const contentLength = parseInt(videoBitrate + audioBitrate);
    if (videoDuration > 70) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept", "bytes");
      res.setHeader("Content-Length", contentLength);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
    } else {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
    }

    const videoStream = ytdl.downloadFromInfo(info, { format });
    const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
    const ffmpegProcess = cp.spawn(
      "ffmpeg",
      [
        "-i",
        "pipe:3",
        "-i",
        "pipe:4",
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-c:a",
        "copy",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "-loglevel",
        "error",
        "-",
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
      }
    );

    videoStream.pipe(ffmpegProcess.stdio[3]);
    audioStream.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);
    ffmpegProcess.on("exit", () => {
      res.end();
    });
    req.on("close", () => {
      videoStream.destroy();
      audioStream.destroy();
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/process-url", async (req, res) => {
  const { videoUrl } = req.body;
  const secretKey = req.body.s;
  try {
    const info = await ytdl.getInfo(videoUrl);
    if (info.videoDetails.isLiveContent == true) {
      res.send("Can't download live Video").status(200);
      return;
    }
    const thumbnailUrl =
      info.player_response.videoDetails.thumbnail.thumbnails[3].url;
    const videoTitle = info.videoDetails.title;
    const discription = info.videoDetails.description;
    const sanitizedVideoTitle = videoTitle
      .replace(/ +/g, "_")
      .replace(/\|/g, "")
      .replace(/__+/g, "_");
    const newSanitized = sanitizedVideoTitle
      .replace(/\//g, "")
      .replace(/#/g, "");
    const fileName = `YT_CONVERTER - ${newSanitized}`;
    const channelName = info.videoDetails.ownerChannelName;
    const durationInSeconds = parseInt(info.videoDetails.lengthSeconds);
    const timestamp = convertSecondsToTimestamp(durationInSeconds);
    function convertSecondsToTimestamp(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
      ).padStart(2, "0")}`;
    }
    const timeString = timestamp;
    const [hours, minutes, seconds] = timeString.split(":");
    const formattedHours =
      parseInt(hours, 10) !== 0 ? `${parseInt(hours, 10)}:` : "";
    const formattedMinutes = parseInt(minutes, 10).toString();
    const formattedSeconds = parseInt(seconds, 10).toString();
    const videoTimestamp = `${formattedHours}${formattedMinutes}:${formattedSeconds}`;

    const webmFormat = info.formats.filter(
      (element) => element.hasVideo == true && element.container == "webm"
    );
    const mp4Format = info.formats.filter(
      (element) =>
        element.hasVideo == true &&
        element.container == "mp4" &&
        element.hasAudio == false &&
        !element.colorInfo
    );
    const mp3Format = info.formats.filter(
      (element) =>
        element.hasAudio == true &&
        element.hasVideo == false &&
        element.audioBitrate
    );

    const qualityLabelWebm = webmFormat.map((element) => element.qualityLabel);
    //const containerWebm = webmFormat.map((element) => element.container);
    const contentLengthWebm = webmFormat.map(
      (element) => element.contentLength
    );

    const qualityLabelMp4 = mp4Format.map((element) => element.qualityLabel);
    const videoBitrate = mp4Format.map((element) => element.bitrate);
    //const containerMp4 = mp4Format.map((element) => element.container);
    const containLengthMp4 = mp4Format.map((element) => element.contentLength);

    const audioBitrate = mp3Format.map((element) => element.audioBitrate);
    //const containerMp3 = mp3Format.map((element) => element.container);
    //const contentLengthMp3 = mp3Format.map((element) => element.contentLength);
    const qualityLabelMp3 = [...new Set(audioBitrate)];
    const contentLengthMp3InMb = audioBitrate.map((element) =>
      ((element * 1000 * durationInSeconds) / 8 / (1024 * 1024)).toFixed(2)
    );
    const contentLengthMp3Sizes = contentLengthMp3InMb.map((element) =>
      element > 1024 ? (element / 1024).toFixed(2) + " GB" : element + " MB"
    );

    const contentLengthMp4InMb = containLengthMp4.map((element) =>
      (
        element / (1024 * 1024) +
        (128 * 1000 * durationInSeconds) / 8 / (1024 * 1024)
      ).toFixed(2)
    );

    const contentLengthMp4Sizes = contentLengthMp4InMb.map((element) =>
      element > 1024 ? (element / 1024).toFixed(2) + " GB" : element + " MB"
    );

    const data = {
      thumbnailUrl,
      videoTitle,
      fileName,
      channelName,
      videoTimestamp,
      qualityLabelMp3,
      contentLengthMp3Sizes,
      qualityLabelMp4,
      contentLengthMp4Sizes,
      qualityLabelWebm,
      contentLengthWebm,
      discription,
    };
    const encryptedResponse = encryptResponse(data, secretKey);
    res.setHeader("Content-Type", "application/json");
    res.send(encryptedResponse).status(200);
  } catch (error) {
    console.error(`Error processing URL: ${error.message}`);
    res.status(500).send(`Error processing URL: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://127.0.0.1:${PORT}`);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "404.html"));
  res.status(404);
});
