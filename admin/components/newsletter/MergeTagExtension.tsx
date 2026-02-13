import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

// Available merge tags
export const MERGE_TAGS = [
  { id: 'first_name', label: 'First Name', placeholder: '{{first_name}}', fallback: 'there' },
  { id: 'subscriber_name', label: 'Full Name', placeholder: '{{subscriber_name}}', fallback: 'Subscriber' },
  { id: 'email', label: 'Email', placeholder: '{{email}}', fallback: '' },
  { id: 'unsubscribe_url', label: 'Unsubscribe URL', placeholder: '{{unsubscribe_url}}', fallback: '#' },
];

// React component for rendering merge tag in the editor
function MergeTagView({ node }: { node: any }) {
  const tag = MERGE_TAGS.find((t) => t.id === node.attrs.tagId);
  const label = tag?.label || node.attrs.tagId;

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center gap-0.5 bg-clay/10 text-clay text-xs font-medium px-1.5 py-0.5 rounded-md cursor-default select-none"
        contentEditable={false}
        data-merge-tag={node.attrs.tagId}
      >
        {label}
      </span>
    </NodeViewWrapper>
  );
}

// TipTap Node extension
export const MergeTagNode = Node.create({
  name: 'mergeTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tagId: {
        default: 'first_name',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-merge-tag'),
        renderHTML: (attributes: Record<string, any>) => ({
          'data-merge-tag': attributes.tagId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-merge-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const tagId = HTMLAttributes['data-merge-tag'] || 'first_name';
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-merge-tag': tagId,
      class: 'merge-tag',
    }), `{{${tagId}}}`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeTagView);
  },
});
