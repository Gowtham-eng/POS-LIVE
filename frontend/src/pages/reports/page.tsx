
import { useState, useEffect } from 'react';
import Layout from '../../components/feature/Layout';
import { reportsAPI } from '../../services/api';

interface BillingRecord {
  id: string;
  date: string;
  time: string;
  isGuest: boolean;
  isSupportStaff?: boolean;
  customer: any;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    isException?: boolean;
  }>;
  totalItems: number;
  totalAmount: number;
}

interface CompanyReport {
  companyName: string;
  totalEmployees: number;
  totalTransactions: number;
  breakfast: number;
  lunch: number;
  totalItems: number;
  totalAmount: number;
  employees: string[];
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('employee');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSupportStaff, setSelectedSupportStaff] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [supportStaffReportData, setSupportStaffReportData] = useState<any[]>([]);
  const [companyReportData, setCompanyReportData] = useState<CompanyReport[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [supportStaff, setSupportStaff] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBreakfast: 0,
    totalLunch: 0,
    totalAmount: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadReportData();
    loadEmployees();
    loadSupportStaff();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeeData = await reportsAPI.getEmployeeReport({});
      // Get unique employees from report data
      const uniqueEmployees = Array.from(
        new Set(employeeData.map((item: any) => JSON.stringify({ id: item.employeeId, name: item.employeeName })))
      ).map((item: any) => JSON.parse(item));
      setEmployees(uniqueEmployees);
      
      // Extract unique company names
      const uniqueCompanies = [...new Set(employeeData.map((item: any) => item.company).filter(Boolean))];
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadSupportStaff = async () => {
    try {
      const staffData = await reportsAPI.getSupportStaffReport({});
      // Get unique support staff from report data
      const uniqueStaff = Array.from(
        new Set(staffData.map((item: any) => JSON.stringify({ id: item.staffId, name: item.staffName })))
      ).map((item: any) => JSON.parse(item));
      setSupportStaff(uniqueStaff);
    } catch (error) {
      console.error('Error loading support staff:', error);
    }
  };

  const loadReportData = async () => {
    try {
      // Load employee report data
      const filters = {
        start_date: startDate,
        end_date: endDate,
        employee_id: selectedEmployee,
        company: selectedCompany
      };
      const employeeData = await reportsAPI.getEmployeeReport(filters);
      
      setReportData(employeeData);

      // Load support staff report data
      const staffFilters = {
        start_date: startDate,
        end_date: endDate,
        staff_id: selectedSupportStaff,
        company: selectedCompany
      };
      const supportStaffData = await reportsAPI.getSupportStaffReport(staffFilters);
      setSupportStaffReportData(supportStaffData);

      // Load company report data
      const companyFilters = {
        start_date: startDate,
        end_date: endDate,
        company: selectedCompany
      };
      const companyData = await reportsAPI.getCompanyReport(companyFilters);
      setCompanyReportData(companyData);
    } catch (error) {
      console.error('Error loading report data:', error);
    }
  };

  const updateSummaryStats = (tab: string, employeeData: any[], supportStaffData: any[], companyData: any[]) => {
    let totalBreakfast, totalLunch, totalAmount;
    
    if (tab === 'company') {
      // For company report: use company pricing and sum from company data
      totalBreakfast = companyData.reduce((sum, company) => sum + company.breakfast, 0);
      totalLunch = companyData.reduce((sum, company) => sum + company.lunch, 0);
      totalAmount = companyData.reduce((sum, company) => sum + company.totalAmount, 0);
    } else if (tab === 'supportStaff') {
      // For support staff report: use actual billing amounts
      totalBreakfast = supportStaffData.reduce((sum, record) => sum + record.breakfast, 0);
      totalLunch = supportStaffData.reduce((sum, record) => sum + record.lunch, 0);
      totalAmount = supportStaffData.reduce((sum, record) => sum + record.amount, 0);
    } else {
      // For employee report: use actual billing amounts
      totalBreakfast = employeeData.reduce((sum, record) => sum + record.breakfast, 0);
      totalLunch = employeeData.reduce((sum, record) => sum + record.lunch, 0);
      totalAmount = employeeData.reduce((sum, record) => sum + record.amount, 0);
    }

    setSummaryStats({
      totalBreakfast,
      totalLunch,
      totalAmount
    });
  };

  const handleGenerateReport = () => {
    let filteredEmployeeData = [...reportData];
    let filteredSupportStaffData = [...supportStaffReportData];
    let filteredCompanyData = [...companyReportData];

    // Filter by date range
    if (startDate || endDate) {
      const billingHistory = localStorage.getItem('billingHistory');
      if (billingHistory) {
        let bills: BillingRecord[] = JSON.parse(billingHistory);
        
        if (startDate) {
          bills = bills.filter(bill => bill.date >= startDate);
        }
        if (endDate) {
          bills = bills.filter(bill => bill.date <= endDate);
        }

        // Reprocess filtered employee data (INCLUDES employees AND guests, excludes support staff)
        const employeeData = bills
          .filter(bill => !bill.isSupportStaff) // Include employees and guests, exclude support staff
          .map(bill => {
            const breakfastItems = bill.items.filter(item => item.name === 'Breakfast').reduce((sum, item) => sum + item.quantity, 0);
            const lunchItems = bill.items.filter(item => item.name === 'Lunch').reduce((sum, item) => sum + item.quantity, 0);
            
            // Count exception items separately
            const breakfastExceptions = bill.items.filter(item => item.name === 'Breakfast' && item.isException).reduce((sum, item) => sum + item.quantity, 0);
            const lunchExceptions = bill.items.filter(item => item.name === 'Lunch' && item.isException).reduce((sum, item) => sum + item.quantity, 0);
            
            return {
              id: bill.id,
              employeeId: bill.isGuest ? 'GUEST' : (bill.customer?.employeeId || 'N/A'),
              employeeName: bill.isGuest ? (bill.customer?.name || 'Unknown Guest') : (bill.customer?.employeeName || 'Unknown'),
              company: bill.customer?.companyName || 'N/A',
              date: bill.date,
              time: bill.time,
              breakfast: breakfastItems,
              lunch: lunchItems,
              breakfastExceptions,
              lunchExceptions,
              totalItems: bill.totalItems,
              amount: bill.totalAmount,
              isGuest: bill.isGuest,
              hasExceptions: breakfastExceptions > 0 || lunchExceptions > 0
            };
          });

        filteredEmployeeData = employeeData;

        // Reprocess filtered support staff data (ONLY support staff)
        const supportStaffData = bills
          .filter(bill => !bill.isGuest && bill.isSupportStaff)
          .map(bill => {
            const breakfastItems = bill.items.filter(item => item.name === 'Breakfast').reduce((sum, item) => sum + item.quantity, 0);
            const lunchItems = bill.items.filter(item => item.name === 'Lunch').reduce((sum, item) => sum + item.quantity, 0);
            
            // Count exception items separately
            const breakfastExceptions = bill.items.filter(item => item.name === 'Breakfast' && item.isException).reduce((sum, item) => sum + item.quantity, 0);
            const lunchExceptions = bill.items.filter(item => item.name === 'Lunch' && item.isException).reduce((sum, item) => sum + item.quantity, 0);
            
            return {
              id: bill.id,
              staffId: bill.customer?.staffId || 'N/A',
              staffName: bill.customer?.name || 'Unknown',
              designation: bill.customer?.designation || 'N/A',
              company: bill.customer?.companyName || 'N/A',
              date: bill.date,
              time: bill.time,
              breakfast: breakfastItems,
              lunch: lunchItems,
              breakfastExceptions,
              lunchExceptions,
              totalItems: bill.totalItems,
              amount: bill.totalAmount,
              hasExceptions: breakfastExceptions > 0 || lunchExceptions > 0
            };
          });

        filteredSupportStaffData = supportStaffData;

        // Get current price master for company report calculations
        const savedPriceMaster = localStorage.getItem('priceMaster');
        const priceMaster = savedPriceMaster ? JSON.parse(savedPriceMaster) : {
          employee: { breakfast: 20, lunch: 48 },
          company: { breakfast: 135, lunch: 165 }
        };

        // Reprocess company data with COMPANY pricing
        const companyStats: { [key: string]: CompanyReport } = {};
        
        bills.forEach(bill => {
          const companyName = bill.isGuest 
            ? bill.customer?.companyName || 'Guest Company'
            : bill.customer?.companyName || 'Unknown Company';
          
          const breakfastItems = bill.items.filter(item => item.name === 'Breakfast').reduce((sum, item) => sum + item.quantity, 0);
          const lunchItems = bill.items.filter(item => item.name === 'Lunch').reduce((sum, item) => sum + item.quantity, 0);
          
          if (!companyStats[companyName]) {
            companyStats[companyName] = {
              companyName,
              totalEmployees: 0,
              totalTransactions: 0,
              breakfast: 0,
              lunch: 0,
              totalItems: 0,
              totalAmount: 0,
              employees: []
            };
          }

          companyStats[companyName].totalTransactions += 1;
          companyStats[companyName].breakfast += breakfastItems;
          companyStats[companyName].lunch += lunchItems;
          companyStats[companyName].totalItems += bill.totalItems;
          
          // Calculate amount using COMPANY pricing for company report
          const companyBreakfastAmount = breakfastItems * priceMaster.company.breakfast;
          const companyLunchAmount = lunchItems * priceMaster.company.lunch;
          companyStats[companyName].totalAmount += companyBreakfastAmount + companyLunchAmount;

          const employeeName = bill.isGuest ? bill.customer?.name || 'Guest' : bill.customer?.employeeName || bill.customer?.name || 'Unknown';
          if (!companyStats[companyName].employees.includes(employeeName)) {
            companyStats[companyName].employees.push(employeeName);
            companyStats[companyName].totalEmployees += 1;
          }
        });

        filteredCompanyData = Object.values(companyStats).sort((a, b) => b.totalAmount - a.totalAmount);
      }
    }

    // Filter by employee
    if (selectedEmployee) {
      filteredEmployeeData = filteredEmployeeData.filter(record => 
        record.employeeId === selectedEmployee || 
        record.employeeName.toLowerCase().includes(selectedEmployee.toLowerCase())
      );
    }

    // Filter by support staff
    if (selectedSupportStaff) {
      filteredSupportStaffData = filteredSupportStaffData.filter(record => 
        record.staffId === selectedSupportStaff || 
        record.staffName.toLowerCase().includes(selectedSupportStaff.toLowerCase())
      );
    }

    // Filter by company
    if (selectedCompany) {
      filteredEmployeeData = filteredEmployeeData.filter(record => record.company === selectedCompany);
      filteredSupportStaffData = filteredSupportStaffData.filter(record => record.company === selectedCompany);
      filteredCompanyData = filteredCompanyData.filter(company => company.companyName === selectedCompany);
    }

    // Update summary stats based on active tab
    updateSummaryStats(activeTab, filteredEmployeeData, filteredSupportStaffData, filteredCompanyData);

    setReportData(filteredEmployeeData);
    setSupportStaffReportData(filteredSupportStaffData);
    setCompanyReportData(filteredCompanyData);
  };

  const handleExportReport = () => {
    let dataToExport: any[];
    let headers: string[];
    let fileName: string;

    if (activeTab === 'employee') {
      dataToExport = reportData;
      headers = ['Employee ID', 'Employee Name', 'Company', 'Date', 'Time', 'Breakfast', 'Lunch', 'Breakfast Exceptions', 'Lunch Exceptions', 'Total Items', 'Amount'];
      fileName = 'employee-report';
    } else if (activeTab === 'supportStaff') {
      dataToExport = supportStaffReportData;
      headers = ['Staff ID', 'Staff Name', 'Designation', 'Company', 'Date', 'Time', 'Breakfast', 'Lunch', 'Breakfast Exceptions', 'Lunch Exceptions', 'Total Items', 'Amount'];
      fileName = 'support-staff-report';
    } else {
      dataToExport = companyReportData;
      headers = ['Company Name', 'Total Employees', 'Total Transactions', 'Breakfast', 'Lunch', 'Total Items', 'Total Amount'];
      fileName = 'company-report';
    }
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    let excelData: any[][];

    if (activeTab === 'employee') {
      excelData = [
        headers,
        ...reportData.map(record => [
          record.employeeId,
          record.employeeName,
          record.company,
          record.date,
          record.time,
          record.breakfast,
          record.lunch,
          record.breakfastExceptions || 0,
          record.lunchExceptions || 0,
          record.totalItems,
          `₹${record.amount}`
        ])
      ];
    } else if (activeTab === 'supportStaff') {
      excelData = [
        headers,
        ...supportStaffReportData.map(record => [
          record.staffId,
          record.staffName,
          record.designation,
          record.company,
          record.date,
          record.time,
          record.breakfast,
          record.lunch,
          record.breakfastExceptions || 0,
          record.lunchExceptions || 0,
          record.totalItems,
          `₹${record.amount}`
        ])
      ];
    } else {
      excelData = [
        headers,
        ...companyReportData.map(company => [
          company.companyName,
          company.totalEmployees,
          company.totalTransactions,
          company.breakfast,
          company.lunch,
          company.totalItems,
          `₹${company.totalAmount}`
        ])
      ];
    }

    // Create Excel workbook
    const worksheet = excelData.map(row => row.join('\t')).join('\n');
    
    // Create Excel file content with proper formatting
    const excelContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${activeTab === 'employee' ? 'Employee Report' : activeTab === 'supportStaff' ? 'Support Staff Report' : 'Company Report'}</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#E6E6FA" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${activeTab === 'employee' ? 'Employee Report' : activeTab === 'supportStaff' ? 'Support Staff Report' : 'Company Report'}">
  <Table>
   <Row ss:StyleID="Header">
    ${headers.map(header => `<Cell><Data ss:Type="String">${header}</Data></Cell>`).join('')}
   </Row>
   ${excelData.slice(1).map(row => 
     `<Row>${row.map((cell, index) => {
       const isNumeric = typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '');
       const cellValue = String(cell).replace(/₹/g, '');
       const dataType = isNumeric && !headers[index].toLowerCase().includes('id') && !headers[index].toLowerCase().includes('name') && !headers[index].toLowerCase().includes('company') && !headers[index].toLowerCase().includes('date') && !headers[index].toLowerCase().includes('time') && !headers[index].toLowerCase().includes('designation') ? 'Number' : 'String';
       return `<Cell><Data ss:Type="${dataType}">${dataType === 'Number' ? cellValue : cell}</Data></Cell>`;
     }).join('')}</Row>`
   ).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

    // Download Excel file
    const blob = new Blob([excelContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Add useEffect to update summary when tab changes
  useEffect(() => {
    updateSummaryStats(activeTab, reportData, supportStaffReportData, companyReportData);
  }, [activeTab, reportData, supportStaffReportData, companyReportData]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <button
            onClick={handleExportReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap flex items-center"
          >
            <i className="ri-download-line mr-2"></i>
            Export Report
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('employee')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'employee'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-user-line mr-2"></i>
                Employee Report
              </button>
              <button
                onClick={() => setActiveTab('supportStaff')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'supportStaff'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-tools-line mr-2"></i>
                Support Staff Report
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'company'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-building-line mr-2"></i>
                Company Report
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Filters</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              {activeTab === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.employeeId}>
                        {emp.employeeName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'supportStaff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Staff
                  </label>
                  <select
                    value={selectedSupportStaff}
                    onChange={(e) => setSelectedSupportStaff(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-8"
                  >
                    <option value="">All Support Staff</option>
                    {supportStaff.map((staff) => (
                      <option key={staff.id} value={staff.staffId}>
                        {staff.name} ({staff.staffId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleGenerateReport}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  <i className="ri-search-line mr-2"></i>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {activeTab === 'employee' ? (
          /* Employee Report Table */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Employee Report</h2>
              <p className="text-sm text-gray-600 mt-1">Detailed consumption report by employee and guests (excludes support staff only)</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakfast</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-5

00 uppercase tracking-wider">Exceptions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                        No employee or guest report data available. Generate reports after employee and guest billing transactions.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((record, index) => (
                      <tr key={record.id || index} className={`hover:bg-gray-50 ${record.isGuest ? 'bg-green-50' : ''} ${record.hasExceptions ? 'border-l-4 border-orange-400' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            {record.isGuest && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                <i className="ri-user-add-line mr-1"></i>
                                Guest
                              </span>
                            )}
                            {record.hasExceptions && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                <i className="ri-alert-line mr-1"></i>
                                Exception
                              </span>
                            )}
                            {record.employeeId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{record.breakfast}</span>
                            {record.breakfastExceptions > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                +{record.breakfastExceptions}E
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{record.lunch}</span>
                            {record.lunchExceptions > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                +{record.lunchExceptions}E
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.hasExceptions ? (
                            <div className="flex flex-col space-y-1">
                              {record.breakfastExceptions > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <i className="ri-restaurant-line mr-1"></i>
                                  B: {record.breakfastExceptions}
                                </span>
                              )}
                              {record.lunchExceptions > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <i className="ri-bowl-line mr-1"></i>
                                  L: {record.lunchExceptions}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.totalItems}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{record.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'supportStaff' ? (
          /* Support Staff Report Table */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Support Staff Report</h2>
              <p className="text-sm text-gray-600 mt-1">Detailed consumption report by support staff</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakfast</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exceptions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supportStaffReportData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                        No support staff report data available. Generate reports after support staff billing transactions.
                      </td>
                    </tr>
                  ) : (
                    supportStaffReportData.map((record, index) => (
                      <tr key={record.id || index} className={`hover:bg-gray-50 ${record.hasExceptions ? 'border-l-4 border-orange-400' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            {record.hasExceptions && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                <i className="ri-alert-line mr-1"></i>
                                Exception
                              </span>
                            )}
                            {record.staffId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.staffName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{record.breakfast}</span>
                            {record.breakfastExceptions > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                +{record.breakfastExceptions}E
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{record.lunch}</span>
                            {record.lunchExceptions > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                +{record.lunchExceptions}E
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.hasExceptions ? (
                            <div className="flex flex-col space-y-1">
                              {record.breakfastExceptions > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <i className="ri-restaurant-line mr-1"></i>
                                  B: {record.breakfastExceptions}
                                </span>
                              )}
                              {record.lunchExceptions > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <i className="ri-bowl-line mr-1"></i>
                                  L: {record.lunchExceptions}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.totalItems}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{record.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Company Report Table */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Company Report</h2>
              <p className="text-sm text-gray-600 mt-1">Detailed consumption report by company</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Employees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakfast Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companyReportData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No company report data available. Generate reports after billing transactions.
                      </td>
                    </tr>
                  ) : (
                    companyReportData.map((company, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.companyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.totalEmployees}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.totalTransactions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.breakfast}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.lunch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.totalItems}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{company.totalAmount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Breakfast</p>
                <p className="text-2xl font-bold text-orange-600">{summaryStats.totalBreakfast}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-restaurant-line text-2xl text-orange-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lunch</p>
                <p className="text-2xl font-bold text-green-600">{summaryStats.totalLunch}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-bowl-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">₹{summaryStats.totalAmount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-rupee-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
