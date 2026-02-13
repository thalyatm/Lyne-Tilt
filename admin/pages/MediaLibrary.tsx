import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  Search,
  Grid,
  List,
  X,
  Loader2,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

interface MediaFile {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export default function MediaLibrary() {
  const { token } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/upload`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    if (fileList.length === 1) {
      formData.append('image', fileList[0]);
      try {
        const response = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (response.ok) {
          fetchFiles();
        }
      } catch (error) {
      }
    } else {
      for (let i = 0; i < fileList.length; i++) {
        formData.append('images', fileList[i]);
      }
      try {
        const response = await fetch(`${API_BASE}/upload/multiple`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (response.ok) {
          fetchFiles();
        }
      } catch (error) {
      }
    }
    setUploading(false);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`${API_BASE}/upload/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.filename !== filename));
        if (selectedFile?.filename === filename) {
          setSelectedFile(null);
        }
      }
    } catch (error) {
    }
  };

  const copyToClipboard = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-800">Media Library</h1>
          <p className="text-stone-500 mt-1">{files.length} images</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFiles}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition cursor-pointer">
            <Upload size={18} />
            <span className="text-sm font-medium">Upload</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/20"
          />
        </div>
        <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* File Grid/List */}
        <div
          className={`flex-1 bg-white rounded-lg shadow-sm overflow-hidden ${
            dragOver ? 'ring-2 ring-clay ring-offset-2' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-stone-400" size={32} />
            </div>
          ) : uploading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin text-clay mx-auto mb-2" size={32} />
                <p className="text-stone-500">Uploading...</p>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <FileImage size={48} className="mx-auto text-stone-300 mb-4" />
                <h3 className="text-lg font-medium text-stone-700 mb-2">
                  {searchQuery ? 'No images found' : 'No images yet'}
                </h3>
                <p className="text-stone-500 mb-4">
                  {searchQuery ? 'Try a different search term' : 'Drag and drop images here or click Upload'}
                </p>
                {!searchQuery && (
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition cursor-pointer">
                    <Upload size={18} />
                    <span>Choose Files</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto h-full">
              {filteredFiles.map((file) => (
                <div
                  key={file.filename}
                  onClick={() => setSelectedFile(file)}
                  className={`group relative aspect-square bg-stone-100 rounded-lg overflow-hidden cursor-pointer transition ${
                    selectedFile?.filename === file.filename
                      ? 'ring-2 ring-clay'
                      : 'hover:ring-2 hover:ring-stone-300'
                  }`}
                >
                  <img
                    src={`${API_BASE.replace(/\/api$/, '')}${file.url}`}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(file.url);
                      }}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-stone-100"
                    >
                      {copiedUrl === file.url ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              <table className="w-full">
                <thead className="bg-stone-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Preview</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Filename</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.filename}
                      onClick={() => setSelectedFile(file)}
                      className={`cursor-pointer transition ${
                        selectedFile?.filename === file.filename ? 'bg-clay/5' : 'hover:bg-stone-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <img
                          src={`${API_BASE.replace(/\/api$/, '')}${file.url}`}
                          alt={file.filename}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700 truncate max-w-xs">{file.filename}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">{formatFileSize(file.size)}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">{formatDate(file.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(file.url);
                            }}
                            className="p-1.5 hover:bg-stone-100 rounded text-stone-500"
                          >
                            {copiedUrl === file.url ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.filename);
                            }}
                            className="p-1.5 hover:bg-red-50 rounded text-stone-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedFile && (
          <div className="w-80 bg-white rounded-lg shadow-sm flex flex-col">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-medium text-stone-800">Image Details</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-stone-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="aspect-square bg-stone-100 rounded-lg overflow-hidden mb-4">
                <img
                  src={`${API_BASE.replace(/\/api$/, '')}${selectedFile.url}`}
                  alt={selectedFile.filename}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase">Filename</label>
                  <p className="text-sm text-stone-800 break-all">{selectedFile.filename}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase">Size</label>
                  <p className="text-sm text-stone-800">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase">Uploaded</label>
                  <p className="text-sm text-stone-800">{formatDate(selectedFile.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase">URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${selectedFile.url}`}
                      className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1.5"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedFile.url)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded"
                    >
                      {copiedUrl === selectedFile.url ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-stone-100">
              <button
                onClick={() => handleDelete(selectedFile.filename)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={16} />
                Delete Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
