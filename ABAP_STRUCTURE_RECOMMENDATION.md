# ABAP Table Structure Recommendation

**Based on:** `0b5d6266a6fcf026d6470e433a1dccb79bfa61eb2c804f7ff9ce4382a30395d1.json`  
**SAP S/4HANA Best Practices** • **xco_cp_json** • GST E-Invoice (NIC)

---

## 1. JSON Structure Overview

The uploaded JSON has two layers:

| Layer | Description |
|-------|-------------|
| **Top-level (Acknowledgment)** | AckNo, AckDt, Irn, SignedInvoice, SignedQRCode, Status, EwbNo, EwbDt, EwbValidTill, Remarks |
| **Invoice payload (inside JWT)** | Version, TranDtls, DocDtls, SellerDtls, BuyerDtls, ItemList, ValDtls, PayDtls, ExpDtls |

---

## 2. Recommended ABAP Table Structures

### 2.1 Top-Level: NIC Acknowledgment Response

```abap
TYPES: BEGIN OF ty_nic_ack_response,
         ack_no         TYPE string,
         ack_dt         TYPE string,
         irn            TYPE string,
         signed_invoice TYPE string,
         signed_qr_code TYPE string,
         status         TYPE string,
         ewb_no         TYPE string,
         ewb_dt         TYPE string,
         ewb_valid_till TYPE string,
         remarks        TYPE string,
       END OF ty_nic_ack_response.
```

### 2.2 Invoice Payload (Decoded from JWT)

#### TranDtls
```abap
TYPES: BEGIN OF ty_trandtls,
         tax_sch        TYPE string,
         suptyp         TYPE string,
         reg_rev        TYPE string,
         igst_on_intra  TYPE string,
       END OF ty_trandtls.
```

#### DocDtls
```abap
TYPES: BEGIN OF ty_docdtls,
         typ            TYPE string,
         no             TYPE string,
         dt             TYPE string,
       END OF ty_docdtls.
```

#### SellerDtls
```abap
TYPES: BEGIN OF ty_sellerdtls,
         gstin          TYPE string,
         lgl_nm         TYPE string,
         trd_nm         TYPE string,
         addr1          TYPE string,
         addr2          TYPE string,
         loc            TYPE string,
         pin            TYPE string,
         stcd           TYPE string,
       END OF ty_sellerdtls.
```

#### BuyerDtls
```abap
TYPES: BEGIN OF ty_buyerdtls,
         gstin          TYPE string,
         lgl_nm         TYPE string,
         trd_nm         TYPE string,
         pos            TYPE string,
         addr1          TYPE string,
         addr2          TYPE string,
         loc            TYPE string,
         pin            TYPE string,
         ph             TYPE string,
         stcd           TYPE string,
       END OF ty_buyerdtls.
```

#### ItemList (Line Items)
```abap
TYPES: BEGIN OF ty_item,
         item_no        TYPE i,
         sl_no          TYPE string,
         is_servc       TYPE string,
         hsn_cd         TYPE string,
         qty            TYPE decfloat16,
         free_qty       TYPE decfloat16,
         unit           TYPE string,
         unit_price     TYPE decfloat16,
         tot_amt        TYPE decfloat16,
         discount       TYPE decfloat16,
         pre_tax_val    TYPE decfloat16,
         ass_amt        TYPE decfloat16,
         gst_rt         TYPE decfloat16,
         igst_amt       TYPE decfloat16,
         cgst_amt       TYPE decfloat16,
         sgst_amt       TYPE decfloat16,
         ces_rt         TYPE decfloat16,
         ces_amt        TYPE decfloat16,
         ces_non_advl_amt TYPE decfloat16,
         state_ces_rt   TYPE decfloat16,
         state_ces_amt  TYPE decfloat16,
         state_ces_non_advl_amt TYPE decfloat16,
         oth_chrg       TYPE decfloat16,
         tot_item_val   TYPE decfloat16,
       END OF ty_item.

TYPES: ty_item_tab TYPE STANDARD TABLE OF ty_item WITH DEFAULT KEY.
```

#### ValDtls
```abap
TYPES: BEGIN OF ty_valdtls,
         ass_val        TYPE decfloat16,
         cgst_val       TYPE decfloat16,
         sgst_val       TYPE decfloat16,
         igst_val       TYPE decfloat16,
         ces_val        TYPE decfloat16,
         st_ces_val     TYPE decfloat16,
         discount       TYPE decfloat16,
         oth_chrg       TYPE decfloat16,
         rnd_off_amt    TYPE decfloat16,
         tot_inv_val    TYPE decfloat16,
         tot_inv_val_fc TYPE decfloat16,
       END OF ty_valdtls.
```

#### PayDtls
```abap
TYPES: BEGIN OF ty_paydtls,
         paid_amt       TYPE decfloat16,
         paymt_due      TYPE decfloat16,
       END OF ty_paydtls.
```

#### ExpDtls
```abap
TYPES: BEGIN OF ty_expdtls,
         ref_clm        TYPE string,
       END OF ty_expdtls.
```

### 2.3 Root Invoice Payload

```abap
TYPES: BEGIN OF ty_invoice_payload,
         version        TYPE string,
         tran_dtls      TYPE ty_trandtls,
         doc_dtls       TYPE ty_docdtls,
         seller_dtls    TYPE ty_sellerdtls,
         buyer_dtls     TYPE ty_buyerdtls,
         item_list      TYPE ty_item_tab,
         val_dtls       TYPE ty_valdtls,
         pay_dtls       TYPE ty_paydtls,
         exp_dtls       TYPE ty_expdtls,
       END OF ty_invoice_payload.
```

---

## 3. Type Mapping (SAP S/4HANA)

| JSON Type | ABAP Type | Notes |
|-----------|-----------|-------|
| string | `string` | Unicode, unbounded |
| number (integer) | `i` | 4-byte integer |
| number (decimal) | `decfloat16` | 16 decimal places, HANA-optimized |
| boolean | `abap_bool` | With `boolean_to_abap_bool` transformation |
| null | `string` | Fallback for optional fields |

---

## 4. Usage Notes

1. **JWT Decoding**: Extract the `data` payload from `SignedInvoice` JWT before deserializing to `ty_invoice_payload`.
2. **PascalCase**: Use `xco_cp_json=>transformation->pascal_case_to_underscore` for JSON keys like `TranDtls` → `tran_dtls`.
3. **ItemList**: Access as `ls_payload-item_list` for ALV display or further processing.
