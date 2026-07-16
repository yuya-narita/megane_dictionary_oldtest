/* v41 recovery: isolated fullscreen button. Does not override existing controls. */
(function () {
  function qs(id) {
    return document.getElementById(id);
  }

  function getCurrentMangaImageForFullscreen() {
    const mangaImage = qs("mangaImage");
    if (mangaImage && !mangaImage.hidden && mangaImage.src) {
      return mangaImage.currentSrc || mangaImage.src;
    }

    const webtoonView = qs("webtoonView");
    if (webtoonView) {
      const imgs = Array.from(webtoonView.querySelectorAll("img"));
      if (imgs.length) {
        // Pick the image closest to the top of the visible area
        let best = imgs[0];
        let bestDistance = Infinity;
        const viewRect = webtoonView.getBoundingClientRect();

        imgs.forEach(img => {
          const rect = img.getBoundingClientRect();
          const distance = Math.abs(rect.top - viewRect.top);
          if (distance < bestDistance) {
            best = img;
            bestDistance = distance;
          }
        });

        return best.currentSrc || best.src;
      }
    }

    return "";
  }

  function openMangaFullscreenButton() {
    const overlay = qs("mangaFullscreenOverlay");
    const image = qs("mangaFullscreenImage");
    if (!overlay || !image) return;

    const src = getCurrentMangaImageForFullscreen();
    if (!src) return;

    image.src = src;
    overlay.hidden = false;
  }

  function closeMangaFullscreenButton() {
    const overlay = qs("mangaFullscreenOverlay");
    if (overlay) overlay.hidden = true;
  }

  function bindRecoveryFullscreen() {
    const openButton = qs("mangaOpenFullscreenButton");
    const closeButton = qs("mangaFullscreenClose");

    if (openButton && !openButton.dataset.bound) {
      openButton.dataset.bound = "1";
      openButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMangaFullscreenButton();
      });
      openButton.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMangaFullscreenButton();
      }, { passive: false });
    }

    if (closeButton && !closeButton.dataset.bound) {
      closeButton.dataset.bound = "1";
      closeButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMangaFullscreenButton();
      });
      closeButton.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMangaFullscreenButton();
      }, { passive: false });
    }
  }

  bindRecoveryFullscreen();
  window.addEventListener("load", bindRecoveryFullscreen);
})();


/* v42: external fullscreen button binding */
(function () {
  function qs(id) {
    return document.getElementById(id);
  }

  function getMangaFullscreenSrcV42() {
    const mangaImage = qs("mangaImage");
    if (mangaImage && !mangaImage.hidden && mangaImage.src) {
      return mangaImage.currentSrc || mangaImage.src;
    }

    const webtoonView = qs("webtoonView");
    if (webtoonView) {
      const imgs = Array.from(webtoonView.querySelectorAll("img"));
      if (imgs.length) {
        let best = imgs[0];
        let bestDistance = Infinity;
        const viewRect = webtoonView.getBoundingClientRect();

        imgs.forEach(img => {
          const rect = img.getBoundingClientRect();
          const distance = Math.abs(rect.top - viewRect.top);
          if (distance < bestDistance) {
            best = img;
            bestDistance = distance;
          }
        });

        return best.currentSrc || best.src;
      }
    }

    return "";
  }

  function openFsV42() {
    const overlay = qs("mangaFullscreenOverlay");
    const image = qs("mangaFullscreenImage");
    const src = getMangaFullscreenSrcV42();

    if (!overlay || !image || !src) return;

    image.src = src;
    overlay.hidden = false;
  }

  function closeFsV42() {
    const overlay = qs("mangaFullscreenOverlay");
    if (overlay) overlay.hidden = true;
  }

  function bindFsV42() {
    const btn = qs("mangaOpenFullscreenButton");
    const close = qs("mangaFullscreenClose");

    if (btn && !btn.dataset.v42Bound) {
      btn.dataset.v42Bound = "1";
      ["click", "touchend", "pointerup"].forEach(type => {
        btn.addEventListener(type, (e) => {
          e.preventDefault();
          e.stopPropagation();
          openFsV42();
        }, { passive: false });
      });
    }

    if (close && !close.dataset.v42Bound) {
      close.dataset.v42Bound = "1";
      ["click", "touchend", "pointerup"].forEach(type => {
        close.addEventListener(type, (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeFsV42();
        }, { passive: false });
      });
    }
  }

  bindFsV42();
  window.addEventListener("load", bindFsV42);
  document.addEventListener("DOMContentLoaded", bindFsV42);
})();





/* v48: fullscreen two-layer slide reader */
(function () {
  function q(id) { return document.getElementById(id); }

  function story() {
    try {
      return getCurrentMangaStory();
    } catch (e) {
      return mangaStories[mangaStoryIndex] || mangaStories[0];
    }
  }

  function imagePages() {
    const s = story();
    if (!s || !Array.isArray(s.pages)) return [];
    return s.pages.map(p => p && p.image).filter(Boolean);
  }

  function webtoonImages() {
    const s = story();
    if (!s) return [];
    if (Array.isArray(s.webtoon) && s.webtoon.length) return s.webtoon;
    return imagePages();
  }

  function setCurrentImage() {
    const pages = imagePages();
    const cur = q("fullscreenCurrentPage");
    const incoming = q("fullscreenIncomingPage");
    if (!cur) return;

    cur.src = pages[mangaPageIndex] || "";
    cur.style.transition = "none";
    cur.style.transform = "translateX(0)";
    void cur.offsetWidth;
    cur.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";

    if (incoming) {
      incoming.removeAttribute("src");
      incoming.style.transition = "none";
      incoming.style.transform = "translateX(100%)";
      void incoming.offsetWidth;
      incoming.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";
    }
  }

  function openPageFullscreen() {
    const overlay = q("mangaFullscreenOverlay");
    const reader = q("fullscreenPageReader");
    const webtoon = q("mangaFullscreenWebtoon");
    if (!overlay || !reader || !webtoon) return;

    overlay.hidden = false;
    reader.hidden = false;
    webtoon.hidden = true;
    setCurrentImage();
  }

  function openWebtoonFullscreen() {
    const overlay = q("mangaFullscreenOverlay");
    const reader = q("fullscreenPageReader");
    const webtoon = q("mangaFullscreenWebtoon");
    if (!overlay || !reader || !webtoon) return;

    overlay.hidden = false;
    reader.hidden = true;
    webtoon.hidden = false;
    webtoon.innerHTML = webtoonImages()
      .map((src, i) => `<img src="${src}" alt="webtoon ${i + 1}">`)
      .join("");
    webtoon.scrollTop = 0;
  }

  window.openMangaFullscreenFromButton = function () {
    if (mangaReadMode === "webtoon") openWebtoonFullscreen();
    else openPageFullscreen();
  };

  window.closeMangaFullscreen = function () {
    const overlay = q("mangaFullscreenOverlay");
    if (overlay) overlay.hidden = true;
  };

  function bindV48() {
    const openBtn = q("mangaOpenFullscreenButton");
    const closeBtn = q("mangaFullscreenClose");
    const reader = q("fullscreenPageReader");
    const cur = q("fullscreenCurrentPage");
    const incoming = q("fullscreenIncomingPage");

    if (openBtn && !openBtn.dataset.v48) {
      openBtn.dataset.v48 = "1";
      ["click", "touchend", "pointerup"].forEach(type => {
        openBtn.addEventListener(type, e => {
          e.preventDefault();
          e.stopPropagation();
          window.openMangaFullscreenFromButton();
        }, { passive: false });
      });
    }

    if (closeBtn && !closeBtn.dataset.v48) {
      closeBtn.dataset.v48 = "1";
      ["click", "touchend", "pointerup"].forEach(type => {
        closeBtn.addEventListener(type, e => {
          e.preventDefault();
          e.stopPropagation();
          window.closeMangaFullscreen();
        }, { passive: false });
      });
    }

    if (reader && cur && incoming && !reader.dataset.v48) {
      reader.dataset.v48 = "1";
      let sx = 0, sy = 0, dx = 0, dragging = false, direction = 0;

      function prepareIncoming(dir) {
        const pages = imagePages();
        const nextIndex = mangaPageIndex + dir;
        if (nextIndex < 0 || nextIndex >= pages.length) return false;

        direction = dir;
        incoming.src = pages[nextIndex];
        incoming.style.transition = "none";
        incoming.style.transform = dir > 0 ? "translateX(100%)" : "translateX(-100%)";
        cur.style.transition = "none";
        cur.style.transform = "translateX(0)";
        void incoming.offsetWidth;
        incoming.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";
        cur.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";
        return true;
      }

      function start(x, y) {
        if (mangaReadMode !== "page") return;
        sx = x; sy = y; dx = 0; dragging = true; direction = 0;
        cur.style.transition = "none";
        incoming.style.transition = "none";
      }

      function move(x, y) {
        if (!dragging) return;
        dx = x - sx;
        const dy = y - sy;
        if (Math.abs(dx) < Math.abs(dy)) return;

        const dir = dx < 0 ? 1 : -1;
        if (direction !== dir) {
          if (!prepareIncoming(dir)) {
            cur.style.transform = `translateX(${dx * 0.18}px)`;
            return;
          }
        }

        cur.style.transform = `translateX(${dx}px)`;
        incoming.style.transform = direction > 0
          ? `translateX(calc(100% + ${dx}px))`
          : `translateX(calc(-100% + ${dx}px))`;
      }

      function end(x, y) {
        if (!dragging) return;
        dragging = false;

        dx = x - sx;
        const dy = y - sy;
        cur.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";
        incoming.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";

        if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.05 && direction !== 0) {
          cur.style.transform = direction > 0 ? "translateX(-100%)" : "translateX(100%)";
          incoming.style.transform = "translateX(0)";

          setTimeout(() => {
            moveMangaPage(direction);
            setCurrentImage();
          }, 285);
        } else {
          cur.style.transform = "translateX(0)";
          incoming.style.transform = direction > 0 ? "translateX(100%)" : "translateX(-100%)";
        }
      }

      reader.addEventListener("touchstart", e => {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) start(t.clientX, t.clientY);
      }, { passive: true });

      reader.addEventListener("touchmove", e => {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) move(t.clientX, t.clientY);
      }, { passive: true });

      reader.addEventListener("touchend", e => {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) end(t.clientX, t.clientY);
      }, { passive: true });

      reader.addEventListener("pointerdown", e => start(e.clientX, e.clientY));
      reader.addEventListener("pointermove", e => move(e.clientX, e.clientY));
      reader.addEventListener("pointerup", e => end(e.clientX, e.clientY));
      reader.addEventListener("pointercancel", () => {
        dragging = false;
        setCurrentImage();
      });
    }
  }

  bindV48();
  window.addEventListener("load", bindV48);
  document.addEventListener("DOMContentLoaded", bindV48);
})();

(function(){
  const cur = document.getElementById("fullscreenCurrentPage");
  const incoming = document.getElementById("fullscreenIncomingPage");
  if(!cur || !incoming) return;

  let sx=0, dx=0, dragging=false, direction=0;

  function start(x){
    sx=x; dx=0; dragging=true;
    cur.style.transition="none";
    incoming.style.transition="none";
  }

  function move(x){
    if(!dragging) return;
    dx = x - sx;
    const moveX = dx * 0.9;
    cur.style.transform = `translateX(${moveX}px)`;
    if(direction!==0){
      incoming.style.transform = direction>0
        ? `translateX(calc(85% + ${moveX}px))`
        : `translateX(calc(-85% + ${moveX}px))`;
    }
  }

  function end(){
    if(!dragging) return;
    dragging=false;

    cur.style.transition="";
    incoming.style.transition="";

    if(Math.abs(dx)>80){
      const dir = dx<0 ? 1 : -1;
      cur.style.transform = dir>0 ? "translateX(-100%)":"translateX(100%)";
      incoming.style.transform = "translateX(0)";
      setTimeout(()=>{
        if(window.moveMangaPage) moveMangaPage(dir);
        if(window.setCurrentImage) setCurrentImage();
      },320);
    }else{
      cur.style.transform="translateX(0)";
      incoming.style.transform = direction>0 ? "translateX(85%)":"translateX(-85%)";
    }
    dx=0; direction=0;
  }

  const reader = document.getElementById("fullscreenPageReader");
  if(reader){
    reader.addEventListener("pointerdown", e=>{direction=0; start(e.clientX);});
    reader.addEventListener("pointermove", e=>{
      const newDx = e.clientX - sx;
      if(newDx<0) direction=1;
      if(newDx>0) direction=-1;
      move(e.clientX);
    });
    reader.addEventListener("pointerup", end);
    reader.addEventListener("pointercancel", end);
  }
})();





/* v51: normal page reader single swipe handler */
(function () {
  function q(id) { return document.getElementById(id); }

  function story() {
    try {
      return getCurrentMangaStory();
    } catch (e) {
      return mangaStories[mangaStoryIndex] || mangaStories[0];
    }
  }

  function imagePages() {
    const s = story();
    if (!s || !Array.isArray(s.pages)) return [];
    return s.pages.map(p => p && p.image).filter(Boolean);
  }

  function setIncomingImage(dir) {
    const incoming = q("mangaIncomingImage");
    if (!incoming) return false;

    const pages = imagePages();
    const nextIndex = mangaPageIndex + dir;

    if (nextIndex < 0 || nextIndex >= pages.length) {
      incoming.hidden = true;
      return false;
    }

    incoming.src = pages[nextIndex];
    incoming.hidden = false;
    incoming.style.transition = "none";
    incoming.style.transform = dir > 0 ? "translateX(85%)" : "translateX(-85%)";
    void incoming.offsetWidth;
    incoming.style.transition = "transform .32s cubic-bezier(.22,.9,.3,1)";
    return true;
  }

  function resetNormalSlide() {
    const cur = q("mangaImage");
    const incoming = q("mangaIncomingImage");
    if (!cur || !incoming) return;

    cur.style.transition = "none";
    cur.style.transform = "translateX(0)";
    incoming.style.transition = "none";
    incoming.style.transform = "translateX(85%)";
    incoming.hidden = true;

    void cur.offsetWidth;

    cur.style.transition = "transform .32s cubic-bezier(.22,.9,.3,1)";
    incoming.style.transition = "transform .32s cubic-bezier(.22,.9,.3,1)";
  }

  function bindNormalSlideV51() {
    const page = q("mangaPage");
    const cur = q("mangaImage");
    const incoming = q("mangaIncomingImage");

    if (!page || !cur || !incoming || page.dataset.v51) return;
    page.dataset.v51 = "1";

    let sx = 0;
    let sy = 0;
    let dx = 0;
    let dragging = false;
    let direction = 0;
    let locked = false;
    let pointerActive = false;

    function isActive() {
      return appMode === "manga" &&
        mangaState === "reader" &&
        mangaReadMode === "page" &&
        page.classList.contains("image-page");
    }

    function start(x, y, e) {
      if (!isActive() || locked) return;
      sx = x;
      sy = y;
      dx = 0;
      direction = 0;
      dragging = true;

      cur.style.transition = "none";
      incoming.style.transition = "none";

      if (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    function move(x, y, e) {
      if (!dragging || !isActive() || locked) return;

      dx = x - sx;
      const dy = y - sy;

      if (Math.abs(dx) < Math.abs(dy)) return;

      if (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }

      const dir = dx < 0 ? 1 : -1;
      if (direction !== dir) {
        direction = dir;
        if (!setIncomingImage(dir)) {
          cur.style.transform = `translateX(${dx * 0.18}px)`;
          return;
        }
      }

      const moveX = dx * 0.9;
      cur.style.transform = `translateX(${moveX}px)`;
      incoming.style.transform = direction > 0
        ? `translateX(calc(85% + ${moveX}px))`
        : `translateX(calc(-85% + ${moveX}px))`;
    }

    function end(x, y, e) {
      if (!dragging || !isActive() || locked) return;

      dragging = false;
      dx = x - sx;
      const dy = y - sy;

      cur.style.transition = "transform .32s cubic-bezier(.22,.9,.3,1)";
      incoming.style.transition = "transform .32s cubic-bezier(.22,.9,.3,1)";

      if (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }

      if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.05 && direction !== 0) {
        const pages = imagePages();
        const target = mangaPageIndex + direction;

        if (target < 0 || target >= pages.length) {
          cur.style.transform = "translateX(0)";
          incoming.style.transform = direction > 0 ? "translateX(85%)" : "translateX(-85%)";
          return;
        }

        locked = true;

        cur.style.transform = direction > 0 ? "translateX(-100%)" : "translateX(100%)";
        incoming.style.transform = "translateX(0)";

        setTimeout(() => {
          moveMangaPage(direction);
          resetNormalSlide();

          // Prevent other late handlers from causing another page turn
          setTimeout(() => {
            locked = false;
          }, 180);
        }, 320);
      } else {
        cur.style.transform = "translateX(0)";
        incoming.style.transform = direction > 0 ? "translateX(85%)" : "translateX(-85%)";
      }
    }

    // Use pointer events as the primary path.
    page.addEventListener("pointerdown", e => {
      pointerActive = true;
      start(e.clientX, e.clientY, e);
    }, true);

    page.addEventListener("pointermove", e => {
      if (!pointerActive) return;
      move(e.clientX, e.clientY, e);
    }, true);

    page.addEventListener("pointerup", e => {
      if (!pointerActive) return;
      end(e.clientX, e.clientY, e);
      pointerActive = false;
    }, true);

    page.addEventListener("pointercancel", e => {
      dragging = false;
      pointerActive = false;
      resetNormalSlide();
      if (e) e.stopImmediatePropagation();
    }, true);

    // Touch fallback only when pointer path is not active.
    page.addEventListener("touchstart", e => {
      if (pointerActive) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (t) start(t.clientX, t.clientY, e);
    }, { passive: false, capture: true });

    page.addEventListener("touchmove", e => {
      if (pointerActive) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (t) move(t.clientX, t.clientY, e);
    }, { passive: false, capture: true });

    page.addEventListener("touchend", e => {
      if (pointerActive) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (t) end(t.clientX, t.clientY, e);
    }, { passive: false, capture: true });
  }

  bindNormalSlideV51();
  window.addEventListener("load", bindNormalSlideV51);
  document.addEventListener("DOMContentLoaded", bindNormalSlideV51);
})();
