const STORAGE_KEY = 'exceptiongenda_weekly_storage_v2';

const DAYS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

let historySelectedWeekKey = '';

function createEmptyDays() {
  const days = {};
  let i = 0;

  while (i < DAYS.length) {
    days[DAYS[i].key] = [];
    i += 1;
  }

  return days;
}

function createInitialStorage() {
  return {
    selectedDate: '',
    currentWeekKey: '',
    history: {}
  };
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeEvent(event) {
  return {
    id: typeof event.id === 'string' ? event.id : Date.now().toString() + Math.random().toString(16).slice(2),
    text: typeof event.text === 'string' ? event.text : '',
    completed: event && event.completed === true,
    pinned: event && event.pinned === true
  };
}

function normalizeWeek(weekData, weekKey) {
  const normalized = {
    weekKey: weekKey || '',
    selectedDate: '',
    days: createEmptyDays()
  };

  if (!weekData || typeof weekData !== 'object') {
    return normalized;
  }

  if (typeof weekData.weekKey === 'string' && weekData.weekKey) {
    normalized.weekKey = weekData.weekKey;
  }

  if (typeof weekData.selectedDate === 'string') {
    normalized.selectedDate = weekData.selectedDate;
  }

  if (weekData.days && typeof weekData.days === 'object') {
    let i = 0;

    while (i < DAYS.length) {
      const dayKey = DAYS[i].key;
      const rawEvents = weekData.days[dayKey];

      if (Array.isArray(rawEvents)) {
        const normalizedEvents = [];
        let j = 0;

        while (j < rawEvents.length) {
          normalizedEvents.push(normalizeEvent(rawEvents[j]));
          j += 1;
        }

        normalized.days[dayKey] = normalizedEvents;
      }

      i += 1;
    }
  }

  return normalized;
}

function loadStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createInitialStorage();
  }

  try {
    const parsed = JSON.parse(raw);
    const base = createInitialStorage();

    if (typeof parsed.selectedDate === 'string') {
      base.selectedDate = parsed.selectedDate;
    }

    if (typeof parsed.currentWeekKey === 'string') {
      base.currentWeekKey = parsed.currentWeekKey;
    }

    if (parsed.history && typeof parsed.history === 'object') {
      const keys = Object.keys(parsed.history);
      let i = 0;

      while (i < keys.length) {
        base.history[keys[i]] = normalizeWeek(parsed.history[keys[i]], keys[i]);
        i += 1;
      }
    }

    return base;
  } catch (error) {
    return createInitialStorage();
  }
}

let storage = loadStorage();

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function parseDateString(dateString) {
  if (!dateString) {
    return null;
  }

  const parts = dateString.split('-');

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatDisplayDate(dateString) {
  const date = parseDateString(dateString);

  if (!date) {
    return 'Sem data';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return day + '/' + month + '/' + year;
}

function getMondayOfWeek(date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + diff);

  return base;
}

function getWeekKeyFromDateString(dateString) {
  const date = parseDateString(dateString);

  if (!date) {
    return '';
  }

  return formatDate(getMondayOfWeek(date));
}

function getWeekEndFromWeekKey(weekKey) {
  const date = parseDateString(weekKey);

  if (!date) {
    return '';
  }

  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return formatDate(end);
}

function getCurrentWeek() {
  const weekKey = storage.currentWeekKey;

  if (!weekKey || !storage.history[weekKey]) {
    return null;
  }

  return storage.history[weekKey];
}

function saveCurrentWeek() {
  const currentWeek = getCurrentWeek();

  if (!currentWeek || !storage.currentWeekKey) {
    return;
  }

  storage.history[storage.currentWeekKey] = cloneData(currentWeek);
  saveStorage();
}

function getSortedWeekKeysAsc() {
  const keys = Object.keys(storage.history);

  keys.sort(function (a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });

  return keys;
}

function getSortedWeekKeysDesc() {
  const keys = getSortedWeekKeysAsc();
  keys.reverse();
  return keys;
}

function findPreviousWeekKey(targetWeekKey) {
  const keys = getSortedWeekKeysAsc();
  let previous = '';

  let i = 0;
  while (i < keys.length) {
    if (keys[i] < targetWeekKey) {
      previous = keys[i];
    } else {
      break;
    }
    i += 1;
  }

  return previous;
}

function createWeekFromPreviousPinned(previousWeekKey, newWeekKey, selectedDate) {
  const newWeek = {
    weekKey: newWeekKey,
    selectedDate: selectedDate,
    days: createEmptyDays()
  };

  if (!previousWeekKey || !storage.history[previousWeekKey]) {
    return newWeek;
  }

  const previousWeek = storage.history[previousWeekKey];

  let i = 0;
  while (i < DAYS.length) {
    const dayKey = DAYS[i].key;
    const events = previousWeek.days[dayKey];
    let j = 0;

    while (j < events.length) {
      if (events[j].pinned === true) {
        newWeek.days[dayKey].push({
          id: events[j].id,
          text: events[j].text,
          completed: events[j].completed,
          pinned: true
        });
      }
      j += 1;
    }

    i += 1;
  }

  return newWeek;
}

function ensureWeekExistsForDate(dateString) {
  const weekKey = getWeekKeyFromDateString(dateString);

  if (!weekKey) {
    return;
  }

  if (!storage.history[weekKey]) {
    const previousWeekKey = findPreviousWeekKey(weekKey);
    storage.history[weekKey] = createWeekFromPreviousPinned(previousWeekKey, weekKey, dateString);
  }

  storage.currentWeekKey = weekKey;
  storage.selectedDate = dateString;
  storage.history[weekKey].selectedDate = dateString;

  saveStorage();
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
  const currentWeek = getCurrentWeek();

  if (!cleanText || !currentWeek) {
    return;
  }

  currentWeek.days[dayKey].push(createEvent(cleanText));
  saveCurrentWeek();
  render();
}

function toggleComplete(dayKey, eventId) {
  const currentWeek = getCurrentWeek();

  if (!currentWeek) {
    return;
  }

  const events = currentWeek.days[dayKey];
  let i = 0;

  while (i < events.length) {
    if (events[i].id === eventId) {
      events[i].completed = !events[i].completed;
      break;
    }
    i += 1;
  }

  saveCurrentWeek();
  render();
}

function togglePin(dayKey, eventId) {
  const currentWeek = getCurrentWeek();

  if (!currentWeek) {
    return;
  }

  const events = currentWeek.days[dayKey];
  let i = 0;

  while (i < events.length) {
    if (events[i].id === eventId) {
      events[i].pinned = !events[i].pinned;
      break;
    }
    i += 1;
  }

  saveCurrentWeek();
  render();
}

function deleteEvent(dayKey, eventId) {
  const currentWeek = getCurrentWeek();

  if (!currentWeek) {
    return;
  }

  const events = currentWeek.days[dayKey];
  const updated = [];
  let i = 0;

  while (i < events.length) {
    if (events[i].id !== eventId) {
      updated.push(events[i]);
    }
    i += 1;
  }

  currentWeek.days[dayKey] = updated;
  saveCurrentWeek();
  render();
}

function clearNonPinnedEvents() {
  const currentWeek = getCurrentWeek();

  if (!currentWeek) {
    return;
  }

  let i = 0;

  while (i < DAYS.length) {
    const dayKey = DAYS[i].key;
    const events = currentWeek.days[dayKey];
    const updated = [];
    let j = 0;

    while (j < events.length) {
      if (events[j].pinned === true) {
        updated.push(events[j]);
      }
      j += 1;
    }

    currentWeek.days[dayKey] = updated;
    i += 1;
  }

  saveCurrentWeek();
  render();
}

function deleteHistoryWeek(weekKey) {
  if (!weekKey || !storage.history[weekKey]) {
    return;
  }

  delete storage.history[weekKey];

  if (historySelectedWeekKey === weekKey) {
    historySelectedWeekKey = '';
  }

  if (storage.currentWeekKey === weekKey) {
    const remainingKeys = getSortedWeekKeysAsc();

    if (remainingKeys.length > 0) {
      const fallbackWeekKey = remainingKeys[remainingKeys.length - 1];
      storage.currentWeekKey = fallbackWeekKey;
      storage.selectedDate = fallbackWeekKey;
      storage.history[fallbackWeekKey].selectedDate = fallbackWeekKey;
    } else {
      const today = formatDate(new Date());
      storage.selectedDate = today;
      ensureWeekExistsForDate(today);
    }
  }

  saveStorage();
  render();
  renderHistoryWeeks();
  renderHistoryPreview();
}

function createTag(text, className) {
  const tag = document.createElement('span');
  tag.className = 'tag ' + className;
  tag.textContent = text;
  return tag;
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
    tags.appendChild(createTag('Fixado', 'fixed'));
  }

  if (event.completed) {
    tags.appendChild(createTag('Concluído', 'done'));
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
  const currentWeek = getCurrentWeek();
  const card = document.createElement('section');
  card.className = 'day-card';

  const header = document.createElement('div');
  header.className = 'day-header';

  const title = document.createElement('h2');
  title.textContent = day.label;

  const subtitle = document.createElement('small');
  subtitle.textContent = currentWeek.days[day.key].length + ' evento(s)';

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

  const events = currentWeek.days[day.key];

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

function renderHistoryWeeks() {
  const list = document.getElementById('historyWeeksList');
  const keys = getSortedWeekKeysDesc();

  list.innerHTML = '';

  if (keys.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Nenhuma semana salva localmente.';
    list.appendChild(empty);
    return;
  }

  let i = 0;
  while (i < keys.length) {
    const weekKey = keys[i];
    const weekEnd = getWeekEndFromWeekKey(weekKey);

    const row = document.createElement('div');
    row.className = 'history-date-row';

    const button = document.createElement('button');
    button.className = 'history-date-button';
    button.type = 'button';
    button.textContent = formatDisplayDate(weekKey) + ' - ' + formatDisplayDate(weekEnd);

    if (historySelectedWeekKey === weekKey) {
      button.classList.add('active');
    }

    button.addEventListener('click', function () {
      historySelectedWeekKey = weekKey;
      renderHistoryWeeks();
      renderHistoryPreview();
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'history-delete-button';
    deleteButton.type = 'button';
    deleteButton.title = 'Excluir semana do histórico';
    deleteButton.textContent = '×';

    deleteButton.addEventListener('click', function () {
      deleteHistoryWeek(weekKey);
    });

    row.appendChild(button);
    row.appendChild(deleteButton);
    list.appendChild(row);

    i += 1;
  }
}

function renderHistoryPreview() {
  const title = document.getElementById('historySelectedWeek');
  const preview = document.getElementById('historyPreview');

  preview.innerHTML = '';

  if (!historySelectedWeekKey || !storage.history[historySelectedWeekKey]) {
    title.textContent = 'Selecione uma semana para visualizar os eventos.';
    return;
  }

  const week = storage.history[historySelectedWeekKey];
  const weekEnd = getWeekEndFromWeekKey(historySelectedWeekKey);

  title.textContent = 'Semana: ' + formatDisplayDate(historySelectedWeekKey) + ' até ' + formatDisplayDate(weekEnd);

  let i = 0;
  while (i < DAYS.length) {
    const day = DAYS[i];
    const dayCard = document.createElement('div');
    dayCard.className = 'history-day-card';

    const header = document.createElement('h4');
    header.textContent = day.label;
    dayCard.appendChild(header);

    const list = document.createElement('div');
    list.className = 'history-day-list';

    const events = week.days[day.key];

    if (!events || events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'Sem eventos.';
      list.appendChild(empty);
    } else {
      let j = 0;
      while (j < events.length) {
        const event = events[j];
        const item = document.createElement('div');
        item.className = 'history-event-item';

        if (event.completed) {
          item.classList.add('completed');
        }

        item.textContent = event.text;

        const meta = document.createElement('div');
        meta.className = 'history-event-meta';

        if (event.pinned) {
          meta.appendChild(createTag('Fixado', 'fixed'));
        }

        if (event.completed) {
          meta.appendChild(createTag('Concluído', 'done'));
        }

        if (meta.children.length > 0) {
          item.appendChild(meta);
        }

        list.appendChild(item);
        j += 1;
      }
    }

    dayCard.appendChild(list);
    preview.appendChild(dayCard);
    i += 1;
  }
}

function openHistoryModal() {
  const keys = getSortedWeekKeysDesc();

  if (!historySelectedWeekKey && keys.length > 0) {
    historySelectedWeekKey = keys[0];
  }

  renderHistoryWeeks();
  renderHistoryPreview();
  document.getElementById('historyModal').classList.remove('hidden');
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
}

function renderWeekInfo() {
  const weekInfo = document.getElementById('weekInfo');
  const currentWeek = getCurrentWeek();

  if (!currentWeek || !storage.currentWeekKey) {
    weekInfo.textContent = '';
    return;
  }

  const weekEnd = getWeekEndFromWeekKey(storage.currentWeekKey);
  weekInfo.textContent = 'Semana ativa: ' + formatDisplayDate(storage.currentWeekKey) + ' até ' + formatDisplayDate(weekEnd);
}

function render() {
  const grid = document.getElementById('weekGrid');
  const referenceDateInput = document.getElementById('referenceDate');
  const currentWeek = getCurrentWeek();

  grid.innerHTML = '';

  if (!currentWeek) {
    return;
  }

  let i = 0;
  while (i < DAYS.length) {
    grid.appendChild(buildDayCard(DAYS[i]));
    i += 1;
  }

  referenceDateInput.value = storage.selectedDate;
  renderWeekInfo();
}

document.getElementById('referenceDate').addEventListener('change', function (event) {
  const value = event.target.value;

  if (!value) {
    return;
  }

  ensureWeekExistsForDate(value);
  render();
});

document.getElementById('clearAllButton').addEventListener('click', function () {
  clearNonPinnedEvents();
});

document.getElementById('viewHistoryButton').addEventListener('click', function () {
  openHistoryModal();
});

document.getElementById('closeHistoryModal').addEventListener('click', function () {
  closeHistoryModal();
});

document.getElementById('historyModal').addEventListener('click', function (event) {
  if (event.target.id === 'historyModal') {
    closeHistoryModal();
  }
});

(function init() {
  if (!storage.selectedDate) {
    storage.selectedDate = formatDate(new Date());
  }

  ensureWeekExistsForDate(storage.selectedDate);
  render();
})();