// Actualizar estado (leads, appointments)
function updateStatus(select) {
  const id = select.dataset.id;
  const type = select.dataset.type;
  const status = select.value;

  fetch(`/api/${type}/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(() => {
      select.style.borderColor = '#25d366';
      setTimeout(() => { select.style.borderColor = '#ddd'; }, 1500);
    })
    .catch(() => {
      alert('Error al actualizar el estado');
    });
}

// Guardar nota en lead
function saveNote(input) {
  const id = input.dataset.id;
  const notes = input.value;

  fetch(`/api/leads/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  })
    .then(r => r.json())
    .then(() => {
      input.style.borderColor = '#25d366';
      setTimeout(() => { input.style.borderColor = '#eee'; }, 1500);
    })
    .catch(() => {
      alert('Error al guardar la nota');
    });
}
