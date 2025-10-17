
import { useState, useEffect } from 'react';
import Layout from '../../components/feature/Layout';
import { employeeAPI, supportStaffAPI, guestAPI, billingAPI, priceMasterAPI } from '../../services/api';
import Receipt from '../../components/Receipt';
import { generateReceiptData, autoPrintReceipt } from '../../utils/printReceipt';

export default function Billing() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [guestCompanyName, setGuestCompanyName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [isSupportStaff, setIsSupportStaff] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [selectedSupportStaff, setSelectedSupportStaff] = useState('');
  const [supportStaffSearch, setSupportStaffSearch] = useState('');
  const [showAddSupportStaff, setShowAddSupportStaff] = useState(false);
  const [newSupportStaffName, setNewSupportStaffName] = useState('');
  const [newSupportStaffId, setNewSupportStaffId] = useState('');
  const [newSupportStaffDesignation, setNewSupportStaffDesignation] = useState('');
  const [newSupportStaffCompany, setNewSupportStaffCompany] = useState('');
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState<{
    itemName: string;
    employeeName: string;
    consumedToday: { breakfast: number; lunch: number };
  } | null>(null);
  const [pendingItem, setPendingItem] = useState<typeof menuItems[0] | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [priceMaster, setPriceMaster] = useState<PriceMaster>({
    employee: { breakfast: 20, lunch: 48 },
    company: { breakfast: 135, lunch: 165 }
  });
  const [todaysConsumption, setTodaysConsumption] = useState<{ breakfast: number; lunch: number }>({ breakfast: 0, lunch: 0 });

  // Load data from backend on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load employees
      const employeeData = await employeeAPI.getAll();
      setEmployees(employeeData);
      
      // Extract unique company names from employees
      const uniqueCompanies = [...new Set(
        employeeData
          .map((emp: any) => emp.companyName)
          .filter((company: string) => company && company.trim() !== '')
      )];
      setCompanyNames(uniqueCompanies);

      // Load guests
      const guestData = await guestAPI.getAll();
      setGuests(guestData);

      // Load support staff
      const staffData = await supportStaffAPI.getAll();
      setSupportStaff(staffData);

      // Load price master
      const priceData = await priceMasterAPI.get();
      setPriceMaster({
        employee: {
          breakfast: priceData.employee_breakfast,
          lunch: priceData.employee_lunch
        },
        company: {
          breakfast: priceData.company_breakfast,
          lunch: priceData.company_lunch
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data. Please refresh the page.');
    }
  };

  const menuItems = [
    { id: '1', name: 'Breakfast', price: 0, category: 'Breakfast' },
    { id: '2', name: 'Lunch', price: 0, category: 'Lunch' }
  ];

  const filteredEmployees = employees.filter(emp => 
    emp.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredSupportStaff = supportStaff.filter(staff => 
    staff.name.toLowerCase().includes(supportStaffSearch.toLowerCase()) ||
    staff.staffId.toLowerCase().includes(supportStaffSearch.toLowerCase())
  );

  // Check if employee/support staff has already consumed meals today
  const checkConsumption = async (personId: string, isEmployee: boolean = true) => {
    const today = new Date().toISOString().split('T')[0];
    let billingHistory: any[] = [];
    
    try {
      billingHistory = await billingAPI.getHistory(today, today);
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return { breakfast: 0, lunch: 0 };
    }
    
    const todaysBills = billingHistory.filter((bill: any) => 
      bill.date === today && 
      !bill.isGuest && 
      (isEmployee ? 
        (!bill.isSupportStaff && bill.customer?.employeeId === personId) :
        (bill.isSupportStaff && bill.customer?.staffId === personId)
      )
    );

    let breakfastCount = 0;
    let lunchCount = 0;

    todaysBills.forEach((bill: any) => {
      bill.items.forEach((item: any) => {
        // Only count non-exception items for validation
        if (!item.isException) {
          if (item.name === 'Breakfast') {
            breakfastCount += item.quantity;
          } else if (item.name === 'Lunch') {
            lunchCount += item.quantity;
          }
        }
      });
    });

    return { breakfast: breakfastCount, lunch: lunchCount };
  };

  const handleSupportStaffSelect = async (staffId: string, staffName?: string, staffIdText?: string) => {
    setSelectedSupportStaff(staffId);
    if (staffName && staffIdText) {
      setSupportStaffSearch(`${staffName} (${staffIdText})`);
    }
    const staff = supportStaff.find(s => s.id.toString() === staffId);
    if (staff) {
      const consumption = await checkConsumption(staff.staffId, false);
      setTodaysConsumption(consumption);
    }
  };

  const addToCart = async (item: typeof menuItems[0]) => {
    // Only validate for employees and support staff, not guests
    if (!isGuest) {
      let person: any = null;
      let personName = '';
      let isEmployee = true;

      if (isSupportStaff && selectedSupportStaff) {
        person = supportStaff.find(staff => staff.id.toString() === selectedSupportStaff);
        personName = person?.name || '';
        isEmployee = false;
      } else if (!isSupportStaff && selectedEmployee) {
        person = employees.find(emp => emp.id.toString() === selectedEmployee);
        personName = person?.employeeName || '';
        isEmployee = true;
      }

      if (person) {
        const personId = isEmployee ? person.employeeId : person.staffId;
        const consumedToday = await checkConsumption(personId, isEmployee);
        
        // Check current cart items (non-exception items only)
        const currentBreakfastInCart = cart
          .filter(cartItem => cartItem.id === '1' && !cartItem.isException)
          .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
        
        const currentLunchInCart = cart
          .filter(cartItem => cartItem.id === '2' && !cartItem.isException)
          .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
        
        // Calculate what the total would be after adding this item
        let wouldExceedLimit = false;
        
        if (item.name === 'Breakfast') {
          // For breakfast: check if total consumed today + current cart + new item would exceed 1
          wouldExceedLimit = consumedToday.breakfast + currentBreakfastInCart + 1 > 1;
        } else if (item.name === 'Lunch') {
          // For lunch: check if total consumed today + current cart + new item would exceed 1
          wouldExceedLimit = consumedToday.lunch + currentLunchInCart + 1 > 1;
        }

        if (wouldExceedLimit) {
          // Show validation modal
          setValidationData({
            itemName: item.name,
            employeeName: personName,
            consumedToday
          });
          setPendingItem(item);
          setShowValidationModal(true);
          return;
        }
      }
    }

    // Add to cart normally
    const existingItem = cart.find(cartItem => cartItem.id === item.id && !cartItem.isException);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id && !cartItem.isException
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const handleValidationConfirm = (addException: boolean) => {
    if (addException && pendingItem) {
      // Add to cart with exception flag
      const existingExceptionItem = cart.find(cartItem => cartItem.id === pendingItem.id && cartItem.isException);
      if (existingExceptionItem) {
        setCart(cart.map(cartItem =>
          cartItem.id === pendingItem.id && cartItem.isException
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      } else {
        setCart([...cart, { ...pendingItem, quantity: 1, isException: true }]);
      }
    }
    
    // Close modal and reset
    setShowValidationModal(false);
    setValidationData(null);
    setPendingItem(null);
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity === 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const item = cart.find(cartItem => cartItem.id === id);
      if (!item) return;

      // Check validation when increasing quantity for employees/support staff (non-exception items only)
      if (!isGuest && quantity > item.quantity && !item.isException) {
        let person: any = null;
        let personName = '';
        let isEmployee = true;

        if (isSupportStaff && selectedSupportStaff) {
          person = supportStaff.find(staff => staff.id.toString() === selectedSupportStaff);
          personName = person?.name || '';
          isEmployee = false;
        } else if (!isSupportStaff && selectedEmployee) {
          person = employees.find(emp => emp.id.toString() === selectedEmployee);
          personName = person?.employeeName || '';
          isEmployee = true;
        }

        if (person) {
          const personId = isEmployee ? person.employeeId : person.staffId;
          const consumedToday = await checkConsumption(personId, isEmployee);
          
          // Calculate other cart items (non-exception only, excluding current item)
          const otherBreakfastInCart = cart
            .filter(cartItem => cartItem.id === '1' && cartItem.id !== id && !cartItem.isException)
            .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
          
          const otherLunchInCart = cart
            .filter(cartItem => cartItem.id === '2' && cartItem.id !== id && !cartItem.isException)
            .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
          
          // Check if increasing quantity would exceed limit
          let wouldExceedLimit = false;
          
          if (item.name === 'Breakfast') {
            // For breakfast: total consumed + other cart items + new quantity should not exceed 1
            wouldExceedLimit = consumedToday.breakfast + otherBreakfastInCart + quantity > 1;
          } else if (item.name === 'Lunch') {
            // For lunch: total consumed + other cart items + new quantity should not exceed 1
            wouldExceedLimit = consumedToday.lunch + otherLunchInCart + quantity > 1;
          }

          if (wouldExceedLimit) {
            // Show validation modal
            setValidationData({
              itemName: item.name,
              employeeName: personName,
              consumedToday
            });
            setPendingItem({
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category
            });
            setShowValidationModal(true);
            return;
          }
        }
      }

      setCart(cart.map(cartItem =>
        cartItem.id === id ? { ...cartItem, quantity } : cartItem
      ));
    }
  };

  const addGuest = async () => {
    if (newGuestName && guestCompanyName) {
      try {
        const newGuest = await guestAPI.create({
          name: newGuestName,
          company_name: guestCompanyName
        });
        await loadAllData(); // Reload guests
        setSelectedGuest(newGuest.id.toString());
        setNewGuestName('');
        setGuestCompanyName('');
        setShowAddGuest(false);
      } catch (error: any) {
        console.error('Error adding guest:', error);
        alert(error.response?.data?.detail || 'Failed to add guest. Please try again.');
      }
    }
  };

  const addSupportStaff = () => {
    if (newSupportStaffName && newSupportStaffId) {
      const newStaff: SupportStaff = {
        id: Date.now().toString(),
        staffId: newSupportStaffId,
        name: newSupportStaffName,
        designation: newSupportStaffDesignation,
        companyName: newSupportStaffCompany,
        createdBy: 'Billing',
        createdDate: new Date().toISOString().split('T')[0]
      };
      setSupportStaff([...supportStaff, newStaff]);
      setSelectedSupportStaff(newStaff.id);
      setNewSupportStaffName('');
      setNewSupportStaffId('');
      setNewSupportStaffDesignation('');
      setNewSupportStaffCompany('');
      setShowAddSupportStaff(false);
    }
  };

  const handlePrintBill = () => {
    if (cart.length === 0) return;
    
    if (isGuest && !selectedGuest && !showAddGuest) {
      alert('Please select a guest or add a new guest');
      return;
    }
    
    if (isSupportStaff && !selectedSupportStaff) {
      alert('Please select support staff');
      return;
    }
    
    if (!isGuest && !isSupportStaff && !selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    // Get current user login info for support staff validation
    const currentUser = localStorage.getItem('currentUser') || 'admin';
    
    // Calculate total amount based on price master - ALL use employee pricing now
    let totalAmount = 0;
    let customerData = null;
    
    if (isGuest) {
      customerData = guests.find(g => g.id === selectedGuest);
    } else if (isSupportStaff) {
      customerData = supportStaff.find(s => s.id === selectedSupportStaff);
      
      // Apply company validation based on login
      if (customerData) {
        if (currentUser === 'refextower') {
          customerData = { ...customerData, companyName: 'Refex Industries Limited' };
        } else if (currentUser === 'bazullah') {
          customerData = { ...customerData, companyName: 'Refex Holding Private Limited' };
        }
      }
    } else {
      customerData = employees.find(e => e.id === selectedEmployee);
    }
    
    cart.forEach(item => {
      // All customer types now use employee pricing
      const itemPrice = item.name === 'Breakfast' ? 
        priceMaster.employee.breakfast : 
        priceMaster.employee.lunch;
      
      totalAmount += itemPrice * item.quantity;
    });

    // Save billing data to localStorage for reports
    const billingData = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      isGuest,
      isSupportStaff,
      customer: customerData,
      items: cart.map(item => ({
        ...item,
        // Store the actual price used for this transaction - all use employee pricing now
        actualPrice: item.name === 'Breakfast' ? priceMaster.employee.breakfast : priceMaster.employee.lunch,
        // Preserve exception flag in billing history
        isException: item.isException || false
      })),
      totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      // Store pricing type for reports - all use employee pricing now
      pricingType: 'employee'
    };

    const existingBills = JSON.parse(localStorage.getItem('billingHistory') || '[]');
    localStorage.setItem('billingHistory', JSON.stringify([...existingBills, billingData]));

    alert(`Bill printed successfully! Total Amount: ₹${totalAmount}`);
    
    // Clear form
    setCart([]);
    setSelectedEmployee('');
    setSelectedGuest('');
    setSelectedSupportStaff('');
    setEmployeeSearch('');
    setSupportStaffSearch('');
  };
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart before checkout');
      return;
    }

    if (!isGuest && !selectedEmployee && !selectedSupportStaff) {
      alert('Please select an employee or support staff');
      return;
    }

    try {
      if (isGuest) {
        if (!selectedGuest) {
          alert('Please select or add a guest');
          return;
        }

        const guest = guests.find(g => g.id.toString() === selectedGuest);
        if (!guest) {
          alert('Invalid guest selection');
          return;
        }

        const bill = {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          is_guest: true,
          is_support_staff: false,
          customer: {
            name: guest.name,
            companyName: guest.companyName
          },
          items: cart.map(item => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return {
              id: item.id,
              name: item.name,
              price: itemPrice,
              quantity: item.quantity,
              isException: item.isException
            };
          }),
          total_items: cart.reduce((sum, item) => sum + item.quantity, 0),
          total_amount: cart.reduce((sum, item) => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return sum + (itemPrice * item.quantity);
          }, 0),
          pricing_type: 'company'
        };

        const createdBill = await billingAPI.create(bill);
        
        // Generate receipt data
        const currentUser = localStorage.getItem('currentUser') || 'Admin';
        const receipt = generateReceiptData({
          ...bill,
          id: createdBill.id,
          customer: {
            name: guest.name,
            companyName: guest.company_name || guest.companyName
          }
        }, currentUser);
        
        // Show receipt and auto-print
        setReceiptData(receipt);
        setShowReceipt(true);
        
        // Auto-print after a short delay
        setTimeout(async () => {
          await autoPrintReceipt(receipt);
          setShowReceipt(false);
        }, 500);
        
        alert('✅ Checkout successful!');
        resetCheckout();
        return;
      }

      if (selectedEmployee) {
        const employee = employees.find(e => e.id.toString() === selectedEmployee);
        if (!employee) {
          console.error('Employee not found. Selected:', selectedEmployee, 'Employees:', employees.map(e => ({id: e.id, name: e.employeeName})));
          alert('Invalid employee selection. Please select an employee again.');
          return;
        }

        const bill = {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          is_guest: false,
          is_support_staff: false,
          customer: {
            employeeId: employee.employeeId,
            employeeName: employee.employeeName,
            companyName: employee.companyName
          },
          items: cart.map(item => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return {
              id: item.id,
              name: item.name,
              price: itemPrice,
              quantity: item.quantity,
              isException: item.isException
            };
          }),
          total_items: cart.reduce((sum, item) => sum + item.quantity, 0),
          total_amount: cart.reduce((sum, item) => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return sum + (itemPrice * item.quantity);
          }, 0),
          pricing_type: 'employee'
        };

        const createdBill = await billingAPI.create(bill);
        
        // Generate receipt data
        const currentUser = localStorage.getItem('currentUser') || 'Admin';
        const receipt = generateReceiptData({
          ...bill,
          id: createdBill.id,
          customer: employee,
          isGuest: false,
          isSupportStaff: false
        }, currentUser);
        
        // Show receipt and auto-print
        setReceiptData(receipt);
        setShowReceipt(true);
        
        // Auto-print after a short delay
        setTimeout(async () => {
          await autoPrintReceipt(receipt);
          setShowReceipt(false);
        }, 500);
        
        alert('✅ Checkout successful!');
        resetCheckout();
      } else if (selectedSupportStaff) {
        const staff = supportStaff.find(s => s.id.toString() === selectedSupportStaff);
        if (!staff) {
          console.error('Support staff not found. Selected:', selectedSupportStaff, 'Staff:', supportStaff.map(s => ({id: s.id, name: s.name})));
          alert('Invalid support staff selection. Please select a support staff member again.');
          return;
        }

        const bill = {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          is_guest: false,
          is_support_staff: true,
          customer: {
            staffId: staff.staffId,
            name: staff.name,
            designation: staff.designation,
            companyName: staff.companyName
          },
          items: cart.map(item => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return {
              id: item.id,
              name: item.name,
              price: itemPrice,
              quantity: item.quantity,
              isException: item.isException
            };
          }),
          total_items: cart.reduce((sum, item) => sum + item.quantity, 0),
          total_amount: cart.reduce((sum, item) => {
            const itemPrice = item.name === 'Breakfast' ? 
              priceMaster.employee.breakfast : 
              priceMaster.employee.lunch;
            return sum + (itemPrice * item.quantity);
          }, 0),
          pricing_type: 'employee'
        };

        const createdBill = await billingAPI.create(bill);
        
        // Generate receipt data
        const currentUser = localStorage.getItem('currentUser') || 'Admin';
        const receipt = generateReceiptData({
          ...bill,
          id: createdBill.id,
          customer: staff,
          isGuest: false,
          isSupportStaff: true
        }, currentUser);
        
        // Show receipt and auto-print
        setReceiptData(receipt);
        setShowReceipt(true);
        
        // Auto-print after a short delay
        setTimeout(async () => {
          await autoPrintReceipt(receipt);
          setShowReceipt(false);
        }, 500);
        
        alert('✅ Checkout successful!');
        resetCheckout();
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      alert(error.response?.data?.detail || 'Checkout failed. Please try again.');
    }
  };

  const resetCheckout = () => {
    setCart([]);
    setSelectedEmployee('');
    setSelectedSupportStaff('');
    setSelectedGuest('');
    setEmployeeSearch('');
    setSupportStaffSearch('');
    setIsGuest(false);
    setTodaysConsumption({ breakfast: 0, lunch: 0 });
  };

  const getSelectedPersonName = () => {
    if (isGuest) {
      const guest = guests.find(g => g.id === selectedGuest);
      return guest ? `${guest.name} (${guest.companyName})` : '';
    } else if (isSupportStaff) {
      const staff = supportStaff.find(s => s.id === selectedSupportStaff);
      return staff ? `${staff.name} (${staff.staffId})` : '';
    } else {
      const employee = employees.find(e => e.id === selectedEmployee);
      return employee ? `${employee.employeeName} (${employee.employeeId})` : '';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto h-full">
        {/* Validation Modal */}
        {showValidationModal && validationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-red-600 flex items-center">
                    <i className="ri-alert-line mr-2"></i>
                    Daily Consumption Limit Reached
                  </h2>
                  <button
                    onClick={() => handleValidationConfirm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <i className="ri-warning-line text-yellow-600 text-xl mr-3 mt-0.5"></i>
                    <div>
                      <h3 className="font-semibold text-yellow-800 mb-2">Daily Limit Alert</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        <strong>{validationData.employeeName}</strong> has already consumed today:
                      </p>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div className="flex items-center">
                          <i className="ri-restaurant-line mr-2"></i>
                          <span>Breakfast: {validationData.consumedToday.breakfast} time(s) (Daily Limit: 1)</span>
                        </div>
                        <div className="flex items-center">
                          <i className="ri-bowl-line mr-2"></i>
                          <span>Lunch: {validationData.consumedToday.lunch} time(s) (Daily Limit: 1)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <i className="ri-information-line text-blue-600 text-xl mr-3 mt-0.5"></i>
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">Exception Option Available</h4>
                      <p className="text-sm text-blue-700">
                        You can add an additional <strong>{validationData.itemName.toLowerCase()}</strong> as an exception 
                        (e.g., consuming on behalf of someone else or special circumstances).
                      </p>
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        Exception items will be marked separately in the bill.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleValidationConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap font-medium transition-colors"
                  >
                    <i className="ri-close-line mr-2"></i>
                    Cancel
                  </button>
                  <button
                    onClick={() => handleValidationConfirm(true)}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap font-medium transition-colors flex items-center justify-center"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Add as Exception
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
          {/* Menu Items - Fixed Height Container */}
          <div className="xl:col-span-2 flex flex-col h-full">
            {/* Header - Compact */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Billing</h1>
                <p className="text-gray-600 text-sm">Select items and process orders</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsGuest(false);
                    setIsSupportStaff(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all ${
                    !isGuest && !isSupportStaff ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="ri-user-line mr-1"></i>
                  Employee
                </button>
                <button
                  onClick={() => {
                    setIsGuest(false);
                    setIsSupportStaff(true);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all ${
                    isSupportStaff ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="ri-tools-line mr-1"></i>
                  Support Staff
                </button>
                <button
                  onClick={() => {
                    setIsGuest(true);
                    setIsSupportStaff(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all ${
                    isGuest ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="ri-user-add-line mr-1"></i>
                  Guest
                </button>
              </div>
            </div>

            {/* Menu Items - Fixed Height, No Scroll */}
            <div className="flex-1 space-y-3">
              {/* Breakfast Section - Compact */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center">
                    <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center mr-2">
                      <i className="ri-restaurant-line text-white text-xs"></i>
                    </div>
                    Breakfast Menu
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Price: ₹{priceMaster.employee.breakfast} per item
                  </p>
                </div>
                <div className="p-3">
                  <button
                    onClick={() => addToCart(menuItems[0])}
                    className="bg-gradient-to-br from-orange-50 to orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-200 hover:border-orange-300 rounded-lg p-3 text-center transition-all cursor-pointer w-full group hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <i className="ri-restaurant-line text-lg text-white"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Breakfast</h3>
                    <p className="text-orange-600 font-bold">₹{priceMaster.employee.breakfast}</p>
                  </button>
                </div>
              </div>

              {/* Lunch Section - Compact */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to green-100">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center">
                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center mr-2">
                      <i className="ri-bowl-line text-white text-xs"></i>
                    </div>
                    Lunch Menu
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Price: ₹{priceMaster.employee.lunch} per item
                  </p>
                </div>
                <div className="p-3">
                  <button
                    onClick={() => addToCart(menuItems[1])}
                    className="bg-gradient-to-br from-green-50 to green-100 hover:from-green-100 hover:to-green-200 border border-green-200 hover:border-green-300 rounded-lg p-3 text-center transition-all cursor-pointer w-full group hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <i className="ri-bowl-line text-lg text-white"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Lunch</h3>
                    <p className="text-green-600 font-bold">₹{priceMaster.employee.lunch}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cart & Billing - Fixed Height */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <i className="ri-shopping-cart-line mr-2 text-blue-600"></i>
                Order Summary
              </h2>
              <p className="text-xs text-gray-600 mt-1">Review your order details</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Customer Selection */}
              {!isGuest && !isSupportStaff ? (
                // Employee Selection
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    <i className="ri-search-line mr-1"></i>
                    Search Employee
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Search by name or ID..."
                    />
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                  </div>
                  
                  {/* Show selected employee */}
                  {selectedEmployee && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                            <i className="ri-user-line text-white text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-blue-900">Selected Employee</p>
                            <p className="text-xs text-blue-700">{getSelectedPersonName()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployee('');
                            setEmployeeSearch('');
                          }}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer p-1 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Employee search results */}
                  {employeeSearch && !selectedEmployee && filteredEmployees.length > 0 && (
                    <div className="mt-2 max-h-24 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setSelectedEmployee(emp.id.toString());
                            setEmployeeSearch(`${emp.employeeName} (${emp.employeeId})`);
                          }}
                          className="w-full px-2 py-2 text-left hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {emp.qrCode ? (
                              <div className="w-6 h-6 border border-gray-300 rounded-lg overflow-hidden">
                                <img
                                  src={emp.qrCode}
                                  alt="QR"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                                <i className="ri-user-line text-gray-500 text-xs"></i>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate text-xs">{emp.employeeName}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {emp.employeeId} • {emp.companyName || 'No Company'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {employeeSearch && !selectedEmployee && filteredEmployees.length === 0 && employees.length > 0 && (
                    <div className="mt-2 p-2 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                      <i className="ri-search-line text-lg mb-1 block"></i>
                      <p className="text-xs">No employees found matching "{employeeSearch}"</p>
                    </div>
                  )}
                  
                  {employees.length === 0 && (
                    <div className="mt-2 p-2 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                      <i className="ri-user-add-line text-lg mb-1 block"></i>
                      <p className="text-xs">No employees available</p>
                      <p className="text-xs text-gray-400 mt-1">Please add employees in Master Data first</p>
                    </div>
                  )}
                </div>
              ) : isSupportStaff ? (
                // Support Staff Selection
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      <i className="ri-tools-line mr-1"></i>
                      Search Support Staff
                    </label>
                    <button
                      onClick={() => setShowAddSupportStaff(!showAddSupportStaff)}
                      className="text-purple-600 hover:text-purple-700 text-xs font-medium cursor-pointer hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Add New
                    </button>
                  </div>

                  {showAddSupportStaff && (
                    <div className="space-y-2 p-2 bg-purple-50 rounded-lg border border-purple-200 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Staff ID</label>
                        <input
                          type="text"
                          value={newSupportStaffId}
                          onChange={(e) => setNewSupportStaffId(e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-xs"
                          placeholder="Enter staff ID"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Staff Name</label>
                        <input
                          type="text"
                          value={newSupportStaffName}
                          onChange={(e) => setNewSupportStaffName(e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-xs"
                          placeholder="Enter staff name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                        <select
                          value={newSupportStaffDesignation}
                          onChange={(e) => setNewSupportStaffDesignation(e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-6 appearance-none text-xs"
                        >
                          <option value="">Select designation...</option>
                          <option value="Driver">Driver</option>
                          <option value="Office Assistant">Office Assistant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                        {companyNames.length > 0 ? (
                          <div className="relative">
                            <select
                              value={newSupportStaffCompany}
                              onChange={(e) => setNewSupportStaffCompany(e.target.value)}
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-6 appearance-none text-xs"
                            >
                              <option value="">Select company...</option>
                              {companyNames.map((company, index) => (
                                <option key={index} value={company}>
                                  {company}
                                </option>
                              ))}
                            </select>
                            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={newSupportStaffCompany}
                            onChange={(e) => setNewSupportStaffCompany(e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-xs"
                            placeholder="Enter company name"
                          />
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={addSupportStaff}
                          className="px-2 py-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 cursor-pointer whitespace-nowrap flex-1 font-medium transition-colors"
                        >
                          <i className="ri-add-line mr-1"></i>
                          Add Staff
                        </button>
                        <button
                          onClick={() => setShowAddSupportStaff(false)}
                          className="px-2 py-2 bg-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-400 cursor-pointer whitespace-nowrap flex-1 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      value={supportStaffSearch}
                      onChange={(e) => setSupportStaffSearch(e.target.value)}
                      className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Search by name or ID..."
                    />
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                  </div>
                  
                  {/* Show selected support staff */}
                  {selectedSupportStaff && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center mr-2">
                            <i className="ri-tools-line text-white text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-purple-900">Selected Support Staff</p>
                            <p className="text-xs text-purple-700">{getSelectedPersonName()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSupportStaff('');
                            setSupportStaffSearch('');
                          }}
                          className="text-purple-600 hover:text-purple-800 cursor-pointer p-1 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Support staff search results */}
                  {supportStaffSearch && !selectedSupportStaff && filteredSupportStaff.length > 0 && (
                    <div className="mt-2 max-h-24 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                      {filteredSupportStaff.map((staff) => (
                        <button
                          key={staff.id}
                          onClick={() => handleSupportStaffSelect(staff.id.toString(), staff.name, staff.staffId)}
                          className="w-full px-2 py-2 text-left hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                              <i className="ri-tools-line text-purple-500 text-xs"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate text-xs">{staff.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {staff.staffId} • {staff.designation || 'No Designation'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {supportStaffSearch && !selectedSupportStaff && filteredSupportStaff.length === 0 && supportStaff.length > 0 && (
                    <div className="mt-2 p-2 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                      <i className="ri-search-line text-lg mb-1 block"></i>
                      <p className="text-xs">No support staff found matching "{supportStaffSearch}"</p>
                    </div>
                  )}
                  
                  {supportStaff.length === 0 && (
                    <div className="mt-2 p-2 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                      <i className="ri-tools-line text-lg mb-1 block"></i>
                      <p className="text-xs">No support staff available</p>
                      <p className="text-xs text-gray-400 mt-1">Add support staff above or in Master Data</p>
                    </div>
                  )}
                </div>
              ) : (
                // Guest Selection
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      <i className="ri-user-add-line mr-1"></i>
                      Select Guest
                    </label>
                    <button
                      onClick={() => setShowAddGuest(!showAddGuest)}
                      className="text-green-600 hover:text-green-700 text-xs font-medium cursor-pointer hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Add New
                    </button>
                  </div>
                  
                  {showAddGuest && (
                    <div className="space-y-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name</label>
                        <input
                          type="text"
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-5

      00 focus:border-transparent outline-none text-xs"
                          placeholder="Enter guest name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                        {companyNames.length > 0 ? (
                          <div className="relative">
                            <select
                              value={guestCompanyName}
                              onChange={(e) => setGuestCompanyName(e.target.value)}
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none pr-6 appearance-none text-xs"
                            >
                              <option value="">Select company...</option>
                              {companyNames.map((company, index) => (
                                <option key={index} value={company}>
                                  {company}
                                </option>
                              ))}
                            </select>
                            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={guestCompanyName}
                            onChange={(e) => setGuestCompanyName(e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-xs"
                            placeholder="Enter company name"
                          />
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={addGuest}
                          className="px-2 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-7  cursor-pointer whitespace-nowrap flex-1 font-medium transition-colors"
                        >
                          <i className="ri-add-line mr-1"></i>
                          Add Guest
                        </button>
                        <button
                          onClick={() => setShowAddGuest(false)}
                          className="px-2 py-2 bg-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-4 cursor-pointer whitespace-nowrap flex-1 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {guests.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedGuest}
                        onChange={(e) => setSelectedGuest(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none pr-6 appearance-none text-sm"
                      >
                        <option value="">Choose guest...</option>
                        {guests.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.name} - {guest.companyName}
                          </option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                  )}
                </div>
              )}

              {/* Cart Items */}
              <div className="border-t border-gray-200 pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                  <i className="ri-shopping-bag-line mr-1"></i>
                  Cart Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </h3>
                {cart.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="ri-shopping-cart-line text-2xl text-gray-300 mb-2 block"></i>
                    <p className="text-gray-500 font-medium text-xs">No items in cart</p>
                    <p className="text-xs text-gray-400 mt-1">Add items from the menu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => {
                      const itemPrice = item.name === 'Breakfast' ? 
                        (isGuest ? priceMaster.company.breakfast : priceMaster.employee.breakfast) :
                        (isGuest ? priceMaster.company.lunch : priceMaster.employee.lunch);
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              item.name === 'Breakfast' ? 'bg-orange-100' : 'bg-green-100'
                            }`}>
                              <i className={`text-xs ${
                                item.name === 'Breakfast' ? 'ri-restaurant-line text-orange-600' : 'ri-bowl-line text-green-600'
                              }`}></i>
                            </div>
                            <div>
                              <div className="flex items-center">
                                <h4 className="font-medium text-gray-900 text-xs">{item.name}</h4>
                                {item.isException && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                                    Exception
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-xs">₹{itemPrice} each</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                              <i className="ri-subtract-line text-xs"></i>
                            </button>
                            <span className="w-6 text-center font-semibold text-xs">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                              <i className="ri-add-line text-xs"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Print Button - Fixed at bottom */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-3 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold mt-1">
                    <span>Total Amount:</span>
                    <span className="text-green-600">
                      ₹{cart.reduce((sum, item) => {
                        // All customer types now use employee pricing
                        const itemPrice = item.name === 'Breakfast' ? 
                          priceMaster.employee.breakfast : 
                          priceMaster.employee.lunch;
                        return sum + (itemPrice * item.quantity);
                      }, 0)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center shadow-lg hover:shadow-xl text-sm"
                >
                  <i className="ri-shopping-cart-check-line mr-2"></i>
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal - Hidden, only for printing */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4">
              <Receipt {...receiptData} />
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={async () => {
                  await autoPrintReceipt(receiptData);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="ri-printer-line mr-2"></i>
                Print Again
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Type definitions
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isException?: boolean;
}

interface Employee {
  id: string;
  employeeName: string;
  employeeId: string;
  companyName: string;
  qrCode?: string;
}

interface Guest {
  id: string;
  name: string;
  companyName: string;
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
