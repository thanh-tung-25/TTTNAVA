import { api } from '/assets/js/api.js';
import { confirmAction, emptyState, toast } from '/assets/js/ui.js';
import {
  elements,
  row,
  store,
} from './admin-students-context.js';

export async function load() {
  elements.table.innerHTML = '<div class="loading">Đang tải danh sách…</div>';
  try {
    const params = new URLSearchParams({ page: store.page, limit: 20 });
    if (store.search) params.set('q', store.search);
    if (store.program) params.set('program', store.program);
    if (store.canManageAccounts && store.status === 'deleted') params.set('status', 'deleted');
    const payload = await api(`/api/v1/admin/students?${params}`);
    store.studentsById = new Map(payload.data.map((student) => [student.id, student]));
    store.totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    if (store.page > store.totalPages) { store.page = store.totalPages; return load(); }
    elements.table.innerHTML = payload.data.length
      ? `<div class="table-wrap"><table class="table admin-table">
          <thead><tr><th>Học sinh</th>${store.canViewStudentEmail ? '<th>Gmail</th>' : ''}<th>Lớp</th><th>Trạng thái</th><th>${store.status === 'deleted' ? 'Ngày xóa' : 'Ngày tạo'}</th><th>Thao tác</th></tr></thead>
          <tbody>${payload.data.map(row).join('')}</tbody>
        </table></div>`
      : store.status === 'deleted'
        ? emptyState('↩', 'Thùng rác trống', 'Các tài khoản đã xóa sẽ xuất hiện ở đây để khôi phục.')
        : emptyState('👧', 'Chưa có học sinh nào', store.canCreateAccounts?'Bấm “Thêm học sinh” để tạo tài khoản đầu tiên.':'Chưa có học sinh trong danh sách này.');
    elements.pageLabel.textContent = `Trang ${store.page}/${store.totalPages} · ${payload.pagination.total} học sinh`;
    elements.prevButton.disabled = store.page <= 1;
    elements.nextButton.disabled = store.page >= store.totalPages;
  } catch (error) {
    elements.table.innerHTML = emptyState('😿', 'Không tải được danh sách', error.message);
  }
}

export async function toggleLock(id, locked, name) {
  const yes = await confirmAction(
    locked ? `Mở khoá tài khoản của ${name}?` : `Khoá tài khoản của ${name}? Học sinh sẽ không đăng nhập được.`,
    { title: locked ? 'Mở khoá' : 'Khoá tài khoản', confirmText: locked ? 'Mở khoá' : 'Khoá', danger: !locked },
  );
  if (!yes) return;
  try {
    await api(`/api/v1/admin/students/${id}/lock`, { method: 'POST', body: { locked: !locked } });
    toast(locked ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.', 'success');
    load();
  } catch (error) {
    toast(error.message, 'error');
  }
}
