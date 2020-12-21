let shown = false;
function togglePopup(){
  shown = !shown;

  if(shown) {
    document.getElementById('ip').value = storage.getItem('ip');
    document.getElementById('port').value = storage.getItem('port');
  }
  document.getElementById("popup-1").classList.toggle("active");
}

document.getElementById("popup_form").addEventListener('submit', ev => {
  storage.setItem('ip', document.getElementById('ip').value);
  storage.setItem('port', document.getElementById('port').value);
});