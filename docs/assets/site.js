/**
 * iAtlas docs — OS detect, download CTA, setup tabs, visit counter.
 * Binaries live on public repo thanh2811/apk-atlas-releases.
 */
(function () {
  var RELEASES_URL = "https://github.com/thanh2811/apk-atlas-releases/releases";
  var MACOS_ARM64_DMG =
    "https://github.com/thanh2811/apk-atlas-releases/releases/download/v1.0.2/iAtlas-1.0.2-macos-arm64.dmg";
  var WINDOWS_X64_EXE =
    "https://github.com/thanh2811/apk-atlas-releases/releases/download/v1.0.0/iAtlas-1.0.0-windows-x64.exe";
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
      url: WINDOWS_X64_EXE,
      label: "Windows x64",
      short: "Windows",
      ext: "EXE",
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

  /** Highlights the platform pill matching the visitor's machine (trang giới thiệu). */
  function markCurrentPlatform(osKey) {
    var family = osKey.indexOf("windows") === 0 ? "windows" : "mac";
    Array.prototype.forEach.call(document.querySelectorAll("[data-platform]"), function (pill) {
      var current = pill.getAttribute("data-platform") === family;
      pill.classList.toggle("is-current", current);
      if (current) {
        pill.setAttribute("title", "Máy bạn đang dùng");
      } else {
        pill.removeAttribute("title");
      }
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

  /**
   * Generic tab groups (`[data-tabs]`) — unlike the OS tabs these carry no download logic,
   * so the first tab simply stays the default.
   */
  function bindPlainTabs() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (group) {
      var tabs = group.querySelectorAll("[data-tab]");
      Array.prototype.forEach.call(tabs, function (tab) {
        tab.addEventListener("click", function () {
          var key = tab.getAttribute("data-tab");
          Array.prototype.forEach.call(tabs, function (other) {
            var active = other === tab;
            other.classList.toggle("is-active", active);
            other.setAttribute("aria-selected", active ? "true" : "false");
            other.setAttribute("tabindex", active ? "0" : "-1");
          });
          Array.prototype.forEach.call(group.querySelectorAll("[data-panel]"), function (panel) {
            var active = panel.getAttribute("data-panel") === key;
            panel.classList.toggle("is-active", active);
            panel.hidden = !active;
          });
        });
      });
    });
  }

  /**
   * Click any screenshot to blow it up in an overlay; click it again, the ✕, the backdrop
   * or Esc to close. Anchors around the images stay as the no-JS fallback.
   */
  function bindLightbox() {
    var shots = document.querySelectorAll(".shot img");
    if (!shots.length) return;

    var overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Đóng ảnh">✕</button>' +
      '<img class="lightbox-img" alt="">';
    document.body.appendChild(overlay);
    var big = overlay.querySelector(".lightbox-img");

    function close() {
      overlay.hidden = true;
      document.body.classList.remove("lightbox-open");
      big.src = "";
    }

    function open(src, alt) {
      big.src = src;
      big.alt = alt || "";
      overlay.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    Array.prototype.forEach.call(shots, function (img) {
      // The anchor, when present, is what receives the click.
      var trigger = img.closest("a") || img;
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        open(img.getAttribute("src"), img.getAttribute("alt"));
      });
      if (trigger === img) img.style.cursor = "zoom-in";
    });

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) close();
    });
  }

  /**
   * Demo page: a slot whose screenshot has not been added yet renders a dashed
   * placeholder naming the file to drop in, so adding images needs no HTML edit.
   */
  function bindDemoSlots() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-demo-slot]"), function (figure) {
      var img = figure.querySelector("img");
      if (!img) return;

      function showPlaceholder() {
        if (figure.classList.contains("is-empty")) return;
        figure.classList.add("is-empty");
        var trigger = img.closest("a") || img;
        var box = document.createElement("div");
        box.className = "demo-empty";

        var icon = document.createElement("span");
        icon.className = "demo-empty-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "+";

        var title = document.createElement("span");
        title.className = "demo-empty-title";
        title.textContent = "Chưa có ảnh demo";

        var file = document.createElement("code");
        file.className = "demo-empty-file";
        file.textContent = "docs/assets/demo/" + figure.getAttribute("data-demo-slot");

        var hint = document.createElement("span");
        hint.className = "demo-empty-hint";
        hint.textContent = "Thả ảnh vào đúng đường dẫn trên rồi tải lại trang.";

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(file);
        box.appendChild(hint);
        trigger.parentNode.replaceChild(box, trigger);
      }

      img.addEventListener("error", showPlaceholder);
      // Cached failures fire before this listener is attached.
      if (img.complete && img.naturalWidth === 0) showPlaceholder();
    });
  }

  /**
   * Visit counter — same Firebase project as the desktop app (iatlas-150ce).
   * The page signs in anonymously, then increments `site_stats/docs.visits`
   * through the Firestore REST API; the web API key is public by design.
   *
   * A browser is counted once per calendar day; later views only read the total.
   * Requires these Firestore rules:
   *
   *   match /site_stats/{docId} {
   *     allow read: if request.auth != null;
   *     allow create: if request.auth != null && request.resource.data.visits == 1;
   *     allow update: if request.auth != null
   *       && request.resource.data.visits == resource.data.visits + 1
   *       && request.resource.data.diff(resource.data).affectedKeys()
   *            .hasOnly(['visits', 'lastVisitAt']);
   *   }
   */
  var FIREBASE = {
    apiKey: "AIzaSyC74uxUOAPsXvCfN7wDutcZezUisdbj6zg",
    projectId: "iatlas-150ce",
    docPath: "site_stats/docs",
    field: "visits",
  };
  var STORE_REFRESH = "iatlas.docs.refreshToken";
  var STORE_DAY = "iatlas.docs.countedDay";

  function readStore(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* private mode — counting still works, just not deduped */
    }
  }

  function documentName() {
    return (
      "projects/" + FIREBASE.projectId + "/databases/(default)/documents/" + FIREBASE.docPath
    );
  }

  function postJson(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /** Reuses the stored refresh token so repeat visitors don't create new anon users. */
  function idToken() {
    var refresh = readStore(STORE_REFRESH);
    if (refresh) {
      return postJson("https://securetoken.googleapis.com/v1/token?key=" + FIREBASE.apiKey, {
        grant_type: "refresh_token",
        refresh_token: refresh,
      })
        .then(function (data) {
          return data.id_token;
        })
        .catch(signInAnonymously);
    }
    return signInAnonymously();
  }

  function signInAnonymously() {
    return postJson(
      "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + FIREBASE.apiKey,
      { returnSecureToken: true }
    ).then(function (data) {
      if (data.refreshToken) writeStore(STORE_REFRESH, data.refreshToken);
      return data.idToken;
    });
  }

  /** Atomic +1 on the server; the response carries the new total. */
  function incrementVisits(token) {
    var url =
      "https://firestore.googleapis.com/v1/projects/" +
      FIREBASE.projectId +
      "/databases/(default)/documents:commit";
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        writes: [
          {
            // Empty updateMask = touch no field directly, so the doc is created
            // if missing and the transforms below do the actual work.
            update: { name: documentName() },
            updateMask: { fieldPaths: [] },
            updateTransforms: [
              { fieldPath: FIREBASE.field, increment: { integerValue: "1" } },
              { fieldPath: "lastVisitAt", setToServerValue: "REQUEST_TIME" },
            ],
          },
        ],
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var results = (data.writeResults && data.writeResults[0].transformResults) || [];
        return results.length ? Number(results[0].integerValue) : null;
      });
  }

  function readVisits(token) {
    var url =
      "https://firestore.googleapis.com/v1/projects/" +
      FIREBASE.projectId +
      "/databases/(default)/documents/" +
      FIREBASE.docPath;
    return fetch(url, { headers: { Authorization: "Bearer " + token } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var field = data.fields && data.fields[FIREBASE.field];
        return field ? Number(field.integerValue) : 0;
      });
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Fills the footer counter:
   * 1. sign in anonymously (or refresh the stored session);
   * 2. first view of the day increments, later views only read;
   * 3. show the total — on any failure the counter stays hidden.
   */
  function bindVisitCounter() {
    var box = document.getElementById("visitCounter");
    var value = document.getElementById("visitCount");
    if (!box || !value) return;
    var firstToday = readStore(STORE_DAY) !== today();

    idToken()
      .then(function (token) {
        if (!firstToday) return readVisits(token);
        return incrementVisits(token).then(function (total) {
          writeStore(STORE_DAY, today());
          return total === null ? readVisits(token) : total;
        });
      })
      .then(function (total) {
        if (typeof total !== "number" || isNaN(total)) return;
        value.textContent = total.toLocaleString("vi-VN");
        box.hidden = false;
      })
      .catch(function () {
        /* offline or rules not deployed — leave the counter hidden */
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
    bindPlainTabs();
    bindDemoSlots();
    bindLightbox();
    bindVisitCounter();
    var initial = detectOsKey();
    applyDownload(initial);
    activateSetupTab(initial);
    markCurrentPlatform(initial);
    refineMacOsKey(function (key) {
      applyDownload(key);
      activateSetupTab(key);
      markCurrentPlatform(key);
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
