function value(select, fallback = '') {
  return select?.value || fallback;
}

function firstWithContent(grades, semester = null) {
  return grades.find((grade) => grade.semesters.some((item) => (
    (!semester || item.id === semester) && item.subjects.length
  ))) ?? grades[0];
}

export function defaultScopeIds(tree, question = null) {
  const initial = {
    grade: question?.grade ?? tree?.grades?.[0]?.grade ?? 1,
    semester: question?.semester ?? 'hk1',
    subjectId: question?.subjectId ?? '',
    chapterId: question?.chapterId ?? '',
    lessonId: question?.lessonId ?? '',
  };
  return normalizeScopeIds(tree, initial);
}

export function scopeOptions(tree, ids) {
  const grades = tree?.grades ?? [];
  let grade = grades.find((item) => Number(item.grade) === Number(ids.grade));
  if (!grade) grade = firstWithContent(grades);
  const semesters = grade?.semesters ?? [];
  let semester = semesters.find((item) => item.id === ids.semester);
  if (!semester || !semester.subjects.length) {
    semester = semesters.find((item) => item.subjects.length) ?? semesters[0];
  }
  const subjects = semester?.subjects ?? [];
  let subject = subjects.find((item) => item.id === ids.subjectId);
  if (!subject) subject = subjects[0];
  const chapters = subject?.chapters ?? [];
  let chapter = chapters.find((item) => item.id === ids.chapterId);
  if (!chapter) chapter = chapters[0];
  const lessons = chapter?.lessons ?? [];
  let lesson = lessons.find((item) => item.id === ids.lessonId);
  if (!lesson) lesson = lessons[0];
  return {
    grade,
    semester,
    subject,
    chapter,
    lesson,
    grades,
    semesters,
    subjects,
    chapters,
    lessons,
  };
}

export function normalizeScopeIds(tree, ids) {
  const options = scopeOptions(tree, ids);
  return {
    yearId: tree?.year?.id ?? '',
    grade: options.grade?.grade ?? '',
    semester: options.semester?.id ?? '',
    subjectId: options.subject?.id ?? '',
    chapterId: options.chapter?.id ?? '',
    lessonId: options.lesson?.id ?? '',
  };
}

function optionList(items, selected, label, countKey = 'questionCount') {
  if (!items.length) return '<option value="">Chưa có dữ liệu</option>';
  return items.map((item) => {
    const text = typeof label === 'function' ? label(item) : item[label];
    const count = item[countKey];
    return `<option value="${item.id ?? item.grade}"${String(item.id ?? item.grade) === String(selected) ? ' selected' : ''}>`
      + `${text}${count === undefined ? '' : ` (${count} câu)`}</option>`;
  }).join('');
}

export function scopeControlsHtml(tree, initialIds) {
  const ids = normalizeScopeIds(tree, initialIds);
  const opts = scopeOptions(tree, ids);
  return `
    <div class="grid grid-3 question-scope-grid">
      <div class="field"><label>Năm học</label><select class="select" data-scope="yearId" disabled>
        <option value="${tree?.year?.id ?? ''}">${tree?.year?.name ?? 'Chưa có năm học'}</option>
      </select></div>
      <div class="field"><label>Khối lớp</label><select class="select" data-scope="grade">
        ${optionList(opts.grades, ids.grade, (item) => item.name)}
      </select></div>
      <div class="field"><label>Học kỳ</label><select class="select" data-scope="semester">
        ${optionList(opts.semesters, ids.semester, (item) => item.name)}
      </select></div>
      <div class="field"><label>Môn học</label><select class="select" data-scope="subjectId">
        ${optionList(opts.subjects, ids.subjectId, (item) => item.name)}
      </select></div>
      <div class="field"><label>Chương / chủ đề</label><select class="select" data-scope="chapterId">
        ${optionList(opts.chapters, ids.chapterId, (item) => item.name)}
      </select></div>
      <div class="field"><label>Bài học</label><select class="select" data-scope="lessonId">
        ${optionList(opts.lessons, ids.lessonId, (item) => item.name)}
      </select></div>
    </div>`;
}

export function readScopeIds(container) {
  return {
    yearId: value(container.querySelector('[data-scope="yearId"]')),
    grade: Number(value(container.querySelector('[data-scope="grade"]'), 0)) || '',
    semester: value(container.querySelector('[data-scope="semester"]')),
    subjectId: value(container.querySelector('[data-scope="subjectId"]')),
    chapterId: value(container.querySelector('[data-scope="chapterId"]')),
    lessonId: value(container.querySelector('[data-scope="lessonId"]')),
  };
}

export function renderScopeSelects(container, tree, ids) {
  const normalized = normalizeScopeIds(tree, ids);
  const opts = scopeOptions(tree, normalized);
  const set = (name, html) => {
    const select = container.querySelector(`[data-scope="${name}"]`);
    if (select) select.innerHTML = html;
  };
  set('yearId', `<option value="${tree?.year?.id ?? ''}">${tree?.year?.name ?? 'Chưa có năm học'}</option>`);
  set('grade', optionList(opts.grades, normalized.grade, (item) => item.name));
  set('semester', optionList(opts.semesters, normalized.semester, (item) => item.name));
  set('subjectId', optionList(opts.subjects, normalized.subjectId, (item) => item.name));
  set('chapterId', optionList(opts.chapters, normalized.chapterId, (item) => item.name));
  set('lessonId', optionList(opts.lessons, normalized.lessonId, (item) => item.name));
  return normalized;
}

export function bindScopeControls(container, tree, ids, onChange = null) {
  const handler = (event) => {
    if (!event.target.matches('[data-scope]')) return;
    const current = readScopeIds(container);
    const normalized = renderScopeSelects(container, tree, current);
    if (onChange) onChange(normalized);
  };
  container.addEventListener('change', handler);
  return () => container.removeEventListener('change', handler);
}

export function scopeIdsFromMetadata(tree, metadata) {
  const targetGrade = Number(metadata?.grade);
  const targetSubject = metadata?.subjectId;
  const targetName = String(metadata?.topicName ?? '').toLocaleLowerCase('vi');
  for (const grade of tree?.grades ?? []) {
    if (targetGrade && Number(grade.grade) !== targetGrade) continue;
    for (const semester of grade.semesters) {
      for (const subject of semester.subjects) {
        if (targetSubject && subject.id !== targetSubject) continue;
        for (const chapter of subject.chapters) {
          for (const lesson of chapter.lessons) {
            if (!targetName || lesson.name.toLocaleLowerCase('vi').includes(targetName)) {
              return normalizeScopeIds(tree, {
                grade: grade.grade, semester: semester.id, subjectId: subject.id,
                chapterId: chapter.id, lessonId: lesson.id,
              });
            }
          }
        }
      }
    }
  }
  return defaultScopeIds(tree);
}

export function scopeLabels(tree, ids) {
  const opts = scopeOptions(tree, ids);
  return {
    grade: opts.grade?.name ?? '',
    semester: opts.semester?.name ?? '',
    subjectName: opts.subject?.name ?? '',
    chapterName: opts.chapter?.name ?? '',
    lessonName: opts.lesson?.name ?? '',
  };
}
