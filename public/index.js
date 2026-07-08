    const menuBtn = document.getElementById("menuBtn");
    const mobileNav = document.getElementById("mobileNav");

    menuBtn.addEventListener("click", () => {
      const opened = mobileNav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(opened));
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
