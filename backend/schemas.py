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

class EmployeeResponse(BaseModel):
    id: int
    employeeId: str
    employeeName: str
    companyName: Optional[str] = None
    entity: Optional[str] = None
    mobileNumber: Optional[str] = None
    location: Optional[str] = None
    qrCode: Optional[str] = None
    createdBy: str
    createdDate: str
    
    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            employeeId=obj.employee_id,
            employeeName=obj.employee_name,
            companyName=obj.company_name,
            entity=obj.entity,
            mobileNumber=obj.mobile_number,
            location=obj.location,
            qrCode=obj.qr_code,
            createdBy=obj.created_by,
            createdDate=obj.created_date
        )

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

class SupportStaffResponse(BaseModel):
    id: int
    staffId: str
    name: str
    designation: Optional[str] = None
    companyName: Optional[str] = None
    biometricData: Optional[str] = None
    createdBy: str
    createdDate: str
    
    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            staffId=obj.staff_id,
            name=obj.name,
            designation=obj.designation,
            companyName=obj.company_name,
            biometricData=obj.biometric_data,
            createdBy=obj.created_by,
            createdDate=obj.created_date
        )

# Guest schemas
class GuestCreate(BaseModel):
    name: str
    company_name: str

class GuestResponse(BaseModel):
    id: int
    name: str
    companyName: str
    
    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            name=obj.name,
            companyName=obj.company_name
        )

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
