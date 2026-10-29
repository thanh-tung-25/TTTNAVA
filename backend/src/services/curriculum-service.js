import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';

function number(value) {
  return Number(value ?? 0);
}

function emptySemester(id, name) {
  return { id, name, questionCount: 0, publishedCount: 0, subjects: [] };
}

export async function getCurriculumTree(yearId = null) {
  const yearRows = await query(
    `SELECT y.id, y.name, y.starts_on, y.ends_on, y.is_active, y.sort_order,
            COUNT(q.id) AS question_count,
            COALESCE(SUM(CASE WHEN q.status = 'published' THEN 1 ELSE 0 END), 0) AS published_count
     FROM school_years y
     LEFT JOIN curriculum_chapters c ON c.school_year_id = y.id
     LEFT JOIN curriculum_lessons l ON l.chapter_id = c.id
     LEFT JOIN questions q ON q.topic_id = l.topic_id
     GROUP BY y.id, y.name, y.starts_on, y.ends_on, y.is_active, y.sort_order
     ORDER BY y.sort_order ASC, y.name DESC`,
  );
  if (!yearRows.length) throw new AppError(404, 'CURRICULUM_EMPTY', 'Chưa có năm học trong chương trình');
  const selectedId = yearId || yearRows.find((row) => row.is_active)?.id || yearRows[0].id;
  const selectedYear = yearRows.find((row) => row.id === selectedId);
  if (!selectedYear) throw new AppError(404, 'YEAR_NOT_FOUND', 'Năm học không tồn tại');

  const rows = await query(
    `SELECT c.id AS chapter_id, c.name AS chapter_name, c.grade, c.semester,
            c.subject_id, c.sort_order AS chapter_sort,
            s.name AS subject_name, s.color AS subject_color, s.sort_order AS subject_sort,
            l.id AS lesson_id, l.name AS lesson_name, l.topic_id, l.sort_order AS lesson_sort,
            COUNT(q.id) AS question_count,
            COALESCE(SUM(CASE WHEN q.status = 'published' THEN 1 ELSE 0 END), 0) AS published_count
     FROM curriculum_chapters c
     JOIN subjects s ON s.id = c.subject_id
     LEFT JOIN curriculum_lessons l ON l.chapter_id = c.id
     LEFT JOIN questions q ON q.topic_id = l.topic_id
     WHERE c.school_year_id = ?
     GROUP BY c.id, c.name, c.grade, c.semester, c.subject_id, c.sort_order,
              s.name, s.color, s.sort_order, l.id, l.name, l.topic_id, l.sort_order
     ORDER BY c.grade ASC, c.semester ASC, s.sort_order ASC, c.sort_order ASC, l.sort_order ASC`,
    [selectedId],
  );

  const grades = new Map([1, 2, 3, 4, 5].map((grade) => [grade, {
    grade,
    name: `Lớp ${grade}`,
    questionCount: 0,
    publishedCount: 0,
    semesters: [
      emptySemester('hk1', 'Học kỳ 1'),
      emptySemester('hk2', 'Học kỳ 2'),
    ],
  }]));

  for (const row of rows) {
    const grade = grades.get(Number(row.grade));
    const semester = grade.semesters.find((item) => item.id === row.semester);
    let subject = semester.subjects.find((item) => item.id === row.subject_id);
    if (!subject) {
      subject = {
        id: row.subject_id,
        name: row.subject_name,
        color: row.subject_color,
        questionCount: 0,
        publishedCount: 0,
        chapters: [],
      };
      semester.subjects.push(subject);
    }
    let chapter = subject.chapters.find((item) => item.id === row.chapter_id);
    if (!chapter) {
      chapter = {
        id: row.chapter_id,
        name: row.chapter_name,
        questionCount: 0,
        publishedCount: 0,
        lessons: [],
      };
      subject.chapters.push(chapter);
    }
    if (row.lesson_id) {
      chapter.lessons.push({
        id: row.lesson_id,
        name: row.lesson_name,
        topicId: row.topic_id,
        questionCount: number(row.question_count),
        publishedCount: number(row.published_count),
      });
    }
    const count = number(row.question_count);
    const published = number(row.published_count);
    chapter.questionCount += count;
    chapter.publishedCount += published;
    subject.questionCount += count;
    subject.publishedCount += published;
    semester.questionCount += count;
    semester.publishedCount += published;
    grade.questionCount += count;
    grade.publishedCount += published;
  }

  return {
    years: yearRows.map((row) => ({
      id: row.id,
      name: row.name,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      isActive: Boolean(row.is_active),
      questionCount: number(row.question_count),
      publishedCount: number(row.published_count),
    })),
    year: {
      id: selectedYear.id,
      name: selectedYear.name,
      startsOn: selectedYear.starts_on,
      endsOn: selectedYear.ends_on,
      isActive: Boolean(selectedYear.is_active),
      questionCount: number(selectedYear.question_count),
      publishedCount: number(selectedYear.published_count),
    },
    grades: [...grades.values()],
  };
}
