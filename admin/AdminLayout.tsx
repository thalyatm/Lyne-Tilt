import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { API_BASE } from './config/api';
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Send,
  Users,
  BookOpen,
  Star,
  Settings,
  Bell,
  Zap,
  Megaphone,
  Contact,
  Filter,
  LayoutTemplate,
  ListOrdered,
  Mail,
  BarChart3,
  CalendarDays,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Package,
  Image,
  MessageSquare,
  ShoppingCart,
  Gift,
  BellRing,
  Database,
  Moon,
  Sun,
  ClipboardList,
  ChevronDown,
  Heart,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  end?: boolean;
  sub?: boolean;
  parent?: string; // which parent route these sub-items belong to
}

interface NavSection {
  label?: string;
  items: NavItem[];
  separator?: boolean;
}

export default function AdminLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin-dark-mode') === 'true');

  // Track which parent groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (parent: string) => {
    setExpandedGroups(prev => ({ ...prev, [parent]: !prev[parent] }));
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      localStorage.setItem('admin-dark-mode', String(!prev));
      return !prev;
    });
  };

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/contact/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        // Silently fail - not critical
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch badge counts for sidebar
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/dashboard/badge-counts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setBadgeCounts(data);
        }
      } catch (error) {
        // Silently fail
      }
    };
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Auto-expand groups when current path matches a sub-item
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin/coaching/') || path === '/admin/bookings') {
      setExpandedGroups(prev => ({ ...prev, coaching: true }));
    }
    if (path === '/admin/cohorts') {
      setExpandedGroups(prev => ({ ...prev, workshops: true }));
    }
    if (path === '/admin/gift-cards') {
      setExpandedGroups(prev => ({ ...prev, products: true }));
    }
    if (path === '/admin/abandoned-carts' || path === '/admin/wishlists') {
      setExpandedGroups(prev => ({ ...prev, 'site-members': true }));
    }
    if (path === '/admin/segments') {
      setExpandedGroups(prev => ({ ...prev, subscribers: true }));
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navSections: NavSection[] = [
    {
      // OVERVIEW — no label for first group
      items: [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/admin/analytics', icon: BarChart3, label: 'Site Analytics' },
      ],
    },
    {
      label: 'Shop',
      items: [
        { to: '/admin/orders', icon: Package, label: 'Orders' },
        { to: '/admin/products', icon: ShoppingBag, label: 'Products' },
        { to: '/admin/gift-cards', icon: Gift, label: 'Gift Cards', sub: true, parent: 'products' },
        { to: '/admin/promotions', icon: Tag, label: 'Promotions' },
      ],
    },
    {
      label: 'Services',
      items: [
        { to: '/admin/coaching', icon: Users, label: 'Coaching' },
        { to: '/admin/coaching/applications', icon: ClipboardList, label: 'Applications', sub: true, parent: 'coaching' },
        { to: '/admin/coaching/clients', icon: Contact, label: 'Clients', sub: true, parent: 'coaching' },
        { to: '/admin/bookings', icon: Clock, label: 'Bookings', sub: true, parent: 'coaching' },
        { to: '/admin/workshops', icon: BookOpen, label: 'Workshops & Courses' },
        { to: '/admin/cohorts', icon: CalendarDays, label: 'Cohorts', sub: true, parent: 'workshops' },
        { to: '/admin/waitlist', icon: BellRing, label: 'Waitlist', sub: true, parent: 'workshops' },
      ],
    },
    {
      label: 'People',
      items: [
        { to: '/admin/customers', icon: Users, label: 'Site Members' },
        { to: '/admin/abandoned-carts', icon: ShoppingCart, label: 'Abandoned Carts', sub: true, parent: 'site-members' },
        { to: '/admin/wishlists', icon: Heart, label: 'Wishlists', sub: true, parent: 'site-members' },
        { to: '/admin/reviews', icon: MessageSquare, label: 'Reviews' },
      ],
    },
    {
      label: 'Content',
      items: [
        { to: '/admin/blog', icon: FileText, label: 'Oxygen Notes' },
        { to: '/admin/faqs', icon: HelpCircle, label: 'FAQs' },
        { to: '/admin/media', icon: Image, label: 'Media Library' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/admin/subscribers', icon: Contact, label: 'Subscribers' },
        { to: '/admin/segments', icon: Filter, label: 'Segments', sub: true, parent: 'subscribers' },
        { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns' },
        { to: '/admin/newsletter', icon: Send, label: 'Newsletter' },
        { to: '/admin/templates', icon: LayoutTemplate, label: 'Templates' },
        { to: '/admin/automations', icon: Zap, label: 'Automations' },
        { to: '/admin/automations/queue', icon: ListOrdered, label: 'Queue' },
        { to: '/admin/email-settings', icon: Mail, label: 'Email Settings' },
      ],
    },
    {
      // SETTINGS — no label, separator above
      separator: true,
      items: [
        { to: '/admin/settings', icon: Settings, label: 'Site Settings' },
        { to: '/admin/activity', icon: Clock, label: 'Activity Log' },
        { to: '/admin/data-export', icon: Database, label: 'Data Export' },
      ],
    },
  ];

  const headerHeight = 'h-11';
  const headerOffset = 'top-11';

  // Render a nav item
  const renderNavItem = (item: NavItem) => {
    const badge = badgeCounts[item.to] || 0;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2 py-1.5 rounded-md text-sm transition-colors ${
            item.sub ? 'pl-7 pr-2' : 'px-2'
          } ${
            isActive
              ? 'bg-stone-200/60 text-stone-900 font-medium'
              : 'text-stone-600 hover:bg-stone-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <item.icon
              size={item.sub ? 14 : 16}
              className={isActive ? 'text-stone-700' : 'text-stone-400'}
            />
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  // Render a parent item with collapsible children
  const renderCollapsibleGroup = (parentItem: NavItem, children: NavItem[]) => {
    const groupKey = children.length > 0 ? children[0].parent! : parentItem.to;
    const isExpanded = expandedGroups[groupKey] ?? false;
    const parentBadge = badgeCounts[parentItem.to] || 0;
    // Sum up child badges for collapsed state
    const childBadgeTotal = children.reduce((sum, child) => sum + (badgeCounts[child.to] || 0), 0);
    const totalBadge = parentBadge + childBadgeTotal;
    const isParentActive = location.pathname === parentItem.to ||
      children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'));

    return (
      <div key={parentItem.to}>
        <div className="flex items-center">
          <NavLink
            to={parentItem.to}
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex-1 flex items-center gap-2 py-1.5 px-2 rounded-l-md text-sm transition-colors ${
                isActive
                  ? 'bg-stone-200/60 text-stone-900 font-medium'
                  : isParentActive
                    ? 'text-stone-700'
                    : 'text-stone-600 hover:bg-stone-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <parentItem.icon
                  size={16}
                  className={isActive || isParentActive ? 'text-stone-700' : 'text-stone-400'}
                />
                <span className="flex-1">{parentItem.label}</span>
                {!isExpanded && totalBadge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalBadge > 99 ? '99+' : totalBadge}
                  </span>
                )}
              </>
            )}
          </NavLink>
          <button
            onClick={() => toggleGroup(groupKey)}
            className="p-1.5 rounded-r-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {children.map(child => renderNavItem(child))}
          </div>
        )}
      </div>
    );
  };

  // Process items to handle collapsible groups
  const renderSectionItems = (items: NavItem[]) => {
    const rendered: React.ReactNode[] = [];
    let i = 0;

    while (i < items.length) {
      const item = items[i];

      // Check if next items are sub-items of this parent
      if (!item.sub) {
        const children: NavItem[] = [];
        let j = i + 1;
        while (j < items.length && items[j].sub && items[j].parent) {
          children.push(items[j]);
          j++;
        }

        if (children.length > 0) {
          rendered.push(renderCollapsibleGroup(item, children));
          i = j;
          continue;
        }
      }

      rendered.push(renderNavItem(item));
      i++;
    }

    return rendered;
  };

  return (
    <div className={`min-h-screen bg-stone-50 ${darkMode ? 'admin-dark' : ''}`}>
      {/* Full-width Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${headerHeight}`} style={{ backgroundColor: '#8d3038' }}>
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-stone-800 rounded-md text-stone-300"
            >
              <Menu size={20} />
            </button>
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-1.5 hover:bg-stone-800 rounded-md text-stone-400 hover:text-stone-200 transition-colors"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div>
              <h1 className="text-sm font-serif text-white leading-tight">Lyne Tilt</h1>
              <p className="text-[10px] text-stone-400 tracking-wide">Site Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-md transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Messages bell */}
            <button
              onClick={() => navigate('/admin/inbox')}
              className="relative p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-md transition-colors"
              title="Messages"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* View website link */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">View My Website</span>
              <span className="sm:hidden">View Site</span>
            </a>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed ${headerOffset} left-0 z-40 h-[calc(100vh-2.75rem)] w-60 bg-stone-50 border-r border-stone-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      >
        {/* Close button (mobile only) */}
        <div className="flex items-center justify-end px-3 py-2 lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-stone-100 rounded-md text-stone-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2 pb-16 overflow-y-auto h-[calc(100%-3.5rem)]">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.separator && (
                <div className="border-t border-stone-200 my-3" />
              )}
              {section.label && (
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider text-stone-400 px-3 mb-1 ${
                    sectionIdx === 0 ? 'mt-0' : 'mt-6'
                  }`}
                >
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {renderSectionItems(section.items)}
              </div>
            </div>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center text-xs font-medium text-stone-600">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{user?.name}</p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`pt-11 transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-60'}`}>
        {/* Page content */}
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
