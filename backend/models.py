from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    employee_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    entity = Column(String(255), nullable=True)
    mobile_number = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)
    qr_code = Column(Text, nullable=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(String(20), nullable=False, default=func.current_date())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SupportStaff(Base):
    __tablename__ = "support_staff"
    
    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    designation = Column(String(100), nullable=True)
    company_name = Column(String(255), nullable=True)
    biometric_data = Column(Text, nullable=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(String(20), nullable=False, default=func.current_date())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Guest(Base):
    __tablename__ = "guests"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BillingRecord(Base):
    __tablename__ = "billing_records"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(20), nullable=False, index=True)
    time = Column(String(20), nullable=False)
    is_guest = Column(Boolean, default=False)
    is_support_staff = Column(Boolean, default=False)
    customer = Column(JSON, nullable=False)
    items = Column(JSON, nullable=False)
    total_items = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    pricing_type = Column(String(20), default="employee")
    created_by = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PriceMaster(Base):
    __tablename__ = "price_master"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_breakfast = Column(Float, nullable=False, default=20)
    employee_lunch = Column(Float, nullable=False, default=48)
    company_breakfast = Column(Float, nullable=False, default=135)
    company_lunch = Column(Float, nullable=False, default=165)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())