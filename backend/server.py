from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import engine, SessionLocal, Base
from models import User, Employee, SupportStaff, Guest, BillingRecord, PriceMaster
from schemas import (
    Token, UserCreate, UserLogin,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    SupportStaffCreate, SupportStaffUpdate, SupportStaffResponse,
    GuestCreate, GuestResponse,
    BillingCreate, BillingResponse,
    PriceMasterUpdate, PriceMasterResponse,
    DashboardStats, ReportFilter
)
from config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="POS System API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Initialize default users and price master on startup
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        # Create default users if they don't exist
        default_users = [
            {"username": "admin", "password": "password"},
            {"username": "refextower", "password": "password"},
            {"username": "bazullah", "password": "password"},
        ]
        
        for user_data in default_users:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                hashed_password = get_password_hash(user_data["password"])
                new_user = User(username=user_data["username"], hashed_password=hashed_password)
                db.add(new_user)
        
        # Create default price master if it doesn't exist
        existing_price = db.query(PriceMaster).first()
        if not existing_price:
            default_price = PriceMaster(
                employee_breakfast=20,
                employee_lunch=48,
                company_breakfast=135,
                company_lunch=165
            )
            db.add(default_price)
        
        db.commit()
    finally:
        db.close()

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "id": current_user.id}

# ==================== EMPLOYEE ENDPOINTS ====================

@app.get("/api/employees", response_model=List[EmployeeResponse])
async def get_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).all()
    return [EmployeeResponse.from_orm(emp) for emp in employees]

@app.post("/api/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if employee ID already exists
    existing = db.query(Employee).filter(Employee.employee_id == employee.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    db_employee = Employee(**employee.dict(), created_by=current_user.username)
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return EmployeeResponse.from_orm(db_employee)

@app.put("/api/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: int, employee: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for key, value in employee.dict(exclude_unset=True).items():
        setattr(db_employee, key, value)
    
    db.commit()
    db.refresh(db_employee)
    return EmployeeResponse.from_orm(db_employee)

@app.delete("/api/employees/{employee_id}")
async def delete_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(db_employee)
    db.commit()
    return {"message": "Employee deleted successfully"}

@app.post("/api/employees/sync-hrms")
async def sync_hrms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                settings.HRMS_API_URL,
                headers={
                    "Authorization": settings.HRMS_API_TOKEN,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            response.raise_for_status()
            api_response = response.json()
            
            hrms_employees = api_response if isinstance(api_response, list) else api_response.get("results", [])
            
            support_staff_designations = ['Driver', 'Office Assistant']
            new_employees_count = 0
            new_support_staff_count = 0
            
            for emp in hrms_employees:
                designation = emp.get('designation', '')
                is_support = any(d.lower() in designation.lower() for d in support_staff_designations)
                
                if is_support:
                    staff_id = emp.get('employee_id', '')
                    existing = db.query(SupportStaff).filter(SupportStaff.staff_id == staff_id).first()
                    if not existing and staff_id:
                        new_staff = SupportStaff(
                            staff_id=staff_id,
                            name=emp.get('employee_name', ''),
                            designation=designation,
                            company_name=emp.get('company', {}).get('company_name', ''),
                            biometric_data=emp.get('qr_code_image', ''),
                            created_by='HRMS Sync'
                        )
                        db.add(new_staff)
                        new_support_staff_count += 1
                else:
                    employee_id = emp.get('employee_id', '')
                    existing = db.query(Employee).filter(Employee.employee_id == employee_id).first()
                    if not existing and employee_id:
                        new_employee = Employee(
                            employee_id=employee_id,
                            employee_name=emp.get('employee_name', ''),
                            company_name=emp.get('company', {}).get('company_name', ''),
                            entity=designation,
                            mobile_number=emp.get('mobile_number', ''),
                            location=emp.get('branch', {}).get('branch_name', ''),
                            qr_code=emp.get('qr_code_image', ''),
                            created_by='HRMS Sync'
                        )
                        db.add(new_employee)
                        new_employees_count += 1
            
            db.commit()
            return {
                "message": "HRMS sync completed",
                "new_employees": new_employees_count,
                "new_support_staff": new_support_staff_count
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HRMS sync failed: {str(e)}")

# ==================== SUPPORT STAFF ENDPOINTS ====================

@app.get("/api/support-staff", response_model=List[SupportStaffResponse])
async def get_support_staff(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = db.query(SupportStaff).all()
    return [SupportStaffResponse.from_orm(s) for s in staff]

@app.post("/api/support-staff", response_model=SupportStaffResponse)
async def create_support_staff(staff: SupportStaffCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(SupportStaff).filter(SupportStaff.staff_id == staff.staff_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff ID already exists")
    
    db_staff = SupportStaff(**staff.dict(), created_by=current_user.username)
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return SupportStaffResponse.from_orm(db_staff)

@app.put("/api/support-staff/{staff_id}", response_model=SupportStaffResponse)
async def update_support_staff(staff_id: int, staff: SupportStaffUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_staff = db.query(SupportStaff).filter(SupportStaff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Support staff not found")
    
    for key, value in staff.dict(exclude_unset=True).items():
        setattr(db_staff, key, value)
    
    db.commit()
    db.refresh(db_staff)
    return SupportStaffResponse.from_orm(db_staff)

@app.delete("/api/support-staff/{staff_id}")
async def delete_support_staff(staff_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_staff = db.query(SupportStaff).filter(SupportStaff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Support staff not found")
    
    db.delete(db_staff)
    db.commit()
    return {"message": "Support staff deleted successfully"}

# ==================== GUEST ENDPOINTS ====================

@app.get("/api/guests", response_model=List[GuestResponse])
async def get_guests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    guests = db.query(Guest).all()
    return [GuestResponse.from_orm(g) for g in guests]

@app.post("/api/guests", response_model=GuestResponse)
async def create_guest(guest: GuestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_guest = Guest(**guest.dict())
    db.add(db_guest)
    db.commit()
    db.refresh(db_guest)
    return GuestResponse.from_orm(db_guest)

# ==================== BILLING ENDPOINTS ====================

@app.get("/api/billing/history", response_model=List[BillingResponse])
async def get_billing_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingRecord)
    
    if start_date:
        query = query.filter(BillingRecord.date >= start_date)
    if end_date:
        query = query.filter(BillingRecord.date <= end_date)
    
    records = query.order_by(BillingRecord.created_at.desc()).all()
    return [BillingResponse.from_orm(record) for record in records]

@app.post("/api/billing/create", response_model=BillingResponse)
async def create_billing(billing: BillingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_billing = BillingRecord(**billing.dict())
    db.add(db_billing)
    db.commit()
    db.refresh(db_billing)
    return db_billing

# ==================== PRICE MASTER ENDPOINTS ====================

@app.get("/api/price-master", response_model=PriceMasterResponse)
async def get_price_master(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    price_master = db.query(PriceMaster).first()
    if not price_master:
        # Create default if doesn't exist
        price_master = PriceMaster(
            employee_breakfast=20,
            employee_lunch=48,
            company_breakfast=135,
            company_lunch=165
        )
        db.add(price_master)
        db.commit()
        db.refresh(price_master)
    return price_master

@app.put("/api/price-master", response_model=PriceMasterResponse)
async def update_price_master(price: PriceMasterUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    price_master = db.query(PriceMaster).first()
    if not price_master:
        price_master = PriceMaster(**price.dict())
        db.add(price_master)
    else:
        for key, value in price.dict().items():
            setattr(price_master, key, value)
    
    db.commit()
    db.refresh(price_master)
    return price_master

# ==================== DASHBOARD ENDPOINTS ====================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingRecord)
    
    if start_date:
        query = query.filter(BillingRecord.date >= start_date)
    if end_date:
        query = query.filter(BillingRecord.date <= end_date)
    
    bills = query.all()
    
    stats = {
        "breakfast": {"employee": 0, "supportStaff": 0, "guest": 0, "total": 0},
        "lunch": {"employee": 0, "supportStaff": 0, "guest": 0, "total": 0}
    }
    
    company_stats = {}
    
    for bill in bills:
        items = bill.items if isinstance(bill.items, list) else []
        
        for item in items:
            if item.get('name') == 'Breakfast':
                qty = item.get('quantity', 0)
                if bill.is_guest:
                    stats['breakfast']['guest'] += qty
                elif bill.is_support_staff:
                    stats['breakfast']['supportStaff'] += qty
                else:
                    stats['breakfast']['employee'] += qty
                stats['breakfast']['total'] += qty
            elif item.get('name') == 'Lunch':
                qty = item.get('quantity', 0)
                if bill.is_guest:
                    stats['lunch']['guest'] += qty
                elif bill.is_support_staff:
                    stats['lunch']['supportStaff'] += qty
                else:
                    stats['lunch']['employee'] += qty
                stats['lunch']['total'] += qty
        
        # Company-wise stats
        customer = bill.customer if isinstance(bill.customer, dict) else {}
        company_name = customer.get('companyName', 'Unknown Company')
        
        if company_name not in company_stats:
            company_stats[company_name] = {"name": company_name, "breakfast": 0, "lunch": 0, "total": 0}
        
        for item in items:
            if item.get('name') == 'Breakfast':
                company_stats[company_name]['breakfast'] += item.get('quantity', 0)
            elif item.get('name') == 'Lunch':
                company_stats[company_name]['lunch'] += item.get('quantity', 0)
        
        company_stats[company_name]['total'] = company_stats[company_name]['breakfast'] + company_stats[company_name]['lunch']
    
    company_wise_data = sorted(company_stats.values(), key=lambda x: x['total'], reverse=True)
    
    return {
        "stats": stats,
        "companyWiseData": company_wise_data
    }

# ==================== REPORTS ENDPOINTS ====================

@app.get("/api/reports/employee")
async def get_employee_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    employee_id: Optional[str] = None,
    company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingRecord).filter(BillingRecord.is_support_staff == False)
    
    if start_date:
        query = query.filter(BillingRecord.date >= start_date)
    if end_date:
        query = query.filter(BillingRecord.date <= end_date)
    
    bills = query.all()
    
    report_data = []
    for bill in bills:
        customer = bill.customer if isinstance(bill.customer, dict) else {}
        items = bill.items if isinstance(bill.items, list) else []
        
        breakfast = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Breakfast')
        lunch = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Lunch')
        breakfast_exceptions = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Breakfast' and item.get('isException'))
        lunch_exceptions = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Lunch' and item.get('isException'))
        
        record = {
            "id": bill.id,
            "employeeId": 'GUEST' if bill.is_guest else customer.get('employeeId', 'N/A'),
            "employeeName": customer.get('name', '') if bill.is_guest else customer.get('employeeName', 'Unknown'),
            "company": customer.get('companyName', 'N/A'),
            "date": bill.date,
            "time": bill.time,
            "breakfast": breakfast,
            "lunch": lunch,
            "breakfastExceptions": breakfast_exceptions,
            "lunchExceptions": lunch_exceptions,
            "totalItems": bill.total_items,
            "amount": bill.total_amount,
            "isGuest": bill.is_guest,
            "hasExceptions": breakfast_exceptions > 0 or lunch_exceptions > 0
        }
        
        # Apply filters
        if employee_id and record['employeeId'] != employee_id:
            continue
        if company and record['company'] != company:
            continue
        
        report_data.append(record)
    
    return report_data

@app.get("/api/reports/support-staff")
async def get_support_staff_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    staff_id: Optional[str] = None,
    company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingRecord).filter(BillingRecord.is_support_staff == True)
    
    if start_date:
        query = query.filter(BillingRecord.date >= start_date)
    if end_date:
        query = query.filter(BillingRecord.date <= end_date)
    
    bills = query.all()
    
    report_data = []
    for bill in bills:
        customer = bill.customer if isinstance(bill.customer, dict) else {}
        items = bill.items if isinstance(bill.items, list) else []
        
        breakfast = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Breakfast')
        lunch = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Lunch')
        breakfast_exceptions = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Breakfast' and item.get('isException'))
        lunch_exceptions = sum(item.get('quantity', 0) for item in items if item.get('name') == 'Lunch' and item.get('isException'))
        
        record = {
            "id": bill.id,
            "staffId": customer.get('staffId', 'N/A'),
            "staffName": customer.get('name', 'Unknown'),
            "designation": customer.get('designation', 'N/A'),
            "company": customer.get('companyName', 'N/A'),
            "date": bill.date,
            "time": bill.time,
            "breakfast": breakfast,
            "lunch": lunch,
            "breakfastExceptions": breakfast_exceptions,
            "lunchExceptions": lunch_exceptions,
            "totalItems": bill.total_items,
            "amount": bill.total_amount,
            "hasExceptions": breakfast_exceptions > 0 or lunch_exceptions > 0
        }
        
        # Apply filters
        if staff_id and record['staffId'] != staff_id:
            continue
        if company and record['company'] != company:
            continue
        
        report_data.append(record)
    
    return report_data

@app.get("/api/reports/company")
async def get_company_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingRecord)
    
    if start_date:
        query = query.filter(BillingRecord.date >= start_date)
    if end_date:
        query = query.filter(BillingRecord.date <= end_date)
    
    bills = query.all()
    
    # Get price master for calculations
    price_master = db.query(PriceMaster).first()
    company_breakfast = price_master.company_breakfast if price_master else 135
    company_lunch = price_master.company_lunch if price_master else 165
    
    company_stats = {}
    
    for bill in bills:
        customer = bill.customer if isinstance(bill.customer, dict) else {}
        company_name = customer.get('companyName', 'Unknown Company')
        items = bill.items if isinstance(bill.items, list) else []
        
        if company and company_name != company:
            continue
        
        if company_name not in company_stats:
            company_stats[company_name] = {
                "companyName": company_name,
                "totalEmployees": 0,
                "totalTransactions": 0,
                "breakfast": 0,
                "lunch": 0,
                "totalItems": 0,
                "totalAmount": 0,
                "employees": set()
            }
        
        company_stats[company_name]['totalTransactions'] += 1
        
        for item in items:
            if item.get('name') == 'Breakfast':
                qty = item.get('quantity', 0)
                company_stats[company_name]['breakfast'] += qty
                company_stats[company_name]['totalAmount'] += qty * company_breakfast
            elif item.get('name') == 'Lunch':
                qty = item.get('quantity', 0)
                company_stats[company_name]['lunch'] += qty
                company_stats[company_name]['totalAmount'] += qty * company_lunch
        
        company_stats[company_name]['totalItems'] = company_stats[company_name]['breakfast'] + company_stats[company_name]['lunch']
        
        # Track unique employees
        employee_name = customer.get('name', '') if bill.is_guest else customer.get('employeeName', customer.get('name', 'Unknown'))
        company_stats[company_name]['employees'].add(employee_name)
    
    # Convert set to count
    report_data = []
    for company_name, data in company_stats.items():
        data['totalEmployees'] = len(data['employees'])
        del data['employees']  # Remove set as it's not JSON serializable
        report_data.append(data)
    
    # Sort by total amount
    report_data.sort(key=lambda x: x['totalAmount'], reverse=True)
    
    return report_data

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)