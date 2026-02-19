
# Admin Center Testing Plan

This document outlines the testing procedures for the Admin Center.

## General Checks

- [ ] **Authentication (`admin/pages/Login.tsx`, `admin/context/AuthContext.tsx`, `admin/components/ProtectedRoute.tsx`):**
    - [ ] Test admin login and logout with valid and invalid credentials.
    - [ ] Verify session management and automatic logout after inactivity.
    - [ ] Ensure all admin pages are protected and inaccessible without login.
- [ ] **User Permissions:**
    - [ ] If different admin roles exist, test access control for each role.
- [ ] **Navigation (`admin/AdminLayout.tsx`):**
    - [ ] Verify all navigation links work correctly.
    - [ ] Ensure the active navigation item is highlighted.
- [ ] **Forms (`admin/components/FormModal.tsx`, `admin/components/ArrayEditor.tsx`, `admin/components/RichTextEditor.tsx`, `admin/components/SeoFields.tsx`):**
    - [ ] Test form submission, validation, and error handling for all forms.
    - [ ] Verify rich text editor functionality (if applicable).
    - [ ] Test array editor functionality (if applicable).
    - [ ] Test SEO fields input and display.
- [ ] **Data Tables (`admin/components/DataTable.tsx`):**
    - [ ] Test sorting, filtering, and pagination.
    - [ ] Verify data accuracy.
- [ ] **Modals (`admin/components/FormModal.tsx`):**
    - [ ] Test opening and closing modals.
    - [ ] Ensure data is saved or discarded correctly upon modal actions.
- [ ] **Help Tooltips (`admin/components/HelpTooltip.tsx`):**
    - [ ] Verify tooltips appear on hover and display correct information.
- [ ] **Keyboard Shortcuts (`admin/hooks/useKeyboardShortcuts.ts`):**
    - [ ] Test implemented keyboard shortcuts for common actions.
- [ ] **API Integrations (`admin/config/api.ts`):**
    - [ ] Ensure all API calls are working correctly and data is being fetched/sent as expected.
    - [ ] Test error handling for API failures.
- [ ] **Toast Notifications (`admin/context/ToastContext.tsx`):**
    - [ ] Verify success, error, and info toasts are displayed correctly.

## Pages

### Analytics & Reporting

- [ ] **Dashboard (`admin/pages/Dashboard.tsx`):**
    - [ ] Verify all widgets and charts load data correctly.
    - [ ] Check date range filters and data refresh.
- [ ] **Analytics Hub (`admin/pages/AnalyticsHub.tsx`):**
    - [ ] Navigate through different analytics sections (Content, Customers, Email, Revenue, Services, Campaigns).
    - [ ] Verify data consistency across reports.
- [ ] **Activity Log (`admin/pages/ActivityLog.tsx`):**
    - [ ] Verify all user actions are logged correctly.
    - [ ] Test filtering and searching the activity log.

### CRM & Customer Management

- [ ] **Customers Manager (`admin/pages/CustomersManager.tsx`):**
    - [ ] Test adding, editing, and deleting customers.
    - [ ] Verify customer search and filtering.
- [ ] **Customer Detail (`admin/pages/CustomerDetail.tsx`):**
    - [ ] Verify all customer information is displayed accurately.
    - [ ] Test editing customer details, viewing order history, etc.
- [ ] **Subscribers List (`admin/pages/SubscriberList.tsx`):**
    - [ ] Test adding, editing, and deleting subscribers.
    - [ ] Test subscriber import (`admin/pages/SubscriberImport.tsx`).
- [ ] **Client Manager (`admin/pages/ClientsManager.tsx`):**
    - [ ] Test managing clients (likely for coaching/services).
    - [ ] Verify client details (`admin/pages/ClientDetail.tsx`).
- [ ] **Abandoned Carts Manager (`admin/pages/AbandonedCartsManager.tsx`):**
    - [ ] Verify abandoned carts are listed.
    - [ ] Test any actions related to abandoned carts (e.g., sending reminders).
- [ ] **Segment Builder (`admin/pages/SegmentBuilder.tsx`):**
    - [ ] Test creating and editing customer segments.
    - [ ] Verify segment logic and membership.
- [ ] **Segment List (`admin/pages/SegmentList.tsx`):**
    - [ ] Verify all created segments are listed and editable.

### Product & Inventory Management

- [ ] **Products Manager (`admin/pages/ProductsManager.tsx`):**
    - [ ] Test adding, editing, and deleting products.
    - [ ] Verify product search and filtering.
- [ ] **Product Editor (`admin/pages/ProductEditor.tsx`):**
    - [ ] Test all fields in the product editor (name, description, price, images, variants, SEO, etc.).
    - [ ] Test publishing/unpublishing products (`admin/components/PublishControls.tsx`).
- [ ] **Inventory Manager (`admin/pages/InventoryManager.tsx`):**
    - [ ] Test updating stock levels.
    - [ ] Verify low stock alerts (if implemented).
- [ ] **Gift Cards Manager (`admin/pages/GiftCardsManager.tsx`):**
    - [ ] Test creating, managing, and tracking gift cards.
- [ ] **Reviews Manager (`admin/pages/ReviewsManager.tsx`):**
    - [ ] Test approving, rejecting, and editing customer reviews.
- [ ] **Wall Art Manager (`admin/pages/WallArtManager.tsx`):**
    - [ ] Test managing wall art specific products (if different from general products).

### Order & Sales Management

- [ ] **Orders Manager (`admin/pages/OrdersManager.tsx`):**
    - [ ] Test viewing, filtering, and searching orders.
    - [ ] Test updating order status.
- [ ] **Order Detail (`admin/pages/OrderDetail.tsx`):**
    - [ ] Verify all order details (customer, items, shipping, payment) are accurate.
    - [ ] Test generating invoices or packing slips.

### Marketing & Campaigns

- [ ] **Campaign List (`admin/pages/CampaignList.tsx`):**
    - [ ] Test creating, editing, and deleting marketing campaigns.
- [ ] **Campaign Compose (`admin/pages/CampaignCompose.tsx`):**
    - [ ] Test composing email campaigns using the rich text editor.
    - [ ] Test sending test emails.
    - [ ] Test campaign scheduling.
- [ ] **Campaign Review (`admin/pages/CampaignReview.tsx`):**
    - [ ] Verify campaign content and settings before sending.
- [ ] **Newsletter Manager (`admin/pages/NewsletterManager.tsx`):**
    - [ ] Test managing newsletter subscribers (covered in CRM).
    - [ ] Test creating and sending newsletters.
- [ ] **Promotions Manager (`admin/pages/PromotionsManager.tsx`):**
    - [ ] Test creating and managing discount codes and promotions.
    - [ ] Verify promotion rules and applicability.
- [ ] **Template Library (`admin/pages/TemplateLibrary.tsx`):**
    - [ ] Test managing email or other content templates.
    - [ ] Test template editor (`admin/pages/TemplateEditor.tsx`).

### Coaching & Workshops

- [ ] **Coaching Manager (`admin/pages/CoachingManager.tsx`):**
    - [ ] Test managing coaching programs and clients.
- [ ] **Coaching Editor (`admin/pages/CoachingEditor.tsx`):**
    - [ ] Test creating and editing coaching programs.
- [ ] **Workshops Manager (`admin/pages/WorkshopsManager.tsx`):**
    - [ ] Test managing workshops.
- [ ] **Workshop Editor (`admin/pages/WorkshopEditor.tsx`):**
    - [ ] Test creating and editing workshops.
- [ ] **Cohorts Manager (`admin/pages/CohortsManager.tsx`):**
    - [ ] Test managing cohorts for coaching or workshops.
- [ ] **Cohort Editor (`admin/pages/CohortEditor.tsx`):**
    - [ ] Test creating and editing cohorts.

### Content Management

- [ ] **Blog Manager (`admin/pages/BlogManager.tsx`):**
    - [ ] Test creating, editing, publishing, and deleting blog posts.
- [ ] **FAQs Manager (`admin/pages/FAQsManager.tsx`):**
    - [ ] Test creating, editing, and deleting FAQs.
- [ ] **Learn Manager (`admin/pages/LearnManager.tsx`):**
    - [ ] Test managing learning content (courses, lessons).
- [ ] **Media Library (`admin/pages/MediaLibrary.tsx`):**
    - [ ] Test uploading, organizing, and deleting media files.
    - [ ] Verify image resizing and optimization (if implemented).
- [ ] **Testimonials Manager (`admin/pages/TestimonialsManager.tsx`):**
    - [ ] Test adding, approving, and displaying testimonials.

### Settings & Configuration

- [ ] **Site Settings Manager (`admin/pages/SiteSettingsManager.tsx`):**
    - [ ] Test updating general site settings (e.g., store name, contact info, social links).
    - [ ] Verify changes reflect on the frontend.
- [ ] **Email Settings (`admin/pages/EmailSettings.tsx`):**
    - [ ] Test configuring email templates and sending settings.
- [ ] **Data Export (`admin/pages/DataExport.tsx`):**
    - [ ] Test exporting various types of data (customers, orders, products).
    - [ ] Verify exported data integrity.

### Automation & Queue

- [ ] **Automations Manager (`admin/pages/AutomationsManager.tsx`):**
    - [ ] Test creating, editing, and activating automations.
    - [ ] Verify automation triggers and actions.
- [ ] **Automation Queue (`admin/pages/AutomationQueue.tsx`):**
    - [ ] Monitor and manage queued automation tasks.
- [ ] **Applications Manager (`admin/pages/ApplicationsManager.tsx`):**
    - [ ] Manage applications (e.g., coaching applications).
    - [ ] Test approving/rejecting applications.
- [ ] **Waitlist Manager (`admin/pages/WaitlistManager.tsx`):**
    - [ ] Manage waitlists for products or services.
    - [ ] Test adding/removing users from waitlists.

## Admin Layout and Components

- [ ] **Admin Layout (`admin/AdminLayout.tsx`):**
    - [ ] Verify consistent header, sidebar navigation, and footer.
    - [ ] Test responsiveness of the admin layout.
- [ ] **Protected Route (`admin/components/ProtectedRoute.tsx`):**
    - [ ] Ensure unauthorized access is prevented and redirects to login.
- [ ] **Publish Controls (`admin/components/PublishControls.tsx`):**
    - [ ] Test publishing and unpublishing functionality for content types (e.g., products, blog posts).
- [ ] **Rich Text Editor (`admin/components/RichTextEditor.tsx`):**
    - [ ] Test all formatting options (bold, italic, links, images, etc.).
    - [ ] Ensure content is saved and displayed correctly.
- [ ] **Accordion Section (`admin/components/AccordionSection.tsx`):**
    - [ ] Test opening and closing accordion sections.
    - [ ] Ensure content within accordions is displayed correctly.
- [ ] **Draggable List (`admin/components/DraggableList.tsx`):**
    - [ ] Test reordering items in draggable lists (e.g., for categories, menu items).
- [ ] **Preview Frame (`admin/components/PreviewFrame.tsx`):**
    - [ ] If used for live previews, verify that changes made in the editor are reflected in the preview.
