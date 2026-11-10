import { openAccountDeletion, openAccountRestore } from './admin-account-deletion.js';
import { store } from './admin-students-context.js';
import { load } from './admin-students-load.js';

const onChanged = async () => { store.page = 1; await load(); };

export function openDeleteStudent(id) {
  if (!store.canManageAccounts || store.status === 'deleted') return;
  return openAccountDeletion({ id, basePath: '/api/v1/admin/students', accountKey: 'student', onChanged });
}

export function restoreStudent(id) {
  if (!store.canManageAccounts || store.status !== 'deleted') return;
  const account = store.studentsById.get(id);
  if (account) return openAccountRestore({ account, basePath: '/api/v1/admin/students', onChanged });
}
