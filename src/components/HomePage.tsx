import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            OrthoNova Poly Clinic
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive healthcare management system with integrated pharmacy services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Clinic Management */}
          <div className="card p-8 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Clinic Management</h2>
              <p className="text-gray-600 mb-6">
                Access patient records, appointment scheduling, doctor management, and clinical billing.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary w-full"
              >
                Clinic Login
              </button>
              <div className="mt-4 text-sm text-gray-500">
                For Admins, Doctors, and Receptionists
              </div>
            </div>
          </div>

          {/* Pharmacy Management */}
          <div className="card p-8 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Pharmacy Management</h2>
              <p className="text-gray-600 mb-6">
                Manage medicine inventory, process prescriptions, and handle pharmaceutical billing.
              </p>
              <button
                onClick={() => navigate('/pharmacy/login')}
                className="btn btn-primary w-full bg-green-600 hover:bg-green-700"
              >
                Pharmacy Login
              </button>
              <div className="mt-4 text-sm text-gray-500">
                For Pharmacists and Store Managers
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-4 bg-white rounded-full px-6 py-3 shadow-sm">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">
              Select the appropriate system based on your role
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;