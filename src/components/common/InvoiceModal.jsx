import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Download,
  Printer,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Truck,
  MapPin,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import {
  getOrderInvoicesApi,
  getInvoiceDetailsApi,
  downloadInvoicePdfApi,
} from '../../services/api'

export default function InvoiceModal({
  isOpen,
  onClose,
  invoice: initialInvoice = null,
  orderId = null,
  currentUser = null,
}) {
  const [invoice, setInvoice] = useState(initialInvoice)
  const [allInvoices, setAllInvoices] = useState([])
  const [selectedInvoiceIdx, setSelectedInvoiceIdx] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialInvoice)
  const [errorMsg, setErrorMsg] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const printContainerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    if (initialInvoice) {
      setInvoice(initialInvoice)
      setAllInvoices([initialInvoice])
      setIsLoading(false)
      setErrorMsg(null)
      return
    }

    if (!orderId) {
      setErrorMsg('No order selected for invoice generation.')
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setErrorMsg(null)

    async function loadInvoice() {
      try {
        const userId = currentUser?.id || currentUser?.user_id
        const res = await getOrderInvoicesApi(orderId, userId)

        if (!isMounted) return

        if (res && res.invoices && res.invoices.length > 0) {
          setAllInvoices(res.invoices)
          setInvoice(res.invoices[0])
          setSelectedInvoiceIdx(0)
        } else if (res && res.status === 'INVOICE_UNAVAILABLE') {
          setErrorMsg(res.message || 'Invoice is not available yet.')
        } else {
          setErrorMsg('Invoice is not available yet. Invoices are issued after order placement or payment confirmation.')
        }
      } catch (err) {
        if (!isMounted) return
        setErrorMsg('Unable to generate invoice. Please try again.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadInvoice()

    return () => {
      isMounted = false
    }
  }, [isOpen, initialInvoice, orderId, currentUser])

  if (!isOpen) return null

  const handleDownload = async () => {
    if (!invoice?.id) return
    setIsDownloading(true)
    try {
      const userId = currentUser?.id || currentUser?.user_id
      const sanitizedNum = (invoice.invoice_number || `INV_${invoice.id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
      await downloadInvoicePdfApi(invoice.id, userId, `BESPOKE_INV_${sanitizedNum}.pdf`)
    } catch (err) {
      alert(err.message || 'Failed to download invoice PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Parse snapshots safely
  const shipFrom = typeof invoice?.shipping_from_snapshot === 'string'
    ? JSON.parse(invoice.shipping_from_snapshot || '{}')
    : (invoice?.shipping_from_snapshot || {})

  const delTo = typeof invoice?.delivered_to_snapshot === 'string'
    ? JSON.parse(invoice.delivered_to_snapshot || '{}')
    : (invoice?.delivered_to_snapshot || {})

  const billTo = typeof invoice?.billing_address_snapshot === 'string'
    ? JSON.parse(invoice.billing_address_snapshot || '{}')
    : (invoice?.billing_address_snapshot || delTo)

  const formattedDate = invoice?.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bespoke-printable-invoice, #bespoke-printable-invoice * {
            visibility: visible;
          }
          #bespoke-printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-neutral-100 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-[#C00078]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-neutral-900 tracking-tight flex items-center gap-2">
                <span>Tax Invoice Preview</span>
                {invoice?.invoice_number && (
                  <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {invoice.invoice_number}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-neutral-400">
                Official GST-compliant order documentation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allInvoices.length > 1 && (
              <select
                value={selectedInvoiceIdx}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10)
                  setSelectedInvoiceIdx(idx)
                  setInvoice(allInvoices[idx])
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#C00078] outline-none"
              >
                {allInvoices.map((inv, idx) => (
                  <option key={inv.id || idx} value={idx}>
                    Seller: {inv.seller_shop_name_snapshot || inv.seller_name_snapshot || `Seller #${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {invoice && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Print this invoice"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#C00078] to-pink-600 hover:from-[#a00064] hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Download official PDF"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center bg-neutral-200/50">
          {isLoading ? (
            <div className="w-full max-w-3xl bg-white rounded-2xl p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <Loader2 className="w-8 h-8 text-[#C00078] animate-spin" />
              <p className="text-xs font-bold text-neutral-600">
                Compiling invoice data & calculating GST snapshots...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[300px] space-y-3 my-auto">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Notice</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-5 py-2 btn-theme text-xs font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : invoice ? (
            /* A4 Document Container */
            <div
              id="bespoke-printable-invoice"
              ref={printContainerRef}
              className="w-full max-w-3xl bg-white rounded-xl shadow-md p-6 sm:p-8 text-neutral-900 font-sans border border-neutral-200 print:border-none print:shadow-none"
            >
              {/* Top Accent Strip */}
              <div className="w-full h-1 bg-[#C00078] rounded-full mb-4" />

              {/* Header: Brand & Document Title */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-[#C00078]">
                      BESPOKE
                    </span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-2 border-l border-neutral-200">
                      Atelier
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Curated Multi-Vendor Luxury Marketplace & Bespoke Tailoring
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-3 py-1 bg-pink-50 text-[#C00078] border border-pink-200 rounded-lg text-xs font-black uppercase tracking-wider">
                    {invoice.document_title || (invoice.seller_gstin_snapshot ? 'TAX INVOICE' : 'BILL OF SUPPLY')}
                  </span>
                  <div className="text-[11px] text-neutral-500 font-medium mt-1">
                    Original for Recipient
                  </div>
                </div>
              </div>

              {/* Invoice Meta Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF6F9] border border-[#E8DFE6] rounded-xl p-3 my-4 text-[11px]">
                <div>
                  <span className="text-neutral-400 font-bold block text-[9px] uppercase">
                    Invoice Number
                  </span>
                  <span className="font-extrabold text-neutral-900">
                    {invoice.invoice_number}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block text-[9px] uppercase">
                    Invoice Date
                  </span>
                  <span className="font-bold text-neutral-900">
                    {formattedDate}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block text-[9px] uppercase">
                    Place of Supply
                  </span>
                  <span className="font-bold text-neutral-900">
                    {invoice.place_of_supply || 'Tamil Nadu'} ({invoice.seller_state_code_snapshot || '33'})
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block text-[9px] uppercase">
                    Financial Year
                  </span>
                  <span className="font-bold text-neutral-900">
                    {invoice.financial_year || '2026-27'}
                  </span>
                </div>
              </div>

              {/* Address Columns (3-Box Layout): Seller | Shipping From | Delivered To */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                {/* 1. Seller Details */}
                <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/50 flex flex-col justify-between text-[11px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#C00078] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Sold By (Seller)</span>
                    </div>
                    <div className="font-bold text-neutral-900">
                      {invoice.seller_name_snapshot}
                    </div>
                    {invoice.seller_shop_name_snapshot && (
                      <div className="text-neutral-500 italic text-[10px]">
                        {invoice.seller_shop_name_snapshot}
                      </div>
                    )}
                    <div className="text-neutral-600 mt-1 space-y-0.5">
                      <div>GSTIN: <span className="font-mono font-bold text-neutral-800">{invoice.seller_gstin_snapshot || 'N/A'}</span></div>
                      {invoice.seller_pan_snapshot && <div>PAN: {invoice.seller_pan_snapshot}</div>}
                      {invoice.seller_state_snapshot && (
                        <div>State: {invoice.seller_state_snapshot} ({invoice.seller_state_code_snapshot || '33'})</div>
                      )}
                    </div>
                  </div>
                  {(invoice.seller_email_snapshot || invoice.seller_phone_snapshot) && (
                    <div className="text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-200/60">
                      {invoice.seller_email_snapshot && <div>{invoice.seller_email_snapshot}</div>}
                      {invoice.seller_phone_snapshot && <div>Ph: {invoice.seller_phone_snapshot}</div>}
                    </div>
                  )}
                </div>

                {/* 2. Shipping From Address */}
                <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/50 flex flex-col justify-between text-[11px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#C00078] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Shipping From (Dispatch)</span>
                    </div>
                    <div className="font-bold text-neutral-900">
                      {shipFrom.business_name || shipFrom.name || invoice.seller_name_snapshot}
                    </div>
                    <p className="text-neutral-600 mt-1 leading-relaxed">
                      {[
                        shipFrom.street || shipFrom.address,
                        shipFrom.area,
                        shipFrom.city,
                        shipFrom.state ? `${shipFrom.state}${shipFrom.pincode ? ` - ${shipFrom.pincode}` : ''}` : shipFrom.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Atelier Workshop Dispatch Center'}
                    </p>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-200/60">
                    Contact: {shipFrom.phone || invoice.seller_phone_snapshot || 'On file'}
                  </div>
                </div>

                {/* 3. Delivered To (Shipping Destination) */}
                <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/50 flex flex-col justify-between text-[11px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#C00078] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Delivered To</span>
                    </div>
                    <div className="font-bold text-neutral-900">
                      {invoice.customer_name_snapshot || delTo.name}
                    </div>
                    <p className="text-neutral-600 mt-1 leading-relaxed">
                      {[
                        delTo.house_building_name,
                        delTo.area_colony,
                        delTo.landmark_nearby,
                        delTo.city,
                        delTo.state ? `${delTo.state}${delTo.pincode ? ` - ${delTo.pincode}` : ''}` : delTo.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Delivery Address on file'}
                    </p>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-200/60">
                    Customer Phone: {delTo.phone || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Order & Payment Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 my-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#C00078]" />
                  <span>Order Ref: <strong className="text-neutral-900">#{invoice.order_id}</strong></span>
                  <span className="text-neutral-300">•</span>
                  <span>Payment: <strong className="text-neutral-900">{invoice.payment_method || 'Online'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-[11px]">
                    Txn: {invoice.payment_id || invoice.payment_transaction_id || 'Verified'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{invoice.payment_status || 'PAID'}</span>
                  </span>
                </div>
              </div>

              {/* Product Details Table */}
              <div className="my-4 overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF5F9] text-[#C00078] font-bold text-[10px] uppercase border-b border-neutral-200">
                      <th className="py-2.5 px-3 text-center w-10">S.No</th>
                      <th className="py-2.5 px-3">Product Name & HSN</th>
                      <th className="py-2.5 px-3">Variant / Spec</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-center">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(invoice.items || []).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-neutral-900">
                            {item.product_name_snapshot}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            HSN: {item.hsn_code || '6204'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-neutral-600">
                          {item.variant_snapshot || 'Standard'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-neutral-800">
                          {item.quantity || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-700">
                          ₹{Number(item.unit_price || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                          {Number(item.discount_amount || 0) > 0 ? `-₹${Number(item.discount_amount).toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-800 font-medium">
                          ₹{Number(item.taxable_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-600">
                          {Number(item.gst_rate || 0).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#C00078]">
                          ₹{Number(item.total_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price & Tax Breakdown Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 pt-2">
                {/* Left Column: Terms & Amount in Words */}
                <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/40 text-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#C00078] uppercase tracking-wider block mb-1">
                      Terms & Conditions
                    </span>
                    <ul className="text-[10px] text-neutral-500 space-y-1 list-disc pl-3.5 leading-relaxed">
                      <li>Artisan bespoke pieces are covered under 14-day doorstep fitting & return warranty.</li>
                      <li>In case of cancellations or returns, credit notes are recorded in compliance with GST law.</li>
                      <li>This is a digitally generated invoice requiring no physical signature.</li>
                    </ul>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center gap-2 text-[10px] text-neutral-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C00078]" />
                    <span>Digitally verified by Bespoke Atelier Authentication Engine</span>
                  </div>
                </div>

                {/* Right Column: Mathematical Price Breakdown */}
                <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Items Subtotal:</span>
                    <span className="font-medium text-neutral-900">₹{Number(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>

                  {Number(invoice.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Item Discounts:</span>
                      <span>-₹{Number(invoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}

                  {Number(invoice.coupon_discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Coupon Discount:</span>
                      <span>-₹{Number(invoice.coupon_discount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-neutral-800 pt-1 border-t border-neutral-100">
                    <span>Net Taxable Value:</span>
                    <span>₹{Number(invoice.taxable_amount || 0).toFixed(2)}</span>
                  </div>

                  {Number(invoice.cgst_amount || 0) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-[11px]">
                      <span>CGST (Central Tax):</span>
                      <span>₹{Number(invoice.cgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.sgst_amount || 0) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-[11px]">
                      <span>SGST (State Tax):</span>
                      <span>₹{Number(invoice.sgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.igst_amount || 0) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-[11px]">
                      <span>IGST (Integrated Tax):</span>
                      <span>₹{Number(invoice.igst_amount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-600">
                    <span>Delivery & Shipping:</span>
                    <span className="text-neutral-900 font-medium">
                      {Number(invoice.shipping_amount || 0) > 0 ? `₹${Number(invoice.shipping_amount).toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-200 mt-2">
                    <span className="text-xs font-black uppercase text-neutral-900">Grand Total</span>
                    <span className="text-base font-black text-[#C00078]">
                      ₹{Number(invoice.grand_total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="pt-4 mt-4 border-t border-neutral-100 text-center text-[10px] text-neutral-400">
                Subject to Chennai Jurisdiction • For billing queries, contact support@bespokeatelier.com
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

