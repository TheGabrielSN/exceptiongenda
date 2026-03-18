const STORAGE_KEY = 'agenda_semanal_cache_v1';

const DAYS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

function createInitialState() {
  const days = {};
  let i = 0;

  while (i < DAYS.length) {
    days[DAYS[i].key] = [];
    i += 1;
  }

  return {
    referenceDate: '',
    lastWeeklyCleanup: '',
    days: days
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed.days) {
      return createInitialState();
    }

    let i = 0;
    while (i < DAYS.length) {
      if (!Array.isArray(parsed.days[DAYS[i].key])) {
        parsed.days[DAYS[i].key] = [];
      }
      i += 1;
    }

    if (typeof parsed.referenceDate !== 'string') {
      parsed.referenceDate = '';
    }

    if (typeof parsed.lastWeeklyCleanup !== 'string') {
      parsed.lastWeeklyCleanup = '';
    }

    return parsed;
  } catch (error) {
    return createInitialState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getMondayOfWeek(date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + diff);

  return base;
}

function runWeeklyCleanupIfNeeded() {
  const now = new Date();
  const monday = getMondayOfWeek(now);
  const currentMondayKey = formatDate(monday);

  if (state.lastWeeklyCleanup === currentMondayKey) {
    return;
  }

  let i = 0;
  while (i < DAYS.length) {
    const dayKey = DAYS[i].key;
    const events = state.days[dayKey];
    const pinnedEvents = [];
    let j = 0;

    while (j < events.length) {
      if (events[j].pinned === true) {
        pinnedEvents.push(events[j]);
      }
      j += 1;
    }

    state.days[dayKey] = pinnedEvents;
    i += 1;
  }

  state.lastWeeklyCleanup = currentMondayKey;
  saveState();
}

function createEvent(text) {
  return {
    id: Date.now().toString() + '_' + Math.random().toString(16).slice(2),
    text: text,
    completed: false,
    pinned: false
  };
}

function addEvent(dayKey, text) {
  const cleanText = text.trim();

  if (!cleanText) {
    return;
  }

  state.days[dayKey].push(createEvent(cleanText));
  saveState();
  render();
}

function toggleComplete(dayKey, eventId) {
  const events = state.days[dayKey];
  let i = 0;

  while (i < events.length) {
    if (events[i].id === eventId) {
      events[i].completed = !events[i].completed;
      break;
    }
    i += 1;
  }

  saveState();
  render();
}

function togglePin(dayKey, eventId) {
  const events = state.days[dayKey];
  let i = 0;

  while (i < events.length) {
    if (events[i].id === eventId) {
      events[i].pinned = !events[i].pinned;
      break;
    }
    i += 1;
  }

  saveState();
  render();
}

function deleteEvent(dayKey, eventId) {
  const events = state.days[dayKey];
  const updated = [];
  let i = 0;

  while (i < events.length) {
    if (events[i].id !== eventId) {
      updated.push(events[i]);
    }
    i += 1;
  }

  state.days[dayKey] = updated;
  saveState();
  render();
}

function clearNonPinnedEvents() {
  let i = 0;

  while (i < DAYS.length) {
    const dayKey = DAYS[i].key;
    const events = state.days[dayKey];
    const updated = [];
    let j = 0;

    while (j < events.length) {
      if (events[j].pinned === true) {
        updated.push(events[j]);
      }
      j += 1;
    }

    state.days[dayKey] = updated;
    i += 1;
  }

  saveState();
  render();
}

function buildEventItem(dayKey, event) {
  const item = document.createElement('div');
  item.className = 'event-item';

  if (event.pinned) {
    item.classList.add('fixed');
  }

  if (event.completed) {
    item.classList.add('completed');
  }

  const textBlock = document.createElement('div');
  textBlock.className = 'event-text';

  const text = document.createElement('p');
  text.textContent = event.text;
  textBlock.appendChild(text);

  const tags = document.createElement('div');
  tags.className = 'event-tags';

  if (event.pinned) {
    const fixedTag = document.createElement('span');
    fixedTag.className = 'tag fixed';
    fixedTag.textContent = 'Fixado';
    tags.appendChild(fixedTag);
  }

  if (event.completed) {
    const doneTag = document.createElement('span');
    doneTag.className = 'tag done';
    doneTag.textContent = 'Concluído';
    tags.appendChild(doneTag);
  }

  if (tags.children.length > 0) {
    textBlock.appendChild(tags);
  }

  const rightActions = document.createElement('div');
  rightActions.className = 'event-actions';

  const completeBtn = document.createElement('button');
  completeBtn.className = 'icon-button complete-btn';
  completeBtn.type = 'button';
  completeBtn.title = event.completed ? 'Marcar como não concluído' : 'Marcar como concluído';
  completeBtn.textContent = '✓';

  if (event.completed) {
    completeBtn.classList.add('active');
  }

  completeBtn.addEventListener('click', function () {
    toggleComplete(dayKey, event.id);
  });

  const pinBtn = document.createElement('button');
  pinBtn.className = 'icon-button pin-btn';
  pinBtn.type = 'button';
  pinBtn.title = event.pinned ? 'Desafixar evento' : 'Fixar evento';
  pinBtn.textContent = event.pinned ? '★' : '☆';

  if (event.pinned) {
    pinBtn.classList.add('active');
  }

  pinBtn.addEventListener('click', function () {
    togglePin(dayKey, event.id);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-button delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.title = 'Excluir evento';
  deleteBtn.textContent = '×';

  deleteBtn.addEventListener('click', function () {
    deleteEvent(dayKey, event.id);
  });

  rightActions.appendChild(completeBtn);
  rightActions.appendChild(pinBtn);
  rightActions.appendChild(deleteBtn);

  item.appendChild(textBlock);
  item.appendChild(rightActions);

  return item;
}

function buildDayCard(day) {
  const card = document.createElement('section');
  card.className = 'day-card';

  const header = document.createElement('div');
  header.className = 'day-header';

  const title = document.createElement('h2');
  title.textContent = day.label;

  const subtitle = document.createElement('small');
  subtitle.textContent = state.days[day.key].length + ' evento(s)';

  header.appendChild(title);
  header.appendChild(subtitle);

  const form = document.createElement('form');
  form.className = 'event-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Adicionar evento';
  input.setAttribute('aria-label', 'Adicionar evento em ' + day.label);

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Adicionar';

  form.appendChild(input);
  form.appendChild(button);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    addEvent(day.key, input.value);
    input.value = '';
  });

  const list = document.createElement('div');
  list.className = 'events-list';

  const events = state.days[day.key];

  if (events.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-message';
    empty.textContent = 'Nenhum evento registrado.';
    list.appendChild(empty);
  } else {
    let i = 0;
    while (i < events.length) {
      list.appendChild(buildEventItem(day.key, events[i]));
      i += 1;
    }
  }

  card.appendChild(header);
  card.appendChild(form);
  card.appendChild(list);

  return card;
}

function render() {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  let i = 0;
  while (i < DAYS.length) {
    grid.appendChild(buildDayCard(DAYS[i]));
    i += 1;
  }

  const referenceDateInput = document.getElementById('referenceDate');
  referenceDateInput.value = state.referenceDate;
}

document.getElementById('referenceDate').addEventListener('change', function (event) {
  state.referenceDate = event.target.value;
  saveState();
});

document.getElementById('clearAllButton').addEventListener('click', function () {
  clearNonPinnedEvents();
});

runWeeklyCleanupIfNeeded();
render();