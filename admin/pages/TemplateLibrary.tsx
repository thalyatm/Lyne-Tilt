import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Plus, Copy, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isDefault: boolean;
  blocks: any[];
  updatedAt: string;
}

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates/seed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to seed templates');
      }

      toast.success('Default templates created successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error seeding templates:', error);
      toast.error('Failed to seed default templates');
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    setDeletingId(selectedTemplate.id);
    try {
      const response = await fetch(`${API_BASE}/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast.success('Template deleted successfully');
      fetchTemplates();
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const hasDefaultTemplates = templates.some(t => t.isDefault);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-10 w-48 bg-stone-200 rounded animate-pulse mb-2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-stone-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-stone-200 rounded w-2/3 mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-stone-200 rounded w-20"></div>
              </div>
              <div className="h-10 bg-stone-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-2xl font-serif text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              No templates yet
            </h2>
            <p className="text-stone-500 mb-6">
              Get started by seeding the default email templates or creating your own custom template.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSeedDefaults}
                className="px-6 py-3 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                Seed Default Templates
              </button>
              <Link
                to="/admin/templates/new"
                className="px-6 py-3 rounded-lg transition-colors bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Create Custom Template
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
          Templates
        </h1>
        <div className="flex gap-3">
          {!hasDefaultTemplates && (
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors flex items-center gap-2"
            >
              Seed Defaults
            </button>
          )}
          <Link
            to="/admin/templates/new"
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-white"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a2830'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8d3038'}
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            {/* Template Info */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-stone-800 mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-stone-500 line-clamp-2 mb-3">
                {template.description}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                  {template.category}
                </span>
                {template.isDefault && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Default
                  </span>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{template.blocks?.length || 0} blocks</span>
                <span>Updated {formatDate(template.updatedAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-stone-100">
              <button
                onClick={() => navigate(`/admin/templates/${template.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDuplicate(template.id)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteClick(template)}
                disabled={template.isDefault}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  template.isDefault
                    ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-stone-800 mb-2">
                  Delete Template
                </h3>
                <p className="text-sm text-stone-600">
                  Are you sure you want to delete "{selectedTemplate.name}"? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTemplate(null);
                }}
                disabled={deletingId !== null}
                className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
