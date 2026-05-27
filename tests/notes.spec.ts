import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:3000';

type Note = {
  id: string;
  title: string;
  content: string;
  folderName?: string;
  sharedWithEmail?: string;
  createdAt: string;
};

async function gotoNotesAsLoggedIn(page: Page, initialNotes: Note[] = []) {
  let notes = [...initialNotes];

  // Match /notes and /notes?search=... but NOT /notes/:id
  await page.route(
    (url: URL) => url.origin === API && url.pathname === '/notes',
    async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        const search = new URL(route.request().url()).searchParams.get('search') ?? '';
        const filtered = search
          ? notes.filter(
              (n) =>
                n.title.toLowerCase().includes(search.toLowerCase()) ||
                n.content.toLowerCase().includes(search.toLowerCase())
            )
          : notes;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(filtered),
        });
      } else if (method === 'POST') {
        const body = JSON.parse(route.request().postData() ?? '{}') as Partial<Note>;
        const newNote: Note = {
          id: String(notes.length + 1),
          title: body.title ?? '',
          content: body.content ?? '',
          folderName: body.folderName,
          sharedWithEmail: body.sharedWithEmail,
          createdAt: new Date().toISOString(),
        };
        notes = [...notes, newNote];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newNote),
        });
      } else {
        await route.continue();
      }
    }
  );

  // Match /notes/:id — handles GET by ID, PATCH, DELETE
  await page.route(
    (url: URL) => url.origin === API && url.pathname.startsWith('/notes/'),
    async (route) => {
      const id = route.request().url().split('/notes/')[1]?.split('?')[0] ?? '';
      const method = route.request().method();

      if (method === 'GET') {
        const note = notes.find((n) => n.id === id);
        if (note) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(note),
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      } else if (method === 'PATCH') {
        const body = JSON.parse(route.request().postData() ?? '{}') as Partial<Note>;
        const idx = notes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          const updated = { ...notes[idx]!, ...body };
          notes = [...notes.slice(0, idx), updated, ...notes.slice(idx + 1)];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updated),
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      } else if (method === 'DELETE') {
        notes = notes.filter((n) => n.id !== id);
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    }
  );

  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('token', 'fake-token');
  });
  await page.goto('/notes');
}

test.describe('Notes CRUD', () => {
  test('notes page loads and displays notes', async ({ page }) => {
    const initialNotes: Note[] = [
      { id: '1', title: 'First Note', content: 'Hello world', createdAt: new Date().toISOString() },
      { id: '2', title: 'Second Note', content: 'Another note', createdAt: new Date().toISOString() },
    ];
    await gotoNotesAsLoggedIn(page, initialNotes);
    await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();
    await expect(page.locator('.note-card')).toHaveCount(2);
    await expect(page.getByText('First Note')).toBeVisible();
    await expect(page.getByText('Second Note')).toBeVisible();
  });

  test('empty notes page shows empty state message', async ({ page }) => {
    await gotoNotesAsLoggedIn(page);
    await expect(page.getByText(/No notes yet/)).toBeVisible();
  });

  test('create note UI flow', async ({ page }) => {
    await gotoNotesAsLoggedIn(page);

    await page.getByRole('button', { name: /New Note/i }).click();
    await expect(page.locator('.note-form h2')).toHaveText('New Note');

    await page.getByPlaceholder('Title').fill('My Test Note');
    await page.getByPlaceholder('Content').fill('This is the note content.');
    await page.getByPlaceholder('Folder Name (optional)').fill('Work');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.note-form')).toHaveCount(0);
    await expect(page.locator('.note-card')).toHaveCount(1);
    await expect(page.getByText('My Test Note')).toBeVisible();
  });

  test('view note detail works in UI', async ({ page }) => {
    const initialNotes: Note[] = [
      {
        id: '1',
        title: 'Detail Test Note',
        content: 'Detailed content here',
        folderName: 'Work',
        sharedWithEmail: 'colleague@example.com',
        createdAt: new Date().toISOString(),
      },
    ];
    await gotoNotesAsLoggedIn(page, initialNotes);

    await expect(page.getByText('Detail Test Note')).toBeVisible();
    await page.getByRole('button', { name: 'View' }).click();

    await expect(page.locator('.note-detail')).toBeVisible();
    await expect(page.locator('.note-detail')).toContainText('Detail Test Note');
    await expect(page.locator('.note-detail')).toContainText('Work');
    await expect(page.locator('.note-detail')).toContainText('colleague@example.com');
  });

  test('edit note UI flow', async ({ page }) => {
    const initialNotes: Note[] = [
      {
        id: '1',
        title: 'Original Title',
        content: 'Original content',
        createdAt: new Date().toISOString(),
      },
    ];
    await gotoNotesAsLoggedIn(page, initialNotes);

    await expect(page.getByText('Original Title')).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();

    await expect(page.locator('.note-form h2')).toHaveText('Edit Note');
    await expect(page.getByPlaceholder('Title')).toHaveValue('Original Title');

    await page.getByPlaceholder('Title').fill('Updated Title');
    await page.getByPlaceholder('Content').fill('Updated content');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.note-form')).toHaveCount(0);
    await expect(page.getByText('Updated Title')).toBeVisible();
  });

  test('delete note UI flow', async ({ page }) => {
    const initialNotes: Note[] = [
      {
        id: '1',
        title: 'Note to Delete',
        content: 'This will be deleted',
        createdAt: new Date().toISOString(),
      },
    ];
    await gotoNotesAsLoggedIn(page, initialNotes);

    await expect(page.getByText('Note to Delete')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.note-card')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText(/No notes yet/)).toBeVisible();
  });

  test('search notes works in UI', async ({ page }) => {
    const initialNotes: Note[] = [
      { id: '1', title: 'React Tutorial', content: 'Learn React basics', createdAt: new Date().toISOString() },
      { id: '2', title: 'Vue Tutorial', content: 'Learn Vue basics', createdAt: new Date().toISOString() },
    ];
    await gotoNotesAsLoggedIn(page, initialNotes);

    await expect(page.locator('.note-card')).toHaveCount(2);

    await page.getByPlaceholder('Search notes...').fill('React');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.locator('.note-card')).toHaveCount(1);
    await expect(page.getByText('React Tutorial')).toBeVisible();
    await expect(page.getByText('Vue Tutorial')).not.toBeVisible();
  });

  test('failed notes loading shows error message', async ({ page }) => {
    await page.route(
      (url: URL) => url.origin === API && url.pathname === '/notes',
      (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        })
    );

    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('token', 'fake-token'));
    await page.goto('/notes');

    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('.error')).toContainText('Failed to load notes');
  });

  test('failed create note shows error message', async ({ page }) => {
    await page.route(
      (url: URL) => url.origin === API && url.pathname === '/notes',
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Validation failed' }),
          });
        }
      }
    );

    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('token', 'fake-token'));
    await page.goto('/notes');

    await page.getByRole('button', { name: /New Note/i }).click();
    await page.getByPlaceholder('Title').fill('Test');
    await page.getByPlaceholder('Content').fill('Content');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText('Failed to create note');
  });

  test('failed delete note shows error message', async ({ page }) => {
    await page.route(
      (url: URL) => url.origin === API && url.pathname === '/notes',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: '1', title: 'Test Note', content: 'Content', createdAt: new Date().toISOString() },
          ])
        })
    );
    await page.route(
      (url: URL) => url.origin === API && url.pathname.startsWith('/notes/'),
      (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Forbidden' }),
        })
    );

    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('token', 'fake-token'));
    await page.goto('/notes');

    await expect(page.getByText('Test Note')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText('Failed to delete note');
  });
});
