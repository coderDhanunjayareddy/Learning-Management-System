// src/pages/teacher/CourseContentManager.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface ContentItem {
  id: number;
  parent_id: number | null;
  item_type: 'folder' | 'video' | 'text' | 'pdf' | 'scorm';
  title: string;
  content_url: string | null;
  order_index: number | null;
  children?: ContentItem[];
}

export default function CourseContentManager() {
  const { id: courseIdStr } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(courseIdStr);

  const [tree, setTree] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch content
  const fetchContent = async () => {
    try {
      const res = await api.get(`/teacher/courses/${courseId}/content`);
      const flat: ContentItem[] = res.data;
      const buildTree = (items: ContentItem[], parentId: number | null = null): ContentItem[] =>
        items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id)
          }));
      setTree(buildTree(flat));
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Failed to load course content');
      navigate('/teacher'); // go back on error
    }
  };

  useEffect(() => {
    if (courseId) fetchContent();
  }, [courseId]);

  if (loading) return <div className="p-6">Loading course content...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/teacher')}
        className="mb-4 text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back to My Courses
      </button>

      <h1 className="text-2xl font-bold mb-6">Manage Course Content</h1>

      <AddContentForm courseId={courseId} parentId={null} onAdd={fetchContent} />

      <div className="mt-6">
        {tree.length === 0 ? (
          <p className="text-gray-500">No content added yet.</p>
        ) : (
          tree.map(node => (
            <ContentItem
              key={node.id}
              node={node}
              courseId={courseId}
              onAdd={fetchContent}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ================================
// Add Content Form (Inline)
// ================================
const AddContentForm = ({ courseId, parentId, onAdd }: { 
  courseId: number; 
  parentId: number | null; 
  onAdd: () => void; 
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'folder' | 'video' | 'text' | 'pdf' | 'scorm'>('folder');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // 🔜 In real app: upload file and get URL
    let contentUrl: string | null = null;
    if (['video', 'pdf', 'scorm'].includes(type) && file) {
      alert('⚠️ File upload not implemented yet. In production, upload to cloud storage.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post(`/teacher/courses/${courseId}/content`, {
        parent_id: parentId,
        item_type: type,
        title: title.trim(),
        content_url: contentUrl,
      });
      onAdd();
      setTitle('');
      setFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add content');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 border rounded bg-gray-50">
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="px-2 py-1 border rounded text-sm"
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="folder">📁 Folder</option>
          <option value="video">🎥 Video</option>
          <option value="text">📝 Text</option>
          <option value="pdf">📄 PDF</option>
          <option value="scorm">📦 SCORM</option>
        </select>
        {['video', 'pdf', 'scorm'].includes(type) && (
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
            required
          />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
};

// ================================
// Recursive Content Item
// ================================
const ContentItem = ({ node, courseId, onAdd }: { 
  node: ContentItem; 
  courseId: number; 
  onAdd: () => void; 
}) => {
  return (
    <div className="ml-6 mt-3">
      <div className="flex items-center">
        <span className="font-medium">{node.title}</span>
        <span className="ml-2 text-xs text-gray-500">({node.item_type})</span>
        {node.content_url && (
          <a
            href={node.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 text-sm hover:underline"
          >
            View
          </a>
        )}
      </div>

      {node.item_type === 'folder' && (
        <div className="mt-2">
          <AddContentForm courseId={courseId} parentId={node.id} onAdd={onAdd} />
        </div>
      )}

      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <ContentItem key={child.id} node={child} courseId={courseId} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
};