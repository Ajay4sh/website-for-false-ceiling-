// Small enhancements; every page also works without JavaScript.
document.addEventListener("change", (event) => {
  if (event.target.matches("select[data-autosubmit]")) event.target.form.requestSubmit();
});

document.addEventListener("submit", (event) => {
  const message = event.target.getAttribute("data-confirm");
  if (message && !window.confirm(message)) event.preventDefault();
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-print]")) window.print();
});
