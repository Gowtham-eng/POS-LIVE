from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# Employee schemas
class EmployeeBase(BaseModel):
    employee_id: str
    employee_name: str
    company_name: Optional[str] = None
    entity: Optional[str] = None
    mobile_number: Optional[str] = None
    location: Optional[str] = None
    qr_code: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    company_name: Optional[str] = None
    entity: Optional[str] = None
    mobile_number: Optional[str] = None
    location: Optional[str] = None
    qr_code: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: int
    created_by: str
    created_date: str
    
    class Config:
        from_attributes = True

# Support Staff schemas
class SupportStaffBase(BaseModel):
    staff_id: str
    name: str
    designation: Optional[str] = None
    company_name: Optional[str] = None
    biometric_data: Optional[str] = None

class SupportStaffCreate(SupportStaffBase):
    pass

class SupportStaffUpdate(BaseModel):
    staff_id: Optional[str] = None
    name: Optional[str] = None
    designation: Optional[str] = None
    company_name: Optional[str] = None
    biometric_data: Optional[str] = None

class SupportStaffResponse(SupportStaffBase):
    id: int
    created_by: str
    created_date: str
    
    class Config:
        from_attributes = True

# Guest schemas
class GuestCreate(BaseModel):
    name: str
    company_name: str

class GuestResponse(GuestCreate):
    id: int
    
    class Config:
        from_attributes = True

# Billing schemas
class BillingCreate(BaseModel):
    date: str
    time: str
    is_guest: bool = False
    is_support_staff: bool = False
    customer: Dict[str, Any]
    items: List[Dict[str, Any]]
    total_items: int
    total_amount: float
    pricing_type: str = "employee"

class BillingResponse(BillingCreate):
    id: int
    
    class Config:
        from_attributes = True

# Price Master schemas
class PriceMasterUpdate(BaseModel):
    employee_breakfast: float
    employee_lunch: float
    company_breakfast: float
    company_lunch: float

class PriceMasterResponse(PriceMasterUpdate):
    id: int
    
    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardStats(BaseModel):
    stats: Dict[str, Any]
    companyWiseData: List[Dict[str, Any]]

# Report schemas
class ReportFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    employee_id: Optional[str] = None
    staff_id: Optional[str] = None
    company: Optional[str] = None
