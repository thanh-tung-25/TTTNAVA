import { query } from '../backend/src/config/db.js';
import { deleteFixtureQuestions } from '../backend/tests/fixtures/questions.js';
import {
  cleanupGeneratedUsers,
  cleanupUsers,
  closeGlobalPool,
  E2E_USERS,
  idsFor,
} from './global-setup.js';

export default async function globalTeardown() {
  const ids = await idsFor(E2E_USERS.map((user) => user.username));
  await cleanupUsers(ids);
  await cleanupGeneratedUsers();
  await deleteFixtureQuestions((sql, params = []) => query(sql, params));
  await closeGlobalPool();
}
