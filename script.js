document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  const form = document.getElementById("contact-form");
  if (form) form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(`[Vikora website] ${data.get("topic")}`);
    const body = encodeURIComponent(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\nTopic: ${data.get("topic")}\n\n${data.get("message")}`);
    // Replace this placeholder with the real monitored support email before launch.
    const supportEmail = "REPLACE-WITH-SUPPORT-EMAIL";
    if (supportEmail.startsWith("REPLACE-")) {
      document.getElementById("form-note").textContent = "The form is a starter only. Configure your support email or connect a secure form service before launch.";
      return;
    }
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  });
});