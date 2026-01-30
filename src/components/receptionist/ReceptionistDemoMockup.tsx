import React, { useState } from 'react';

const ReceptionistDemoMockup: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'prescription' | 'billing' | 'registration'>('dashboard');
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState('');
  const [advice, setAdvice] = useState('');

  // Mock data
  const mockPatients = [
    { id: 'PAT001', name: 'Rajesh Kumar', contact: '9876543210', age: 45, gender: 'Male' },
    { id: 'PAT002', name: 'Priya Sharma', contact: '9876543211', age: 32, gender: 'Female' },
    { id: 'PAT003', name: 'Amit Patel', contact: '9876543212', age: 28, gender: 'Male' }
  ];

  const mockDoctors = [
    { id: 'DOC001', name: 'Dr. Sunita Reddy', specialization: 'General Physician' },
    { id: 'DOC002', name: 'Dr. Ramesh Gupta', specialization: 'Orthopedics' },
    { id: 'DOC003', name: 'Dr. Anjali Mehta', specialization: 'Pediatrics' }
  ];

  const filteredPatients = mockPatients.filter(p => 
    p.contact.includes(patientSearch) || 
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredDoctors = mockDoctors.filter(d => 
    d.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.contact);
  };

  const handleDoctorSelect = (doctor: any) => {
    setSelectedDoctor(doctor);
    setDoctorSearch(doctor.name);
  };

  const handleGeneratePrescription = () => {
    if (selectedPatient && selectedDoctor) {
      setShowPrintPreview(true);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 font-medium">Total Visits</p>
              <p className="text-2xl font-bold mt-1">24</p>
              <p className="text-[10px] opacity-75 mt-1">App+Walk-ins</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 font-medium">Appointments</p>
              <p className="text-2xl font-bold mt-1">18</p>
              <p className="text-[10px] opacity-75 mt-1">Scheduled</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 font-medium">Walk-ins</p>
              <p className="text-2xl font-bold mt-1">6</p>
              <p className="text-[10px] opacity-75 mt-1">No Appointments</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 font-medium">Pending</p>
              <p className="text-2xl font-bold mt-1">5</p>
              <p className="text-[10px] opacity-75 mt-1">To be seen</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 font-medium">Completed</p>
              <p className="text-2xl font-bold mt-1">19</p>
              <p className="text-[10px] opacity-75 mt-1">Consultations</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
        <div className="space-y-3">
          {[
            { time: '09:30 AM', patient: 'Rajesh Kumar', doctor: 'Dr. Sunita Reddy', status: 'confirmed' },
            { time: '10:15 AM', patient: 'Priya Sharma', doctor: 'Dr. Ramesh Gupta', status: 'confirmed' },
            { time: '11:00 AM', patient: 'Amit Patel', doctor: 'Dr. Anjali Mehta', status: 'pending' }
          ].map((apt, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-medium text-gray-900">{apt.time}</p>
                  <p className="text-sm text-gray-600">{apt.patient}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Dr. {apt.doctor}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrescriptionScreen = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-6">Generate Prescription</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Patient Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Contact</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter contact number"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              <button className="px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors">
                Search
              </button>
            </div>
            
            {patientSearch && filteredPatients.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                {filteredPatients.map(patient => (
                  <div 
                    key={patient.id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-xs text-gray-500">{patient.contact} • {patient.age}y/{patient.gender}</div>
                  </div>
                ))}
              </div>
            )}
            
            {selectedPatient && (
              <div className="mt-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="text-sm">
                  <span className="font-medium">Selected:</span> {selectedPatient.name} ({selectedPatient.patient_id})
                </div>
              </div>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
            <input
              type="text"
              placeholder="Search doctor by name"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
            />
            
            {doctorSearch && filteredDoctors.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                {filteredDoctors.map(doctor => (
                  <div 
                    key={doctor.id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <div className="font-medium">{doctor.name}</div>
                    <div className="text-xs text-gray-500">{doctor.specialization}</div>
                  </div>
                ))}
              </div>
            )}
            
            {selectedDoctor && (
              <div className="mt-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="text-sm">
                  <span className="font-medium">Selected:</span> Dr. {selectedDoctor.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prescription Preview Header */}
        {selectedPatient && selectedDoctor && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Prescription Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Patient ID:</span>
                <div className="font-medium">{selectedPatient.id}</div>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <div className="font-medium">{selectedPatient.name}</div>
              </div>
              <div>
                <span className="text-gray-500">Contact:</span>
                <div className="font-medium">{selectedPatient.contact}</div>
              </div>
              <div>
                <span className="text-gray-500">Doctor:</span>
                <div className="font-medium">Dr. {selectedDoctor.name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Vitals Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Vitals</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">BP</label>
              <input
                type="text"
                placeholder="e.g., 120/80"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                value={bp}
                onChange={(e) => setBp(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
              <input
                type="text"
                placeholder="e.g., 70"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Extra Field 1</label>
              <input
                type="text"
                placeholder="Temperature"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Extra Field 2</label>
              <input
                type="text"
                placeholder="Pulse"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Diagnosis, Medicines, Advice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
            <textarea
              placeholder="Enter diagnosis..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 h-32 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medicines</label>
            <textarea
              placeholder="Enter medicines..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 h-32 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Advice</label>
            <textarea
              placeholder="Enter advice..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 h-32 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
            disabled={!selectedPatient || !selectedDoctor}
            onClick={handleGeneratePrescription}
          >
            Generate & Print
          </button>
          <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );

  const renderBillingScreen = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-6">Clinic Billing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Contact</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter contact number"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button className="px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors">
                Search
              </button>
            </div>
            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-600">Patient: Rajesh Kumar (PAT001)</div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
            <select className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
              <option>Select Doctor</option>
              <option>Dr. Sunita Reddy</option>
              <option>Dr. Ramesh Gupta</option>
              <option>Dr. Anjali Mehta</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Services</h3>
            <div className="space-y-2">
              {['Consultation Fee', 'X-Ray', 'Blood Test', 'ECG'].map((service, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span className="text-sm">{service}</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm" 
                      defaultValue="1"
                      min="1"
                    />
                    <span className="text-sm font-medium w-20 text-right">₹{[500, 800, 300, 400][idx]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Consultation Fee</span>
                <span>₹500</span>
              </div>
              <div className="flex justify-between">
                <span>X-Ray</span>
                <span>₹800</span>
              </div>
              <div className="flex justify-between">
                <span>Blood Test</span>
                <span>₹300</span>
              </div>
              <div className="flex justify-between">
                <span>ECG</span>
                <span>₹400</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>₹2000</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount %</span>
                <input 
                  type="number" 
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right" 
                  placeholder="0"
                />
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Net Amount</span>
                <span>₹2000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <select className="rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500">
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
          </select>
          <button className="px-6 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors">
            Generate Bill
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegistrationScreen = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-6">Patient Registration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              placeholder="Enter patient name"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <input
              type="number"
              placeholder="Enter age"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
              <option>Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <input
              type="tel"
              placeholder="Enter contact number"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              placeholder="Enter address"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-20"
            />
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button className="px-6 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors">
            Register Patient
          </button>
          <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
            Reset Form
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrintPreview = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-8">
          {/* Prescription Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-600 mb-2">ORTHONOVA POLYCLINIC</h1>
            <p className="text-gray-600">Multi-Specialty Clinic</p>
            <p className="text-sm text-gray-500">123 Medical Street, Health City - 560001</p>
            <p className="text-sm text-gray-500">Phone: +91 98765 43210 | Email: info@orthonova.com</p>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-4 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {selectedPatient?.name}</p>
                <p><span className="font-medium">ID:</span> {selectedPatient?.id}</p>
                <p><span className="font-medium">Age/Gender:</span> {selectedPatient?.age}y/{selectedPatient?.gender}</p>
                <p><span className="font-medium">Contact:</span> {selectedPatient?.contact}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Doctor Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> Dr. {selectedDoctor?.name}</p>
                <p><span className="font-medium">Specialization:</span> {selectedDoctor?.specialization}</p>
                <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-medium">Prescription ID:</span> RX-{Math.floor(Math.random() * 10000)}</p>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Vitals</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">BP</p>
                <p className="font-medium">{bp || '120/80'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Weight</p>
                <p className="font-medium">{weight || '70'} kg</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="font-medium">98.6°F</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Pulse</p>
                <p className="font-medium">72 bpm</p>
              </div>
            </div>
          </div>

          {/* Prescription Content */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Diagnosis</h3>
              <p className="text-gray-700">{diagnosis || 'Acute upper respiratory infection'}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Medicines</h3>
              <div className="space-y-2">
                {medicines ? medicines.split('\n').filter(line => line.trim()).map((med, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-teal-600 font-medium">•</span>
                    <span className="text-gray-700">{med}</span>
                  </div>
                )) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-600 font-medium">•</span>
                      <span className="text-gray-700">Paracetamol 500mg - 1 tablet thrice daily for 5 days</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-600 font-medium">•</span>
                      <span className="text-gray-700">Amoxicillin 500mg - 1 capsule twice daily for 7 days</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Advice</h3>
              <p className="text-gray-700">{advice || 'Take adequate rest, drink plenty of fluids, and follow up if symptoms persist.'}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleString()}</p>
                <p className="text-sm text-gray-500">Valid for: 7 days from issue date</p>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 w-48">
                  <p className="text-sm font-medium">Dr. {selectedDoctor?.name}</p>
                  <p className="text-xs text-gray-500">MBBS, MD</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => setShowPrintPreview(false)}
          >
            Close
          </button>
          <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
            Print Prescription
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm z-40">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-lg">
              O
            </div>
            <div>
              <h1 className="font-bold text-gray-900">ORTHONOVA</h1>
              <p className="text-xs text-gray-500">Receptionist Demo</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dashboard</div>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                activeScreen === 'dashboard' 
                  ? 'bg-teal-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveScreen('dashboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Today's Overview
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Patient Management</div>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                activeScreen === 'registration' 
                  ? 'bg-teal-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveScreen('registration')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Register Patient
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Prescription</div>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                activeScreen === 'prescription' 
                  ? 'bg-teal-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveScreen('prescription')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Prescription
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Billing</div>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                activeScreen === 'billing' 
                  ? 'bg-teal-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveScreen('billing')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Clinic Billing
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Appointments</div>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Patients
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Visit History
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {activeScreen === 'dashboard' && renderDashboard()}
          {activeScreen === 'prescription' && renderPrescriptionScreen()}
          {activeScreen === 'billing' && renderBillingScreen()}
          {activeScreen === 'registration' && renderRegistrationScreen()}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && renderPrintPreview()}
    </div>
  );
};

export default ReceptionistDemoMockup;