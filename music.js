// Background music — GitHub Pages / static hosting ONLY.
// This embeds a YouTube iframe, which the sandboxed Claude Artifact CSP
// blocks (only script tags from an allowlisted CDN are permitted there,
// no arbitrary iframes) — so this file is intentionally not loaded by
// artifact.html. Autoplay-with-sound is also blocked by every modern
// browser until the viewer interacts with the page; the toggle button
// below is what actually starts audio on the first tap.

(function () {
  var PLAYLIST_ID = "PLOdxnIRFWRIyDPxxqz6eIq0indz5BuKHn";
  var MIN_START = 60; // never start earlier than 1 min into a track
  var MAX_START = 180;
  var VOLUME = 26; // "halka kore" — kept low

  var player = null;
  var playing = false;
  var seeked = false;

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("yt-bg-player", {
      height: "0",
      width: "0",
      playerVars: {
        listType: "playlist",
        list: PLAYLIST_ID,
        index: Math.floor(Math.random() * 15),
        autoplay: 0,
        mute: 1,
        controls: 0,
      },
      events: {
        onReady: function (e) {
          e.target.setVolume(VOLUME);
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING && !seeked) {
            seeked = true;
            var startAt = MIN_START + Math.floor(Math.random() * (MAX_START - MIN_START));
            e.target.seekTo(startAt, true);
          }
        },
      },
    });
  };

  window.toggleMusic = function () {
    if (!player) return;
    var btn = document.getElementById("music-toggle");
    if (!playing) {
      player.unMute();
      player.setVolume(VOLUME);
      player.playVideo();
      playing = true;
      if (btn) btn.textContent = "🔊";
    } else {
      player.pauseVideo();
      playing = false;
      if (btn) btn.textContent = "🎵";
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
})();
