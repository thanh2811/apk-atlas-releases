/**
 * iAtlas docs — OS detect, download CTA, setup tabs.
 * Binaries live on public repo thanh2811/apk-atlas-releases.
 */
(function () {
  var RELEASES_URL = "https://github.com/thanh2811/apk-atlas-releases/releases";
  var MACOS_ARM64_DMG =
    "https://github.com/thanh2811/apk-atlas-releases/releases/download/v1.0.0/iAtlas-1.0.0-macos-arm64.dmg";
  var DOWNLOADS = {
    "macos-arm64": {
      url: MACOS_ARM64_DMG,
      label: "macOS Apple Silicon",
      short: "Apple Silicon",
      ext: "DMG",
    },
    "macos-x64": {
      url: RELEASES_URL,
      label: "macOS Intel",
      short: "Intel",
      ext: "DMG",
    },
    "windows-x64": {
      url: RELEASES_URL,
      label: "Windows x64",
      short: "Windows",
      ext: "MSI",
    },
  };

  function isAppleSiliconRenderer() {
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return false;
      var info = gl.getExtension("WEBGL_debug_renderer_info");
      if (!info) return false;
      var renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "");
      return /Apple M\d|Apple GPU/i.test(renderer);
    } catch (e) {
      return false;
    }
  }

  function detectOsKey() {
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    if (/Win/i.test(platform) || /Windows NT/i.test(ua)) {
      return "windows-x64";
    }
    if (/Mac/i.test(platform) || /Mac OS X|Macintosh/i.test(ua)) {
      if (/arm64|aarch64/i.test(ua) || isAppleSiliconRenderer()) {
        return "macos-arm64";
      }
      if (navigator.userAgentData && /arm/i.test(navigator.userAgentData.architecture || "")) {
        return "macos-arm64";
      }
      // MacIntel is reported on both Intel and Apple Silicon — default arm64; refine via UA-CH.
      return "macos-arm64";
    }
    return "macos-arm64";
  }

  function refineMacOsKey(callback) {
    if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) {
      callback(detectOsKey());
      return;
    }
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    if (!(/Mac/i.test(platform) || /Mac OS X|Macintosh/i.test(ua))) {
      callback(detectOsKey());
      return;
    }
    navigator.userAgentData
      .getHighEntropyValues(["architecture", "bitness"])
      .then(function (values) {
        if (/arm/i.test(values.architecture || "")) {
          callback("macos-arm64");
        } else if (/x86/i.test(values.architecture || "")) {
          callback("macos-x64");
        } else {
          callback(detectOsKey());
        }
      })
      .catch(function () {
        callback(detectOsKey());
      });
  }

  function applyDownload(osKey) {
    var meta = DOWNLOADS[osKey] || DOWNLOADS["macos-arm64"];
    var btn = document.getElementById("downloadBtn");
    var label = document.getElementById("downloadOsLabel");
    if (btn) {
      btn.href = meta.url;
      btn.setAttribute("data-os", osKey);
      btn.setAttribute("aria-label", "Tải iAtlas cho " + meta.label + " (" + meta.ext + ")");
    }
    if (label) {
      label.textContent = meta.label + " · " + meta.ext;
    }
  }

  function activateSetupTab(osKey) {
    var root = document.getElementById("osTabs");
    if (!root) return;
    var key = DOWNLOADS[osKey] ? osKey : "macos-arm64";
    Array.prototype.forEach.call(root.querySelectorAll("[data-os-tab]"), function (btn) {
      var active = btn.getAttribute("data-os-tab") === key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.setAttribute("tabindex", active ? "0" : "-1");
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-os-panel]"), function (panel) {
      var active = panel.getAttribute("data-os-panel") === key;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function bindSetupTabs() {
    var root = document.getElementById("osTabs");
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-os-tab]"), function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-os-tab");
        activateSetupTab(key);
        applyDownload(key);
      });
    });
  }

  function bindNav() {
    var btn = document.getElementById("menuBtn");
    var backdrop = document.getElementById("navBackdrop");
    if (!btn) return;
    function closeNav() {
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
      if (backdrop) backdrop.hidden = true;
    }
    function toggleNav() {
      var open = document.body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (backdrop) backdrop.hidden = !open;
    }
    btn.addEventListener("click", toggleNav);
    if (backdrop) backdrop.addEventListener("click", closeNav);
  }

  function init() {
    bindNav();
    bindSetupTabs();
    var initial = detectOsKey();
    applyDownload(initial);
    activateSetupTab(initial);
    refineMacOsKey(function (key) {
      applyDownload(key);
      activateSetupTab(key);
    });
  }

  window.IAtlasDocs = {
    DOWNLOADS: DOWNLOADS,
    detectOsKey: detectOsKey,
    applyDownload: applyDownload,
    activateSetupTab: activateSetupTab,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
