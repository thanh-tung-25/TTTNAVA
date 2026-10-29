import { api } from '/assets/js/api.js';
import { emptyState } from '/assets/js/ui.js';
import { elements, filters, row, store } from './admin-questions-context.js';
import { showGuidance } from './admin-questions-tree.js';

function scopeParams(scope) {
  return {
    yearId: scope.yearId,
    grade: scope.grade,
    semester: scope.semester,
    subjectId: scope.subjectId,
    chapterId: scope.chapterId,
    ...(scope.lessonId ? { lessonId: scope.lessonId } : {}),
  };
}

function tableHtml(items) {
  return `<div class="table-wrap"><table class="table admin-table">
    <thead><tr>
      <th>Mã</th><th>Nội dung</th><th>Môn / chương</th><th>Độ khó</th>
      <th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th>
    </tr></thead>
    <tbody>${items.map(row).join('')}</tbody>
  </table></div>`;
}

export async function loadQuestions() {
  const scope = store.selectedScope;
  if (!scope) {
    showGuidance();
    return;
  }
  elements.table.innerHTML = '<div class="loading">Đang tải câu hỏi…</div>';
  const params = new URLSearchParams({ page: store.page, limit: 20, ...scopeParams(scope) });
  for (const [key, value] of Object.entries(filters())) {
    if (value) params.set(key, value);
  }
  try {
    const payload = await api(`/api/v1/admin/questions?${params}`);
    store.totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    elements.table.innerHTML = payload.data.length
      ? tableHtml(payload.data)
      : emptyState('📚', 'Chưa có câu hỏi trong mục này', 'Cô có thể tạo câu hỏi mới hoặc nhập từ tài liệu Word cho đúng bài học đang chọn.');
    elements.pageLabel.textContent = `Trang ${store.page}/${store.totalPages} · ${payload.pagination.total} câu`;
    elements.prevButton.disabled = store.page <= 1;
    elements.nextButton.disabled = store.page >= store.totalPages;
  } catch (error) {
    elements.table.innerHTML = `${emptyState('😿', 'Không tải được câu hỏi', error.message)}
      <div class="quiz-actions"><button class="btn btn-sm" type="button" data-retry-questions>Tải lại</button></div>`;
  }
}
