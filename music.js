// Background music — GitHub Pages / static hosting ONLY.
// This embeds a YouTube iframe, which the sandboxed Claude Artifact CSP
// blocks (only script tags from an allowlisted CDN are permitted there,
// no arbitrary iframes) — so this file is intentionally not loaded by
// artifact.html.
//
// Tries to autoplay unmuted at low volume by default. Most desktop
// browsers allow this; some mobile/strict browsers still block any
// unmuted autoplay with zero interaction — the 🎵 button is the manual
// fallback/mute toggle for those cases, not the primary way to start it.

(function () {
  var VIDEO_ID = "xdLFc3oAhOM";
  var VOLUME = 26; // "halka kore" — kept low

  var player = null;
  var muted = false;
  var seeked = false;

  function setBtn() {
    var btn = document.getElementById("music-toggle");
    if (btn) btn.textContent = muted ? "🔇" : "🔊";
  }

  function randomStart(duration) {
    if (!duration || duration < 20) return 0;
    // pick somewhere in the middle 60% of the track, never past the last 20s
    var lo = Math.min(duration * 0.15, 45);
    var hi = Math.max(lo + 5, duration * 0.75);
    return lo + Math.random() * (hi - lo);
  }

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("yt-bg-player", {
      height: "0",
      width: "0",
      videoId: VIDEO_ID,
      playerVars: { autoplay: 1, mute: 0, controls: 0, loop: 1, playlist: VIDEO_ID },
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
        },
      },
    });
  };

  window.toggleMusic = function () {
    if (!player) return;
    if (muted) {
      player.unMute();
      player.setVolume(VOLUME);
      player.playVideo();
      muted = false;
    } else {
      player.mute();
      muted = true;
    }
    setBtn();
  };

  document.addEventListener("DOMContentLoaded", function () {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
})();
