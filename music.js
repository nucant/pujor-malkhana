// Background music — GitHub Pages / static hosting ONLY.
// This embeds a YouTube iframe, which the sandboxed Claude Artifact CSP
// blocks (only script tags from an allowlisted CDN are permitted there,
// no arbitrary iframes) — so this file is intentionally not loaded by
// artifact.html.
//
// The video id is set from Admin > Settings > Background Music (via
// window.setBackgroundMusicVideo, called once app.js loads the config) —
// this file no longer hardcodes a track. Tries to autoplay unmuted at low
// volume; most desktop browsers allow this, some mobile/strict browsers
// still block any unmuted autoplay with zero interaction — the 🎵 button
// is the manual fallback/mute toggle for those cases.

(function () {
  var VOLUME = 26; // "halka kore" — kept low
  var DEFAULT_VIDEO_ID = "xdLFc3oAhOM";

  var player = null;
  var seeked = false;
  var ytReady = false;
  var pendingVideoId = null;
  var currentVideoId = null;

  function setBtn() {
    var btn = document.getElementById("music-toggle");
    if (!btn || !player || !player.getPlayerState) return;
    var reallyPlaying = player.getPlayerState() === 1 && !player.isMuted();
    btn.textContent = reallyPlaying ? "🔊" : "🎵";
  }

  function randomStart(duration) {
    if (!duration || duration < 20) return 0;
    var lo = Math.min(duration * 0.15, 45);
    var hi = Math.max(lo + 5, duration * 0.75);
    return lo + Math.random() * (hi - lo);
  }

  function createOrSwap(videoId) {
    if (!videoId || videoId === currentVideoId) return;
    currentVideoId = videoId;
    seeked = false;
    if (!player) {
      player = new YT.Player("yt-bg-player", {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: { autoplay: 1, mute: 0, controls: 0, loop: 1, playlist: videoId },
        events: {
          onReady: function (e) {
            e.target.setVolume(VOLUME);
            e.target.playVideo();
            setBtn();
          },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.PLAYING && !seeked) {
              seeked = true;
              e.target.seekTo(randomStart(e.target.getDuration()), true);
            }
            setBtn();
          },
        },
      });
    } else {
      player.loadVideoById(videoId);
      player.setVolume(VOLUME);
    }
  }

  window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    createOrSwap(pendingVideoId || DEFAULT_VIDEO_ID);
  };

  window.setBackgroundMusicVideo = function (videoId) {
    pendingVideoId = videoId || DEFAULT_VIDEO_ID;
    if (ytReady) createOrSwap(pendingVideoId);
  };

  window.toggleMusic = function () {
    if (!player || !player.getPlayerState) return;
    var reallyPlaying = player.getPlayerState() === 1 && !player.isMuted();
    if (reallyPlaying) {
      player.mute();
    } else {
      player.unMute();
      player.setVolume(VOLUME);
      player.playVideo();
    }
    setTimeout(setBtn, 150);
  };

  document.addEventListener("DOMContentLoaded", function () {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
})();
