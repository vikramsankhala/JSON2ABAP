*&---------------------------------------------------------------------*
*& Report Z_EINVOICE_JSON2ABAP
*&---------------------------------------------------------------------*
*& ABAP script for GST E-Invoice JSON deserialization
*& Based on: 0b5d6266a6fcf026d6470e433a1dccb79bfa61eb2c804f7ff9ce4382a30395d1.json
*& SAP S/4HANA Best Practices - xco_cp_json
*&---------------------------------------------------------------------*

*----------------------------------------------------------------------*
* TYPES - NIC Acknowledgment (Top-level response)
*----------------------------------------------------------------------*
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

*----------------------------------------------------------------------*
* TYPES - Invoice Payload (Decoded from SignedInvoice JWT)
*----------------------------------------------------------------------*
TYPES: BEGIN OF ty_trandtls,
         tax_sch        TYPE string,
         suptyp         TYPE string,
         reg_rev        TYPE string,
         igst_on_intra  TYPE string,
       END OF ty_trandtls.

TYPES: BEGIN OF ty_docdtls,
         typ            TYPE string,
         no             TYPE string,
         dt             TYPE string,
       END OF ty_docdtls.

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

TYPES: BEGIN OF ty_paydtls,
         paid_amt       TYPE decfloat16,
         paymt_due      TYPE decfloat16,
       END OF ty_paydtls.

TYPES: BEGIN OF ty_expdtls,
         ref_clm        TYPE string,
       END OF ty_expdtls.

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

*----------------------------------------------------------------------*
* DATA & DESERIALIZE - NIC Acknowledgment
*----------------------------------------------------------------------*
DATA: lv_json_ack    TYPE string,
      ls_nic_ack     TYPE ty_nic_ack_response.

" lv_json_ack = HTTP response body from NIC API

TRY.
    xco_cp_json=>data
      ->from_string( lv_json_ack )
      ->apply( VALUE #(
          ( xco_cp_json=>transformation->pascal_case_to_underscore )
          ( xco_cp_json=>transformation->boolean_to_abap_bool )
        ) )
      ->write_to( REF #( ls_nic_ack ) ).
  CATCH cx_root INTO DATA(lx_root).
    MESSAGE lx_root->get_text( ) TYPE 'E'.
ENDTRY.

*----------------------------------------------------------------------*
* DATA & DESERIALIZE - Invoice Payload (from JWT data)
*----------------------------------------------------------------------*
DATA: lv_json_invoice TYPE string,
      ls_invoice      TYPE ty_invoice_payload.

" Extract JSON from SignedInvoice JWT payload (decode base64, parse "data")
" lv_json_invoice = decoded "data" string from JWT

TRY.
    xco_cp_json=>data
      ->from_string( lv_json_invoice )
      ->apply( VALUE #(
          ( xco_cp_json=>transformation->pascal_case_to_underscore )
          ( xco_cp_json=>transformation->boolean_to_abap_bool )
        ) )
      ->write_to( REF #( ls_invoice ) ).
  CATCH cx_root INTO lx_root.
    MESSAGE lx_root->get_text( ) TYPE 'E'.
ENDTRY.

*----------------------------------------------------------------------*
* Access ItemList for ALV display
*----------------------------------------------------------------------*
DATA: lt_items TYPE ty_item_tab.

lt_items = ls_invoice-item_list.

cl_salv_table=>factory(
  IMPORTING
    r_salv_table = DATA(lo_alv)
  CHANGING
    t_table      = lt_items
).

lo_alv->display( ).
