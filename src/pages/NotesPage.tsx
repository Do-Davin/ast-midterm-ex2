import { useState, useCallback, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getNotes, getNoteById, createNote, updateNote, deleteNote } from '../api/api';
import type { Note, NoteData } from '../api/api';

function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFolder, setFormFolder] = useState('');
  const [formSharedEmail, setFormSharedEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const doFetchNotes = useCallback(async (search?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotes(search);
      setNotes(res.data);
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void doFetchNotes();
  }, [doFetchNotes]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    await doFetchNotes(searchInput.trim() || undefined);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormFolder('');
    setFormSharedEmail('');
    setFormError('');
    setShowForm(true);
    setSelectedNote(null);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormFolder(note.folderName ?? '');
    setFormSharedEmail(note.sharedWithEmail ?? '');
    setFormError('');
    setShowForm(true);
    setSelectedNote(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    const data: NoteData = {
      title: formTitle,
      content: formContent,
      ...(formFolder.trim() && { folderName: formFolder.trim() }),
      ...(formSharedEmail.trim() && { sharedWithEmail: formSharedEmail.trim() }),
    };
    try {
      if (editingId) {
        await updateNote(editingId, data);
      } else {
        await createNote(data);
      }
      setShowForm(false);
      setEditingId(null);
      await doFetchNotes(searchInput.trim() || undefined);
    } catch {
      setFormError(editingId ? 'Failed to update note' : 'Failed to create note');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteNote(id);
      await doFetchNotes(searchInput.trim() || undefined);
    } catch {
      setError('Failed to delete note');
    }
  };

  const handleViewDetail = async (id: string) => {
    setError('');
    try {
      const res = await getNoteById(id);
      setSelectedNote(res.data);
      setShowForm(false);
    } catch {
      setError('Failed to load note details');
    }
  };

  const handleCloseDetail = () => {
    setSelectedNote(null);
  };

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>My Notes</h1>
        <button onClick={openCreate} className="btn-primary">
          + New Note
        </button>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="note-form">
          <h2>{editingId ? 'Edit Note' : 'New Note'}</h2>
          {formError && <p className="error">{formError}</p>}
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Content"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              required
            />
            <input
              type="text"
              placeholder="Folder Name (optional)"
              value={formFolder}
              onChange={(e) => setFormFolder(e.target.value)}
            />
            <input
              type="email"
              placeholder="Share with Email (optional)"
              value={formSharedEmail}
              onChange={(e) => setFormSharedEmail(e.target.value)}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedNote && (
        <div className="note-detail">
          <div className="detail-header">
            <h2>Note Detail</h2>
            <button onClick={handleCloseDetail} className="btn-secondary">
              Close
            </button>
          </div>
          <div className="detail-row">
            <strong>Title:</strong> {selectedNote.title}
          </div>
          <div className="detail-row">
            <strong>Content:</strong>
            <p className="detail-content">{selectedNote.content}</p>
          </div>
          {selectedNote.folderName && (
            <div className="detail-row">
              <strong>Folder:</strong> {selectedNote.folderName}
            </div>
          )}
          {selectedNote.sharedWithEmail && (
            <div className="detail-row">
              <strong>Shared with:</strong> {selectedNote.sharedWithEmail}
            </div>
          )}
          <div className="detail-row">
            <strong>Created:</strong>{' '}
            {new Date(selectedNote.createdAt).toLocaleString()}
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="empty">No notes yet. Create your first note!</p>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <h3>{note.title}</h3>
                <div className="note-actions">
                  <button
                    onClick={() => void handleViewDetail(note.id)}
                    className="btn-view"
                  >
                    View
                  </button>
                  <button onClick={() => openEdit(note)} className="btn-edit">
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(note.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="note-content">{note.content}</p>
              {note.folderName && (
                <p className="note-meta">Folder: {note.folderName}</p>
              )}
              {note.sharedWithEmail && (
                <p className="note-meta">Shared with: {note.sharedWithEmail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotesPage;
