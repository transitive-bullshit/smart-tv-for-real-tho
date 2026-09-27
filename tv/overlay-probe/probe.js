// Static compatibility probe: no device control, credentials, network or audio.
function dismiss() {
  document.getElementById('status').textContent =
    'Close requested. If this stays visible, close the probe with the CLI.'
  window.close()
}
const dismissButton = document.getElementById('dismiss')
dismissButton.addEventListener('click', dismiss)
dismissButton.focus()
window.addEventListener('keydown', (event) => {
  if (event.keyCode === 461 || event.key === 'Escape') {
    event.preventDefault()
    dismiss()
  }
})
setTimeout(dismiss, 60000)
