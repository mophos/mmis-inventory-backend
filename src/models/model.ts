export interface ILabeler {
  labelerId?: string;
  labelerName?: string;
  labelerDescription?: string;
  labelerNin?: string;
  labelerTypeId?: string;
  labelerStatusId?: string;
  labelerDisableDate?: string;
  labelerAddress?: string;
  labelerTambon?: string;
  labelerAmpur?: string;
  labelerProvince?: string;
  labelerZipCode?: string;
  labelerPhone?: string;
  labelerUrl?: string;
}

export interface IOrganization {
  orgNo?: string;
  orgYearRegister?: string;
  orgYearEstablished?: string;
  orgCountry?: string;
  orgFADNumber?: string;
  orgLatitude?: number;
  orgLongitude?: number;
}

export interface ILabelerStructure {
  labeler_id?: string;
  labeler_name?: string;
  description?: string;
  nin?: string;
  labeler_type?: string;
  labeler_status?: string;
  disable_date?: string;
  address?: string;
  tambon_code?: string;
  ampur_code?: string;
  province_code?: string;
  zipcode?: string;
  phone?: string;
  url?: string;
  request_date?: string
}

export interface IOrganizationStructure {
  labeler_id?: string;
  org_no?: string;
  year_register?: string;
  year_established?: string;
  country_code?: string;
  fda_no?: string;
  latitude?: number;
  longitude?: number;
}

export interface IReceiveSummaryFields {
  receive_id?: any;
  warehouse_id: any;
  receive_date: any;
  delivery_code: any;
  delivery_date: any;
  labeler_id: any;
  receive_type_id: any;
  receive_status_id: any;
  total_price?: number;
  total_cost: number;
  receive_qty: number;
  receive_code?: any;
  purchase_id?: any;
  purchase_type_id?: any;
  contact_id?: any;
  approve_id?: any;
}

export interface IReceiveSummaryParams {
  deliveryCode: any;
  deliveryDate: any;
  receiveDate: any;
  labelerId: any;
  receiveTypeId: any;
  receiveStatusId: any;
  totalCost: number;
  totalPrice: number;
  receiveQty: number;
  warehouseId: number;
}

export interface IReceiveDetailFields {
  receive_detail_id?: any;
  receive_id: any;
  warehouse_id: any;
  product_id: any;
  package_id: any;
  expired_date: any;
  lot_id?: any;
  receive_qty: any;
  total_cost: number;
  people_id?: any;
  location_id?: any;
}

export interface IReceiveDetailParams {
  receiveDetailId?: number;
  receiveId: any;
  productId: any;
  packageId: any;
  expiredDate: any;
  lotNo?: any;
  receiveQty: any;
  largeCost: number;
  peopleId?: any;
  locationId: any;
}


export interface ICheckSummaryParams {
  receiveId?: string;
  checkId?: string;
  checkDate?: any;
  peopleId?: any;
  warehouseId?: any;
  comment?: any;
}

export interface ICheckSummaryFields {
  receive_id?: string;
  check_id?: string;
  check_date?: any;
  people_id?: any;
  warehouse_id?: any;
  comment?: any;
}

export interface ICheckProductParams {
  isFree?: any;
  checkId?: any;
  packageId?: any;
  cost?: number;
  qty?: number;
  productId?: any;
  expiredDate?: any;
  lotNo?: any;
}

export interface ICheckProductFields {
  is_free?: any;
  package_id?: any;
  cost?: number;
  qty?: number;
  product_id?: any;
  expired_date?: any;
  lot_no?: any;
  check_id?: any;
}

export interface IWMProductsFields {
  id?: any;
  warehouse_id: any;
  requisition_warehouse_id?: any;
  product_id: any;
  generic_id?: any;
  qty: number;
  price?: number;
  cost?: number;
  product_price_id?: any;
  expired_date: any;
  lot_no: any;
  location_id: any;
  labeler_id: any;
  receive_id?: any;
  requisition_id?: any;
  unit_generic_id?: any;
  conversion_qty?: any;
}

export interface IRequisitionSummaryParams {
requisitionID: any;
requisitionDate: any;
receiveId: any;
wmRequisition: any;
wmWithdraw: any;
requisitionTypeID: any;
costAmt: any;
documentType: any;
}

export interface IRquisitiondetailParams {
  requisitionDetailId?: number;
  resuisitionId: any;
  productId: any;
  packageId: any;
  expiredDate: any;
  lotNo?: any;
  receiveQty: any;
  largeCost: number;
  peopleId?: any;
  locationId: any;
}

export interface IConfirmSummaryParams {
  receiveId?: string;
  requisitionId?: string;
  checkId?: string;
  checkDate?: any;
  confirmDate?: any;
  peopleId?: any;
  warehouseId?: any;
  comment?: any;
}

export interface IConfirmSummaryFields {
  receive_id?: string;
  check_id?: string;
  check_date?: any;
  confirm_date?:any;
  people_id?: any;
  warehouse_id?: any;
  comment?: any;
  requisition_id?: string;
}

export interface IConfirmProductParams {
  isFree?: any;
  checkId?: any;
  packageId?: any;
  cost?: number;
  qty?: number;
  requisition_qty?: number;
  productId?: any;
  expiredDate?: any;
  lotId?: any;
  lotNo?: any;
}

export interface IConfirmProductFields {
  is_free?: any;
  package_id?: any;
  cost?: number;
  qty?: number;
  requisition_qty?: number;
  product_id?: any;
  expired_date?: any;
  lot_id?: any;
  lot_no?: any;
  check_id?: any;
}
