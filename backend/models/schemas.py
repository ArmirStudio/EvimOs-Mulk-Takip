from pydantic import BaseModel
from typing import List, Optional, Literal, Any

class UserRole(str):
    ADMIN = "admin"
    AGENT = "agent"
    EMPLOYEE = "employee"
    LANDLORD = "landlord"
    TENANT = "tenant"

class PropertyStatus(str):
    VACANT = "vacant"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"

class ReceiptStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class MaintenanceStatus(str):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"

# Request/Response Models
class ResolveLoginIdentifierRequest(BaseModel):
    identifier: str

class CreateInviteRequest(BaseModel):
    role: Literal["landlord", "tenant", "employee"]
    contact_label: str
    prefill_full_name: Optional[str] = None
    prefill_phone: Optional[str] = None
    prefill_email: Optional[str] = None
    employee_access_level: Optional[Literal["full", "limited"]] = None

class LookupInviteCodeRequest(BaseModel):
    code: str

class RegisterInviteRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: str
    password: str

class RegisterInviteCodeRequest(RegisterInviteRequest):
    code: str

class UpdatePendingInviteRequest(BaseModel):
    action: Literal["approve", "update_label"]
    contact_label: Optional[str] = None
    employee_access_level: Optional[Literal["full", "limited"]] = None


class LegalAcceptanceRequest(BaseModel):
    accepted: Literal[True]


class AdminDevLinkUserRequest(BaseModel):
    user_id: str
    role: Literal["agent", "landlord", "tenant", "employee"]
    target_agent_id: Optional[str] = None
    agency_id: Optional[str] = None
    employee_access_level: Optional[Literal["full", "limited"]] = None
    status: Literal["pending", "active"] = "active"

class CreateUserRequest(BaseModel):
    email: str
    password: Optional[str] = None
    role: Literal["agent", "landlord", "tenant", "employee"]
    full_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    employee_access_level: Optional[Literal["full", "limited"]] = None
    property_id: Optional[str] = None  # For tenants

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    employee_access_level: Optional[Literal["full", "limited"]] = None
    preferred_currency: Optional[Literal["TRY", "USD", "EUR"]] = None
    preferred_theme: Optional[Literal["light", "dark", "system"]] = None

class CreatePropertyRequest(BaseModel):
    address: str
    city: str
    district: str
    property_type: str  # apartment, house, commercial
    landlord_id: str
    monthly_rent: float
    description: Optional[str] = None
    status: Optional[Literal["vacant", "occupied", "maintenance"]] = "vacant"
    dues_amount: Optional[float] = None
    rent_day: Optional[int] = None
    dues_day: Optional[int] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contract_duration: Optional[int] = None
    tenant_id: Optional[str] = None
    employee_id: Optional[str] = None
    is_furnished: Optional[bool] = None
    amenities: Optional[dict] = None
    area: Optional[int] = None
    heating: Optional[str] = None
    deposit_amount: Optional[float] = None
    deposit_currency: Optional[Literal["TRY", "USD", "EUR"]] = None
    images: Optional[List[str]] = None

class AssignTenantRequest(BaseModel):
    property_id: str
    tenant_id: str

class UploadReceiptRequest(BaseModel):
    property_id: str
    receipt_type: Literal["rent", "dues", "other"]
    amount: float
    month: str  # Format: YYYY-MM
    document_url: Optional[str] = None
    storage_path: Optional[str] = None
    notes: Optional[str] = None
    replaces_receipt_id: Optional[str] = None

class ReviewReceiptRequest(BaseModel):
    action: Literal["approve", "reject"]
    notes: Optional[str] = None


class WithdrawReceiptRequest(BaseModel):
    reason: Optional[str] = None


class RevokeReceiptReviewRequest(BaseModel):
    reason: str

class CreateMaintenanceRequest(BaseModel):
    property_id: str
    title: str
    description: str
    photo_urls: List[str] = []
    priority: Literal["low", "medium", "high"] = "medium"

class MaintenanceTransitionRequest(BaseModel):
    action: Literal["start", "reject", "complete", "reopen"]
    note: Optional[str] = None
    photo_urls: List[str] = []


class TenantMaintenanceReviewRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: Optional[str] = None


class MaintenanceLogRequest(BaseModel):
    note: Optional[str] = None
    photo_urls: List[str] = []


class LandlordMaintenanceNoteRequest(BaseModel):
    note: str


class AssignTechnicianRequest(BaseModel):
    technician_id: str


class CreateOfficeContactRequest(BaseModel):
    full_name: str
    phone: str
    profession: str
    email: Optional[str] = None


class UpdateOfficeContactRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profession: Optional[str] = None
    email: Optional[str] = None


class CreateTeamTaskRequest(BaseModel):
    assignee_id: Optional[str] = None
    task_type: Literal[
        "property_showing",
        "office_meeting",
        "client_meeting",
        "document_delivery",
        "site_visit",
    ]
    title: str
    description: Optional[str] = None
    property_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    scheduled_at: str
    repeat_enabled: bool = False


class UpdateTeamTaskRequest(BaseModel):
    assignee_id: Optional[str] = None
    task_type: Optional[Literal[
        "property_showing",
        "office_meeting",
        "client_meeting",
        "document_delivery",
        "site_visit",
    ]] = None
    title: Optional[str] = None
    description: Optional[str] = None
    property_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    scheduled_at: Optional[str] = None
    repeat_enabled: Optional[bool] = None


class TeamTaskTransitionRequest(BaseModel):
    action: Literal["start", "complete", "cancel"]
    note: Optional[str] = None
    photo_urls: List[str] = []


class CreateAnnouncementRequest(BaseModel):
    title: str
    body: str
    send_to_all: bool = True
    recipient_ids: List[str] = []
    attachment_path: Optional[str] = None
    attachment_kind: Optional[Literal["image", "document", "file"]] = None


class TeamMessageAttachmentInput(BaseModel):
    bucket: Literal["team-message-files"]
    storage_path: str
    file_name: str
    mime_type: str
    size_bytes: Optional[int] = None
    kind: Literal["image", "document", "file"]


class CreateTeamMessageRequest(BaseModel):
    body: str = ""
    reply_to_id: Optional[str] = None
    attachments: List[TeamMessageAttachmentInput] = []


class CreateTeamMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: str
    notes: Optional[str] = None


class UpdateTeamMeetingRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[str] = None
    notes: Optional[str] = None


EXPENSE_CATEGORIES = Literal["kira", "fatura", "ulasim", "yemek", "malzeme", "diger"]


class CreateExpenseRequest(BaseModel):
    amount: float
    category: EXPENSE_CATEGORIES
    description: Optional[str] = None
    expense_date: str
    receipt_url: Optional[str] = None


class UpdateExpenseRequest(BaseModel):
    description: Optional[str] = None
    expense_date: Optional[str] = None
    receipt_url: Optional[str] = None


class CreateAgencyRequest(BaseModel):
    entity_type: Literal["office", "company"] = "office"
    name: str
    location: str
    district: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    active_regions: List[str] = []
    subscription_plan: Literal["free", "basic", "premium"] = "basic"
    max_properties: int = 20
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["active", "suspended", "inactive"] = "active"
    agent_password: Optional[str] = None


class UpdateAgencyRequest(BaseModel):
    entity_type: Optional[Literal["office", "company"]] = None
    name: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    active_regions: Optional[List[str]] = None
    subscription_plan: Optional[Literal["free", "basic", "premium"]] = None
    max_properties: Optional[int] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[Literal["active", "suspended", "inactive"]] = None


class CreateStandaloneAgentRequest(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    city: str
    district: str
    avatar_url: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None


class UpdateAdminAgentRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    agency_id: Optional[str] = None
    avatar_url: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None


class AdminCampaignPayload(BaseModel):
    type: Literal["inline_ad", "news", "testimonial", "service", "interstitial"]
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: int = 0
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    client_name: Optional[str] = None
    client_avatar: Optional[str] = None
    client_rating: Optional[float] = None
    client_title: Optional[str] = None
    client_company: Optional[str] = None
    service_icon: Optional[str] = None
    daily_frequency: Optional[int] = None
    lock_duration: Optional[int] = None
    modal_width_pct: Optional[int] = None
    image_height_pct: Optional[int] = None
    start_hour: Optional[int] = None
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    company_logo: Optional[str] = None
    company_banner: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    contact_website: Optional[str] = None
    target_roles: List[str] = []
    target_provinces: Optional[List[str]] = None
    target_districts: Optional[List[str]] = None
    target_agency_ids: Optional[List[str]] = None


class AdminCampaignUpdatePayload(BaseModel):
    type: Optional[Literal["inline_ad", "news", "testimonial", "service", "interstitial"]] = None
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    client_name: Optional[str] = None
    client_avatar: Optional[str] = None
    client_rating: Optional[float] = None
    client_title: Optional[str] = None
    client_company: Optional[str] = None
    service_icon: Optional[str] = None
    daily_frequency: Optional[int] = None
    lock_duration: Optional[int] = None
    modal_width_pct: Optional[int] = None
    image_height_pct: Optional[int] = None
    start_hour: Optional[int] = None
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    company_logo: Optional[str] = None
    company_banner: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    contact_website: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_provinces: Optional[List[str]] = None
    target_districts: Optional[List[str]] = None
    target_agency_ids: Optional[List[str]] = None


class CampaignEventRequest(BaseModel):
    event_type: Literal["click", "link_open"]
    placement: Optional[str] = None
    metadata: Optional[dict] = None


class AdminToggleActiveRequest(BaseModel):
    active: bool
