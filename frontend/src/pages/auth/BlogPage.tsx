import React from 'react';

// --- SVGs for Icons ---
const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);

const BlogPage: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto pb-12  max-h-[95vh] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-4">SPECTROPY BLOG</h2>
        <p className="text-xl text-slate-600">Latest Updates, News & Insights</p>
        <div className="mt-4 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

        {/* Blog Post 1 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <div className="text-6xl text-white">🚀</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-blue-600 font-bold mb-2">January 3, 2026</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">New AI Diagnostics Feature Launched</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              We've integrated advanced AI diagnostics to provide real-time student performance analytics, helping teachers identify learning gaps instantly.
            </p>
            <button className="text-blue-600 font-bold hover:text-blue-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Blog Post 2 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <div className="text-6xl text-white">📚</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-green-600 font-bold mb-2">December 15, 2025</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-green-700 transition-colors">Expanded Olympiad Training Program</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Our Olympiad training now covers NSO, IMO, NTSE, NSEJS, and IAPT with specialized coaching and practice materials.
            </p>
            <button className="text-green-600 font-bold hover:text-green-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Blog Post 3 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <div className="text-6xl text-white">👨‍🏫</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-purple-600 font-bold mb-2">November 28, 2025</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-purple-700 transition-colors">Teacher Training Workshops Completed</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Successfully conducted training sessions for 500+ teachers across partner schools, focusing on digital teaching tools and assessment techniques.
            </p>
            <button className="text-purple-600 font-bold hover:text-purple-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Blog Post 4 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <div className="text-6xl text-white">🏆</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-orange-600 font-bold mb-2">October 10, 2025</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-orange-700 transition-colors">Student Success Stories</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Celebrating our students' achievements in various competitive exams. 85% of our students scored above 90% in their board exams.
            </p>
            <button className="text-orange-600 font-bold hover:text-orange-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Blog Post 5 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
            <div className="text-6xl text-white">🔬</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-red-600 font-bold mb-2">September 5, 2025</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-red-700 transition-colors">STEM Lab Expansion</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Launched advanced STEM labs in 20+ schools with hands-on experiments in Physics, Chemistry, and Biology.
            </p>
            <button className="text-red-600 font-bold hover:text-red-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Blog Post 6 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
          <div className="h-48 bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <div className="text-6xl text-white">📊</div>
          </div>
          <div className="p-6">
            <div className="text-sm text-teal-600 font-bold mb-2">August 20, 2025</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-700 transition-colors">Results & Analytics Dashboard Update</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Enhanced our RA Portal with advanced analytics, predictive insights, and personalized learning recommendations.
            </p>
            <button className="text-teal-600 font-bold hover:text-teal-800 transition-colors flex items-center">
              Read More <ArrowRightIcon />
            </button>
          </div>
        </div>

      </div>

      {/* Newsletter Signup */}
      <div className="mt-16 bg-slate-50 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">Stay Updated</h3>
        <p className="text-slate-600 mb-6">Subscribe to our newsletter for the latest news and updates</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;