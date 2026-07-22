export const demoCategories = [
  { id: '1', name: 'Doctors & Medical', slug: 'doctors', icon: 'stethoscope', description: 'Pediatricians, dentists, eye doctors, specialists', sort_order: 1 },
  { id: '2', name: 'Home Services', slug: 'home-services', icon: 'wrench', description: 'Handymen, plumbers, electricians, HVAC, painters', sort_order: 2 },
  { id: '3', name: 'Auto Services', slug: 'auto', icon: 'car', description: 'Mechanics, body shops, car wash, towing', sort_order: 3 },
  { id: '4', name: 'Education & Tutoring', slug: 'education', icon: 'graduation-cap', description: 'Tutors, music teachers, test prep, schools', sort_order: 4 },
  { id: '5', name: 'Childcare', slug: 'childcare', icon: 'baby', description: 'Babysitters, daycares, nannies, after-school programs', sort_order: 5 },
  { id: '6', name: 'Restaurants & Food', slug: 'food', icon: 'utensils', description: 'Restaurants, grocery stores, catering, bakeries', sort_order: 6 },
  { id: '7', name: 'Legal & Financial', slug: 'legal', icon: 'scale', description: 'Lawyers, CPAs, tax consultants, financial advisors', sort_order: 7 },
  { id: '8', name: 'Beauty & Wellness', slug: 'beauty', icon: 'sparkles', description: 'Salons, spas, gyms, yoga studios, therapists', sort_order: 8 },
  { id: '9', name: 'Real Estate', slug: 'real-estate', icon: 'home', description: 'Realtors, mortgage brokers, movers, storage', sort_order: 9 },
  { id: '10', name: 'Pet Services', slug: 'pets', icon: 'paw-print', description: 'Vets, groomers, pet sitters, trainers', sort_order: 10 },
  { id: '11', name: 'Cleaning Services', slug: 'cleaning', icon: 'spray-can', description: 'House cleaning, carpet cleaning, pressure washing', sort_order: 11 },
  { id: '12', name: 'Technology', slug: 'technology', icon: 'monitor', description: 'IT support, computer repair, web designers, phone repair', sort_order: 12 },
];

export const demoProviders = [
  {
    id: 'p1', name: 'Dr. Priya Sharma', category_id: '1',
    categories: { name: 'Doctors & Medical', slug: 'doctors', icon: 'stethoscope' },
    phone: '(732) 555-0101', email: 'dr.sharma@pediatrics.com', website: 'https://sharmamd.com',
    address: '123 Main St', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Board-certified pediatrician with 15 years of experience. Known for patient and thorough care. Accepts most major insurance plans.',
    insurance_accepted: ['Aetna', 'BlueCross BlueShield', 'UnitedHealth', 'Cigna'],
    services: ['Well-child visits', 'Vaccinations', 'Sick visits', 'Sports physicals'],
    avg_rating: 4.8, review_count: 24, is_verified: true,
    reviews: [
      { id: 'r1', rating: 5, title: 'Best pediatrician!', body: 'Dr. Sharma is amazing with kids. Very patient and explains everything clearly.', created_at: '2025-06-15', profiles: { full_name: 'Anita Patel', avatar_url: null } },
      { id: 'r2', rating: 5, title: 'Highly recommend', body: 'We switched from another doctor and the difference is night and day. Very thorough.', created_at: '2025-05-20', profiles: { full_name: 'Raj Kumar', avatar_url: null } },
      { id: 'r3', rating: 4, title: 'Great doctor, long wait', body: 'Excellent care but appointments often run 20-30 minutes late.', created_at: '2025-04-10', profiles: { full_name: 'Sarah Johnson', avatar_url: null } },
    ]
  },
  {
    id: 'p2', name: 'Dr. Michael Chen - Eye Care', category_id: '1',
    categories: { name: 'Doctors & Medical', slug: 'doctors', icon: 'stethoscope' },
    phone: '(732) 555-0202', email: 'info@cheneye.com',
    address: '456 Oak Ave', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Comprehensive eye exams, glasses, contacts. Specializes in pediatric ophthalmology.',
    insurance_accepted: ['VSP', 'EyeMed', 'Aetna Vision'],
    services: ['Eye exams', 'Glasses', 'Contact lenses', 'Pediatric eye care'],
    avg_rating: 4.6, review_count: 18, is_verified: true, reviews: []
  },
  {
    id: 'p3', name: 'Mike\'s Handyman Services', category_id: '2',
    categories: { name: 'Home Services', slug: 'home-services', icon: 'wrench' },
    phone: '(732) 555-0303',
    address: '', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Reliable handyman for all home repairs. Painting, drywall, fixtures, furniture assembly, and more. Always on time and fair pricing.',
    services: ['Painting', 'Drywall repair', 'Fixture installation', 'Furniture assembly', 'Deck repair'],
    avg_rating: 4.9, review_count: 32, is_verified: false, reviews: []
  },
  {
    id: 'p4', name: 'Patel Brothers Grocery', category_id: '6',
    categories: { name: 'Restaurants & Food', slug: 'food', icon: 'utensils' },
    phone: '(732) 555-0404', website: 'https://patelbros.com',
    address: '789 Route 33', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Largest Indian grocery store in the area. Fresh vegetables, spices, snacks, frozen foods, and ready-to-eat meals.',
    services: ['Indian groceries', 'Fresh produce', 'Spices', 'Frozen foods', 'Snacks'],
    avg_rating: 4.5, review_count: 45, is_verified: true, reviews: []
  },
  {
    id: 'p5', name: 'Kumar Tax & Accounting', category_id: '7',
    categories: { name: 'Legal & Financial', slug: 'legal', icon: 'scale' },
    phone: '(732) 555-0505', email: 'kumar@taxcpa.com',
    address: '321 Business Pkwy', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'CPA specializing in individual and small business tax preparation. Expert in H1B/OPT tax situations.',
    services: ['Tax preparation', 'Business filing', 'H1B/OPT tax', 'Bookkeeping', 'IRS audit support'],
    avg_rating: 4.7, review_count: 19, is_verified: true, reviews: []
  },
  {
    id: 'p6', name: 'Hawaiian Breeze HVAC', category_id: '2',
    categories: { name: 'Home Services', slug: 'home-services', icon: 'wrench' },
    phone: '(732) 555-0606',
    city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'AC repair, heating installation, and maintenance. Fast response times, especially during summer emergencies.',
    services: ['AC repair', 'Heating installation', 'Maintenance plans', 'Duct cleaning'],
    avg_rating: 4.4, review_count: 15, is_verified: false, reviews: []
  },
  {
    id: 'p7', name: 'Bright Minds Tutoring', category_id: '4',
    categories: { name: 'Education & Tutoring', slug: 'education', icon: 'graduation-cap' },
    phone: '(732) 555-0707', website: 'https://brightmindstutoring.com',
    address: '555 School Rd', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Math, science, and SAT/ACT prep for K-12. Small group and 1-on-1 sessions. Great results — average 150-point SAT improvement.',
    services: ['Math tutoring', 'Science tutoring', 'SAT prep', 'ACT prep', 'AP exam prep'],
    avg_rating: 4.8, review_count: 28, is_verified: true, reviews: []
  },
  {
    id: 'p8', name: 'Little Stars Daycare', category_id: '5',
    categories: { name: 'Childcare', slug: 'childcare', icon: 'baby' },
    phone: '(732) 555-0808',
    address: '100 Park Ave', city: 'Monroe Township', state: 'NJ', zip_code: '08831',
    description: 'Licensed daycare for ages 6 weeks to 5 years. Structured curriculum, outdoor play area, and nutritious meals included.',
    services: ['Infant care', 'Toddler program', 'Pre-K', 'After-school care', 'Summer camp'],
    avg_rating: 4.6, review_count: 21, is_verified: true, reviews: []
  },
];

export const demoApi = {
  getCategories: () => Promise.resolve(demoCategories),
  getCategory: (slug) => Promise.resolve(demoCategories.find((c) => c.slug === slug) || null),
  getProviders: (params) => {
    let filtered = [...demoProviders];
    if (params.category) filtered = filtered.filter((p) => p.categories.slug === params.category);
    if (params.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.services || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (params.city) filtered = filtered.filter((p) => (p.city || '').toLowerCase().includes(params.city.toLowerCase()));
    if (params.zip) filtered = filtered.filter((p) => p.zip_code === params.zip);
    if (params.sort === 'reviews') filtered.sort((a, b) => b.review_count - a.review_count);
    else if (params.sort === 'newest') filtered.reverse();
    else filtered.sort((a, b) => b.avg_rating - a.avg_rating);
    return Promise.resolve({ providers: filtered, total: filtered.length, page: 1, limit: 20 });
  },
  getProvider: (id) => Promise.resolve(demoProviders.find((p) => p.id === id) || null),
  createProvider: () => Promise.reject(new Error('Sign in required — connect Supabase to enable this feature')),
  getReviews: (providerId) => {
    const provider = demoProviders.find((p) => p.id === providerId);
    return Promise.resolve(provider?.reviews || []);
  },
  createReview: () => Promise.reject(new Error('Sign in required — connect Supabase to enable this feature')),
  getFavorites: () => Promise.resolve([]),
  addFavorite: () => Promise.reject(new Error('Sign in required — connect Supabase to enable this feature')),
  removeFavorite: () => Promise.reject(new Error('Sign in required — connect Supabase to enable this feature')),
  validateInvite: (code) => {
    if (code.toUpperCase() === 'DEMO1234') {
      return Promise.resolve({ valid: true, community: { name: 'Monroe Township Community', city: 'Monroe Township', state: 'NJ' } });
    }
    return Promise.resolve({ valid: false });
  },
  joinCommunity: () => Promise.reject(new Error('Connect Supabase to enable this feature')),
  createCommunity: () => Promise.reject(new Error('Connect Supabase to enable this feature')),
  getMyCommunities: () => Promise.resolve([]),
  generateInvite: () => Promise.reject(new Error('Connect Supabase to enable this feature')),
  parseMessage: (message) => {
    return Promise.resolve({
      providers: [{
        name: 'Demo Parsed Provider',
        category: 'Doctors & Medical',
        phone: '(732) 555-9999',
        description: 'This is a demo of AI parsing. Connect your Anthropic API key for real parsing.',
        city: 'Monroe Township',
        state: 'NJ',
        services: ['General practice'],
        confidence: 'medium'
      }]
    });
  },
  parseChatExport: () => Promise.reject(new Error('Connect Supabase and Anthropic API to enable chat export parsing')),
};
