
import { useState, useEffect } from 'react';
import Layout from '../../components/feature/Layout';

interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  companyName?: string;
  entity?: string;
  mobileNumber?: string;
  location?: string;
  qrCode?: string;
  createdBy: string;
  createdDate: string;
}

interface SupportStaff {
  id: string;
  staffId: string;
  name: string;
  designation?: string;
  companyName?: string;
  biometricData?: string;
  createdBy: string;
  createdDate: string;
}

interface PriceMaster {
  employee: {
    breakfast: number;
    lunch: number;
  };
  company: {
    breakfast: number;
    lunch: number;
  };
}

export default function Master() {
  const [activeTab, setActiveTab] = useState<'employee' | 'supportStaff' | 'price'>('employee');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingSupportStaff, setEditingSupportStaff] = useState<SupportStaff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [priceMaster, setPriceMaster] = useState<PriceMaster>({
    employee: { breakfast: 20, lunch: 48 },
    company: { breakfast: 135, lunch: 165 }
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'employee' | 'supportStaff' | 'billing'>('employee');

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    companyName: '',
    entity: '',
    mobileNumber: '',
    location: '',
    qrCode: ''
  });

  const [supportStaffFormData, setSupportStaffFormData] = useState({
    staffId: '',
    name: '',
    designation: '',
    companyName: '',
    biometricData: ''
  });

  const [companyNames, setCompanyNames] = useState<string[]>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem('employees');
    if (savedEmployees) {
      const employeeData = JSON.parse(savedEmployees);
      setEmployees(employeeData);
      const uniqueCompanies = [
        ...new Set(
          employeeData
            .map((emp: Employee) => emp.companyName)
            .filter((company: string | undefined) => !!company && company.trim() !== '')
        )
      ];
      setCompanyNames(uniqueCompanies);
    }

    const savedSupportStaff = localStorage.getItem('supportStaff');
    if (savedSupportStaff) {
      setSupportStaff(JSON.parse(savedSupportStaff));
    }

    const savedPriceMaster = localStorage.getItem('priceMaster');
    if (savedPriceMaster) {
      setPriceMaster(JSON.parse(savedPriceMaster));
    }
  }, []);

  // Update company names when employees change
  useEffect(() => {
    const uniqueCompanies = [
      ...new Set(
        employees
          .map((emp) => emp.companyName)
          .filter((company) => !!company && company.trim() !== '')
      )
    ];
    setCompanyNames(uniqueCompanies);
  }, [employees]);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('supportStaff', JSON.stringify(supportStaff));
  }, [supportStaff]);

  useEffect(() => {
    localStorage.setItem('priceMaster', JSON.stringify(priceMaster));
  }, [priceMaster]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSupportStaffInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSupportStaffFormData({
      ...supportStaffFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (activeTab === 'employee') {
        setFormData({ ...formData, qrCode: event.target?.result as string });
      } else {
        setSupportStaffFormData({ ...supportStaffFormData, biometricData: event.target?.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'employee') {
      if (!formData.employeeId || !formData.employeeName) {
        alert('Employee ID and Employee Name are mandatory fields');
        return;
      }

      const newEmployee: Employee = {
        id: Date.now().toString(),
        ...formData,
        createdBy: 'Admin',
        createdDate: new Date().toISOString().split('T')[0]
      };

      setEmployees([...employees, newEmployee]);
      setFormData({
        employeeId: '',
        employeeName: '',
        companyName: '',
        entity: '',
        mobileNumber: '',
        location: '',
        qrCode: ''
      });
    } else {
      if (!supportStaffFormData.staffId || !supportStaffFormData.name) {
        alert('Staff ID and Name are mandatory fields');
        return;
      }

      const newSupportStaff: SupportStaff = {
        id: Date.now().toString(),
        ...supportStaffFormData,
        createdBy: 'Admin',
        createdDate: new Date().toISOString().split('T')[0]
      };

      setSupportStaff([...supportStaff, newSupportStaff]);
      setSupportStaffFormData({
        staffId: '',
        name: '',
        designation: '',
        companyName: '',
        biometricData: ''
      });
    }

    setShowAddForm(false);
  };

  const syncWithHRMS = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://contacts.dev.refex.group/api/employees/active', {
        method: 'GET',
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2OGIwOGY0LTVkZTEtNDgwZC05NjNiLWYzYzMyZTkxYzA2ZSIsImlhdCI6MTc1Njc5ODYxMX0.BgfFmWhKpo1Irdnf2orvI6yFJrppImLxspI1W5IDGGE',
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      let hrmsEmployees: any[] = [];

      if (Array.isArray(apiResponse)) {
        hrmsEmployees = apiResponse;
      } else if (apiResponse && apiResponse.results) {
        hrmsEmployees = apiResponse.results;
      } else {
        throw new Error('Invalid response format from HRMS API');
      }

      const supportStaffDesignations = ['Driver', 'Office Assistant'];
      const newEmployees: Employee[] = [];
      const newSupportStaff: SupportStaff[] = [];

      hrmsEmployees.forEach((emp, index) => {
        try {
          const designation = emp.designation || '';
          const isSupport = supportStaffDesignations.some((d) =>
            designation.toLowerCase().includes(d.toLowerCase())
          );

          if (isSupport) {
            const supportItem: SupportStaff = {
              id: emp.id || `hrms-support-${Date.now()}-${index}`,
              staffId: emp.employee_id || '',
              name: emp.employee_name || '',
              designation: emp.designation || '',
              companyName: emp.company?.company_name || '',
              biometricData: emp.qr_code_image || '',
              createdBy: 'HRMS Sync',
              createdDate: new Date().toISOString().split('T')[0]
            };
            newSupportStaff.push(supportItem);
          } else {
            const employeeItem: Employee = {
              id: emp.id || `hrms-${Date.now()}-${index}`,
              employeeId: emp.employee_id || '',
              employeeName: emp.employee_name || '',
              companyName: emp.company?.company_name || '',
              entity: emp.designation || '',
              mobileNumber: emp.mobile_number || '',
              location: emp.branch?.branch_name || '',
              qrCode: emp.qr_code_image || '',
              createdBy: 'HRMS Sync',
              createdDate: new Date().toISOString().split('T')[0]
            };
            newEmployees.push(employeeItem);
          }
        } catch (e) {
          console.warn(`Error mapping HRMS record at index ${index}:`, e);
        }
      });

      const existingEmployeeIds = employees.map((e) => e.employeeId);
      const existingSupportIds = supportStaff.map((s) => s.staffId);

      const uniqueEmployees = newEmployees.filter(
        (e) => e.employeeId && !existingEmployeeIds.includes(e.employeeId)
      );
      const uniqueSupport = newSupportStaff.filter(
        (s) => s.staffId && !existingSupportIds.includes(s.staffId)
      );

      if (uniqueEmployees.length || uniqueSupport.length) {
        setEmployees([...employees, ...uniqueEmployees]);
        setSupportStaff([...supportStaff, ...uniqueSupport]);
        alert(
          `✅ HRMS sync completed.\nNew Employees: ${uniqueEmployees.length}\nNew Support Staff: ${uniqueSupport.length}`
        );
      } else {
        alert('ℹ️ HRMS sync completed – no new records to add.');
      }
    } catch (error: any) {
      console.error('HRMS sync error:', error);
      let message = 'Failed to sync with HRMS.';
      if (error.message.includes('Network')) {
        message +=
          '\nNetwork issue or CORS restriction. Please ensure the API allows requests from this origin.';
      } else {
        message += `\n${error.message}`;
      }
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Employee | SupportStaff) => {
    if (activeTab === 'employee') {
      const employee = item as Employee;
      setEditingEmployee(employee);
      setFormData({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        companyName: employee.companyName || '',
        entity: employee.entity || '',
        mobileNumber: employee.mobileNumber || '',
        location: employee.location || '',
        qrCode: employee.qrCode || ''
      });
    } else {
      const staff = item as SupportStaff;
      setEditingSupportStaff(staff);
      setSupportStaffFormData({
        staffId: staff.staffId,
        name: staff.name,
        designation: staff.designation || '',
        companyName: staff.companyName || '',
        biometricData: staff.biometricData || ''
      });
    }
    setShowEditForm(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'employee' && editingEmployee) {
      if (!formData.employeeId || !formData.employeeName) {
        alert('Employee ID and Employee Name are mandatory fields');
        return;
      }

      const updated: Employee = {
        ...editingEmployee,
        ...formData,
        createdBy: editingEmployee.createdBy,
        createdDate: editingEmployee.createdDate
      };

      setEmployees(employees.map((e) => (e.id === editingEmployee.id ? updated : e)));
      setEditingEmployee(null);
    } else if (activeTab === 'supportStaff' && editingSupportStaff) {
      if (!supportStaffFormData.staffId || !supportStaffFormData.name) {
        alert('Staff ID and Name are mandatory fields');
        return;
      }

      const updated: SupportStaff = {
        ...editingSupportStaff,
        ...supportStaffFormData,
        createdBy: editingSupportStaff.createdBy,
        createdDate: editingSupportStaff.createdDate
      };

      setSupportStaff(supportStaff.map((s) => (s.id === editingSupportStaff.id ? updated : s)));
      setEditingSupportStaff(null);
    }

    setShowEditForm(false);
    setFormData({
      employeeId: '',
      employeeName: '',
      companyName: '',
      entity: '',
      mobileNumber: '',
      location: '',
      qrCode: ''
    });
    setSupportStaffFormData({
      staffId: '',
      name: '',
      designation: '',
      companyName: '',
      biometricData: ''
    });
  };

  const handleDelete = (item: Employee | SupportStaff) => {
    if (activeTab === 'employee') {
      const employee = item as Employee;
      if (confirm(`Delete employee "${employee.employeeName}"?`)) {
        setEmployees(employees.filter((e) => e.id !== employee.id));
      }
    } else {
      const staff = item as SupportStaff;
      if (confirm(`Delete support staff "${staff.name}"?`)) {
        setSupportStaff(supportStaff.filter((s) => s.id !== staff.id));
      }
    }
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setEditingSupportStaff(null);
    setShowEditForm(false);
    setFormData({
      employeeId: '',
      employeeName: '',
      companyName: '',
      entity: '',
      mobileNumber: '',
      location: '',
      qrCode: ''
    });
    setSupportStaffFormData({
      staffId: '',
      name: '',
      designation: '',
      companyName: '',
      biometricData: ''
    });
  };

  const handlePriceMasterChange = (
    type: 'employee' | 'company',
    meal: 'breakfast' | 'lunch',
    value: number
  ) => {
    setPriceMaster((prev) => ({
      ...prev,
      [type]: { ...prev[type], [meal]: value }
    }));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());

        if (importType === 'employee') {
          const newEmployees: Employee[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            if (values.length >= 2 && values[0] && values[1]) {
              newEmployees.push({
                id: Date.now().toString() + i,
                employeeId: values[0],
                employeeName: values[1],
                companyName: values[2] || '',
                entity: values[3] || '',
                mobileNumber: values[4] || '',
                location: values[5] || '',
                qrCode: values[6] || '',
                createdBy: 'Import',
                createdDate: new Date().toISOString().split('T')[0]
              });
            }
          }
          const existingIds = employees.map((e) => e.employeeId);
          const unique = newEmployees.filter((e) => !existingIds.includes(e.employeeId));
          if (unique.length) {
            setEmployees([...employees, ...unique]);
            alert(`Imported ${unique.length} new employees`);
          } else {
            alert('No new employee records to import');
          }
        } else if (importType === 'supportStaff') {
          const newStaff: SupportStaff[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            if (values.length >= 2 && values[0] && values[1]) {
              newStaff.push({
                id: Date.now().toString() + i,
                staffId: values[0],
                name: values[1],
                designation: values[2] || '',
                companyName: values[3] || '',
                biometricData: values[4] || '',
                createdBy: 'Import',
                createdDate: new Date().toISOString().split('T')[0]
              });
            }
          }
          const existingIds = supportStaff.map((s) => s.staffId);
          const unique = newStaff.filter((s) => !existingIds.includes(s.staffId));
          if (unique.length) {
            setSupportStaff([...supportStaff, ...unique]);
            alert(`Imported ${unique.length} new support staff`);
          } else {
            alert('No new support staff records to import');
          }
        } else if (importType === 'billing') {
          const newBills: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            if (values.length >= 10) {
              newBills.push({
                id: Date.now().toString() + i,
                date: values[0],
                time: values[1],
                isGuest: values[2].toLowerCase() === 'true',
                isSupportStaff: values[3].toLowerCase() === 'true',
                customer: {
                  employeeId: values[4],
                  employeeName: values[5],
                  companyName: values[6] || ''
                },
                items: [
                  {
                    id: '1',
                    name: 'Breakfast',
                    quantity: parseInt(values[7]) || 0,
                    price: 0,
                    category: 'Breakfast'
                  },
                  {
                    id: '2',
                    name: 'Lunch',
                    quantity: parseInt(values[8]) || 0,
                    price: 0,
                    category: 'Lunch'
                  }
                ].filter((it) => it.quantity > 0),
                totalItems:
                  (parseInt(values[7]) || 0) + (parseInt(values[8]) || 0),
                totalAmount: parseFloat(values[9]) || 0
              });
            }
          }
          if (newBills.length) {
            const existingBills = JSON.parse(localStorage.getItem('billingHistory') || '[]');
            localStorage.setItem('billingHistory', JSON.stringify([...existingBills, ...newBills]));
            alert(`Imported ${newBills.length} billing records`);
          }
        }

        setShowImportModal(false);
      } catch (err) {
        console.error('Import error:', err);
        alert('Error importing file. Please verify format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Master Data</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors whitespace-nowrap flex items-center"
            >
              <i className="ri-upload-line mr-2"></i>
              Import Data
            </button>
            {activeTab !== 'price' && (
              <button
                onClick={syncWithHRMS}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap flex items-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line mr-2 animate-spin"></i>
                    Syncing...
                  </>
                ) : (
                  <>
                    <i className="ri-refresh-line mr-2"></i>
                    Sync HRMS
                  </>
                )}
              </button>
            )}
            {activeTab !== 'price' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center"
              >
                <i className="ri-add-line mr-2"></i>
                Add {activeTab === 'employee' ? 'Employee' : 'Support Staff'}
              </button>
            )}
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Import Data</h2>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Type
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee Data</option>
                  <option value="supportStaff">Support Staff Data</option>
                  <option value="billing">Billing History</option>
                </select>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    {importType === 'employee' &&
                      'CSV Format: Employee ID, Employee Name, Company Name, Entity, Mobile Number, Location, QR Code'}
                    {importType === 'supportStaff' &&
                      'CSV Format: Staff ID, Name, Designation, Company Name, Biometric Data'}
                    {importType === 'billing' &&
                      'CSV Format: Date, Time, Is Guest, Is Support Staff, Employee ID, Employee Name, Company Name, Breakfast Count, Lunch Count, Total Amount'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('employee')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'employee'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-user-line mr-2"></i>
                Employee Master
              </button>
              <button
                onClick={() => setActiveTab('supportStaff')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'supportStaff'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-tools-line mr-2"></i>
                Support Staff Master
              </button>
              <button
                onClick={() => setActiveTab('price')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'price'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-money-rupee-circle-line mr-2"></i>
                Price Master
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'price' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Price Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Pricing */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <i className="ri-user-line mr-2"></i>
                    Employee Pricing
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Breakfast Price (₹)
                      </label>
                      <input
                        type="number"
                        value={priceMaster.employee.breakfast}
                        onChange={(e) =>
                          handlePriceMasterChange('employee', 'breakfast', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lunch Price (₹)
                      </label>
                      <input
                        type="number"
                        value={priceMaster.employee.lunch}
                        onChange={(e) =>
                          handlePriceMasterChange('employee', 'lunch', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Company/Guest Pricing */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <i className="ri-building-line mr-2"></i>
                    Company/Guest Pricing
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Breakfast Price (₹)
                      </label>
                      <input
                        type="number"
                        value={priceMaster.company.breakfast}
                        onChange={(e) =>
                          handlePriceMasterChange('company', 'breakfast', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lunch Price (₹)
                      </label>
                      <input
                        type="number"
                        value={priceMaster.company.lunch}
                        onChange={(e) =>
                          handlePriceMasterChange('company', 'lunch', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="ri-information-line text-yellow-600 text-xl mr-3 mt-0.5"></i>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-2">Price Master Information</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Employee pricing applies to regular employees and support staff</li>
                      <li>• Company pricing applies to guests and external visitors</li>
                      <li>• Price changes will automatically apply to new billing transactions</li>
                      <li>• Historical billing data will maintain original pricing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Add / Edit Modal */}
              {(showAddForm || showEditForm) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-800">
                        {showEditForm ? 'Edit' : 'Add New'}{' '}
                        {activeTab === 'employee' ? 'Employee' : 'Support Staff'}
                      </h2>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setShowEditForm(false);
                          cancelEdit();
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>

                    <form onSubmit={showEditForm ? handleUpdate : handleSubmit} className="p-6 space-y-4">
                      {activeTab === 'employee' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employee ID *
                              </label>
                              <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employee Name *
                              </label>
                              <input
                                type="text"
                                name="employeeName"
                                value={formData.employeeName}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Name
                              </label>
                              <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Entity
                              </label>
                              <input
                                type="text"
                                name="entity"
                                value={formData.entity}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mobile Number
                              </label>
                              <input
                                type="tel"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location
                              </label>
                              <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          {/* QR Code Upload */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              QR Code Image
                            </label>
                            <div className="flex items-center space-x-4">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {formData.qrCode && (
                                <div className="w-16 h-16 border border-gray-300 rounded-lg overflow-hidden">
                                  <img src={formData.qrCode} alt="QR Preview" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Staff ID *
                              </label>
                              <input
                                type="text"
                                name="staffId"
                                value={supportStaffFormData.staffId}
                                onChange={handleSupportStaffInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name *
                              </label>
                              <input
                                type="text"
                                name="name"
                                value={supportStaffFormData.name}
                                onChange={handleSupportStaffInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Designation
                              </label>
                              <select
                                name="designation"
                                value={supportStaffFormData.designation}
                                onChange={handleSupportStaffInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="">Select designation...</option>
                                <option value="Driver">Driver</option>
                                <option value="Office Assistant">Office Assistant</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Name
                              </label>
                              {companyNames.length > 0 ? (
                                <select
                                  name="companyName"
                                  value={supportStaffFormData.companyName}
                                  onChange={handleSupportStaffInputChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value="">Select company...</option>
                                  {companyNames.map((c, i) => (
                                    <option key={i} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  name="companyName"
                                  value={supportStaffFormData.companyName}
                                  onChange={handleSupportStaffInputChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                              )}
                            </div>
                          </div>

                          {/* Biometric Data Upload */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Biometric Data / QR Code
                            </label>
                            <div className="flex items-center space-x-4">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              {supportStaffFormData.biometricData && (
                                <div className="w-16 h-16 border border-gray-300 rounded-lg overflow-hidden">
                                  <img src={supportStaffFormData.biometricData} alt="Biometric Preview" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <i className="ri-information-line mr-1"></i>
                          {activeTab === 'employee'
                            ? 'Only Employee ID and Employee Name are mandatory.'
                            : 'Only Staff ID and Name are mandatory.'}
                        </p>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setShowEditForm(false);
                            cancelEdit();
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={`px-4 py-2 text-white rounded-lg ${
                            showEditForm
                              ? 'bg-green-600 hover:bg-green-700'
                              : activeTab === 'employee'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {showEditForm ? 'Update' : 'Add'}{' '}
                          {activeTab === 'employee' ? 'Employee' : 'Support Staff'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {activeTab === 'employee' ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            QR Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee ID *
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee Name *
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mobile Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Biometric Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Staff ID *
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name *
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Designation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeTab === 'employee' ? (
                      employees.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                            No employees found. Add employees manually or sync with HRMS.
                          </td>
                        </tr>
                      ) : (
                        employees.map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {employee.qrCode ? (
                                <div className="w-12 h-12 border border-gray-300 rounded-lg overflow-hidden">
                                  <img src={employee.qrCode} alt="QR Code" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                                  <i className="ri-qr-code-line text-gray-400"></i>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {employee.employeeId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.employeeName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.companyName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.entity || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.mobileNumber || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.location || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.createdBy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.createdDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(employee)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit Employee"
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(employee)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete Employee"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    ) : supportStaff.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No support staff found. Add support staff manually or sync with HRMS.
                        </td>
                      </tr>
                    ) : (
                      supportStaff.map((staff) => (
                        <tr key={staff.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {staff.biometricData ? (
                              <div className="w-12 h-12 border border-gray-300 rounded-lg overflow-hidden">
                                <img src={staff.biometricData} alt="Biometric" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-purple-100 border border-purple-300 rounded-lg flex items-center justify-center">
                                <i className="ri-fingerprint-line text-purple-400"></i>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {staff.staffId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.designation || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.companyName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.createdBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.createdDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(staff)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="Edit Support Staff"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(staff)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete Support Staff"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
