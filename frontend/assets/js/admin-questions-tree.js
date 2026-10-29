import { api, escapeHtml } from '/assets/js/api.js';
import { elements, store } from './admin-questions-context.js';
let onSelect = null;
export function setOnSelect(callback) {
  onSelect = callback;
}

function countBadge(item) {
  return `<span class="tree-count" title="${item.publishedCount ?? 0} câu đã đăng">${item.questionCount ?? 0}</span>`;
}
function nodeSummary(name, item) {
  return `<summary><span class="tree-label">${escapeHtml(name)}</span>${countBadge(item)}</summary>`;
}

function lessonButton(lesson) {
  return `<button class="tree-leaf" type="button" data-select-lesson="${escapeHtml(lesson.id)}">
    <span>${escapeHtml(lesson.name)}</span>${countBadge(lesson)}
  </button>`;
}

function chapterNode(chapter) {
  return `<details class="tree-node tree-chapter" data-tree-chapter="${escapeHtml(chapter.id)}">
    <summary>
      <button class="tree-select" type="button" data-select-chapter="${escapeHtml(chapter.id)}">${escapeHtml(chapter.name)}</button>
      ${countBadge(chapter)}
    </summary>
    <div class="tree-lessons">
      ${chapter.lessons.length ? chapter.lessons.map(lessonButton).join('') : '<p class="tree-muted">Chưa có bài học.</p>'}
    </div>
  </details>`;
}

function subjectNode(subject) {
  return `<details class="tree-node tree-subject" data-tree-subject="${escapeHtml(subject.id)}">
    ${nodeSummary(subject.name, subject)}
    <div class="tree-children">
      ${subject.chapters.length ? subject.chapters.map(chapterNode).join('') : '<p class="tree-muted">Chưa có chương.</p>'}
    </div>
  </details>`;
}

function semesterNode(semester, grade) {
  return `<details class="tree-node tree-semester" data-tree-semester="${semester.id}" data-tree-grade="${grade.grade}">
    ${nodeSummary(semester.name, semester)}
    <div class="tree-children">
      ${semester.subjects.length ? semester.subjects.map(subjectNode).join('') : '<p class="tree-muted">Chưa có môn học.</p>'}
    </div>
  </details>`;
}

function gradeNode(grade) {
  return `<details class="tree-node tree-grade" data-tree-grade="${grade.grade}">
    ${nodeSummary(grade.name, grade)}
    <div class="tree-children">
      ${grade.semesters.map((semester) => semesterNode(semester, grade)).join('')}
    </div>
  </details>`;
}

export function renderTree(tree) {
  elements.tree.innerHTML = `
    <details class="tree-node tree-year" open>
      ${nodeSummary(tree.year.name, tree.year)}
      <div class="tree-children">${tree.grades.map(gradeNode).join('')}</div>
    </details>`;
}

export function findScope(type, id) {
  const tree = store.tree;
  if (!tree) return null;
  for (const grade of tree.grades) {
    for (const semester of grade.semesters) {
      for (const subject of semester.subjects) {
        for (const chapter of subject.chapters) {
          if (type === 'chapter' && chapter.id === id) {
            return {
              type, yearId: tree.year.id, grade: grade.grade, semester: semester.id,
              subjectId: subject.id, chapterId: chapter.id, lessonId: null,
              breadcrumb: [tree.year.name, grade.name, semester.name, subject.name, chapter.name],
              title: chapter.name,
            };
          }
          const lesson = chapter.lessons.find((item) => item.id === id);
          if (type === 'lesson' && lesson) {
            return {
              type, yearId: tree.year.id, grade: grade.grade, semester: semester.id,
              subjectId: subject.id, chapterId: chapter.id, lessonId: lesson.id,
              breadcrumb: [tree.year.name, grade.name, semester.name, subject.name, chapter.name, lesson.name],
              title: lesson.name,
            };
          }
        }
      }
    }
  }
  return null;
}

function openPath(scope) {
  const attribute = scope.type === 'lesson' ? 'data-select-lesson' : 'data-select-chapter';
  const node = elements.tree.querySelector(`[${attribute}="${CSS.escape(scope.lessonId ?? scope.chapterId)}"]`);
  if (!node) return;
  let details = node.closest('details');
  while (details) {
    details.open = true;
    details = details.parentElement?.closest('details') ?? null;
  }
}

function highlight(scope) {
  elements.tree.querySelectorAll('.is-selected').forEach((node) => node.classList.remove('is-selected'));
  if (!scope) return;
  const attribute = scope.type === 'lesson' ? 'data-select-lesson' : 'data-select-chapter';
  elements.tree.querySelector(`[${attribute}="${CSS.escape(scope.lessonId ?? scope.chapterId)}"]`)?.classList.add('is-selected');
}

export function renderBreadcrumb(scope) {
  elements.breadcrumb.innerHTML = scope.breadcrumb
    .map((name, index) => `<span${index === scope.breadcrumb.length - 1 ? ' class="current"' : ''}>${escapeHtml(name)}</span>`)
    .join('<span class="crumb-sep">/</span>');
}

const GUIDANCE_HTML = `
  <div class="scope-guidance-icon" aria-hidden="true">🗂️</div>
  <h2>Chọn mục chương trình để bắt đầu</h2>
  <p>Chọn khối lớp, học kỳ, môn học, chương hoặc bài học ở cây bên trái. Danh sách chỉ hiển thị câu hỏi thuộc đúng mục đang chọn.</p>`;

export function showGuidance(message = null) {
  elements.empty.classList.remove('hidden');
  elements.empty.innerHTML = message
    ? `<div class="scope-guidance-icon" aria-hidden="true">🗂️</div><p>${escapeHtml(message)}</p>`
    : GUIDANCE_HTML;
  elements.content.classList.add('hidden');
}

export function showScope(scope) {
  store.selectedScope = scope;
  elements.empty.classList.add('hidden');
  elements.content.classList.remove('hidden');
  renderBreadcrumb(scope);
  highlight(scope);
  openPath(scope);
}

export function selectScope(type, id) {
  const scope = findScope(type, id);
  if (!scope) return;
  store.page = 1;
  showScope(scope);
  if (onSelect) onSelect(scope);
}

export function bindTree() {
  elements.tree.addEventListener('click', (event) => {
    const chapter = event.target.closest('[data-select-chapter]');
    if (chapter) {
      event.preventDefault();
      event.stopPropagation();
      selectScope('chapter', chapter.dataset.selectChapter);
      return;
    }
    const lesson = event.target.closest('[data-select-lesson]');
    if (lesson) selectScope('lesson', lesson.dataset.selectLesson);
  });
}

export async function loadTree(yearId = null) {
  elements.tree.innerHTML = '<div class="loading">Đang tải chương trình…</div>';
  try {
    const selectedYear = yearId || elements.treeYear?.value || store.tree?.year?.id || '';
    const params = selectedYear ? `?yearId=${encodeURIComponent(selectedYear)}` : '';
    const payload = await api(`/api/v1/admin/curriculum/tree${params}`);
    store.tree = payload.data;
    if (elements.treeYear) {
      elements.treeYear.innerHTML = payload.data.years.map((year) => (
        `<option value="${escapeHtml(year.id)}"${year.id === payload.data.year.id ? ' selected' : ''}>${escapeHtml(year.name)}</option>`
      )).join('');
    }
    renderTree(payload.data);
    if (store.selectedScope) {
      const refreshed = findScope(store.selectedScope.type, store.selectedScope.lessonId ?? store.selectedScope.chapterId);
      if (refreshed) {
        store.selectedScope = refreshed;
        renderBreadcrumb(refreshed);
        highlight(refreshed);
        openPath(refreshed);
      } else {
        showGuidance();
      }
    } else {
      showGuidance();
    }
    return payload.data;
  } catch (error) {
    elements.tree.innerHTML = `<div class="empty-state compact"><p>😿 Không tải được chương trình.</p><p class="muted">${escapeHtml(error.message)}</p>
      <button class="btn btn-sm" type="button" data-tree-retry>Tải lại</button></div>`;
    throw error;
  }
}
