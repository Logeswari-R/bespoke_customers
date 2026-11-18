import React, { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Download,
  Eye,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { getCustomerInvoicesApi, downloadInvoicePdfApi } from '../../services/api'
import InvoiceModal from '../common/InvoiceModal'

export default function InvoicesPage({
  currentUser,
  onBack,
  onNavigate,
}) {
  const [invoices, setInvoices] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const fetchInvoices = async (page = 1) => {
    const userId = currentUser?.id || currentUser?.user_id
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await getCustomerInvoicesApi({
        userId,
        page,
        limit: 15,
        search: searchQuery,
        fromDate,
        toDate,
      })

      if (res?.status && res.data) {
        setInvoices(res.data.invoices || [])
        setTotalCount(res.data.total || 0)
        setCurrentPage(res.data.page || 1)
        setTotalPages(res.data.totalPages || 1)
      } else {
        setInvoices([])
        setTotalCount(0)
      }
    } catch (err) {
      console.warn('Failed to fetch customer invoices:', err)
      setInvoices([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices(1)
  }, [currentUser?.id, currentUser?.user_id])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchInvoices(1)
  }

  const handleDownload = async (inv) => {
    setDownloadingId(inv.id)
    try {
      const userId = currentUser?.id || currentUser?.user_id
      const sanitizedNum = (inv.invoice_number || `INV_${inv.id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
      await downloadInvoicePdfApi(inv.id, userId, `BESPOKE_INV_${sanitizedNum}.pdf`)
    } catch (err) {
      alert(err.message || 'Failed to download invoice PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 bg-white hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer text-neutral-600"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#24212A] tracking-normal flex items-center gap-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#C00078]" />
                <span>My Invoices & Receipts</span>
              </h1>
              <p className="text-[13px] text-[#77717C] font-normal mt-0.5">
                Official GST tax invoices and bills of supply for your purchases
              </p>
            </div>
          </div>

          {/* Search & Date Filter Form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:border-[#C00078] outline-none text-neutral-800 placeholder-neutral-400 shadow-2xs font-medium"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#C00078] to-pink-600 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-neutral-200 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#C00078] animate-spin" />
            <span className="text-xs font-bold text-neutral-500">
              Loading your invoices...
            </span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-neutral-200 shadow-xs text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-[#C00078]">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900">No invoices available</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Invoices are generated automatically as soon as an order is placed or payment is confirmed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50/80 text-neutral-500 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-200">
                      <th className="py-3 px-4 sm:px-6">Invoice #</th>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Seller / Workshop</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {invoices.map((inv) => {
                      const dateStr = inv.invoice_date
                        ? new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recently'

                      return (
                        <tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-neutral-900">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-neutral-600">
                            #{inv.order_id}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-500 font-medium">
                            {dateStr}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-neutral-900">
                              {inv.seller_name_snapshot}
                            </div>
                            {inv.seller_shop_name_snapshot && (
                              <div className="text-[10px] text-neutral-400">
                                {inv.seller_shop_name_snapshot}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#24212A] tabular-nums">
                            ₹{Number(inv.grand_total || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{inv.payment_status || 'PAID'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(inv)}
                                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                                title="View invoice preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={downloadingId === inv.id}
                                onClick={() => handleDownload(inv)}
                                className="px-2.5 py-1.5 bg-[#C00078]/10 hover:bg-[#C00078]/20 text-[#C00078] rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Download PDF"
                              >
                                {downloadingId === inv.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-3.5 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
                  <span>
                    Showing page {currentPage} of {totalPages} ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => fetchInvoices(currentPage - 1)}
                      className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => fetchInvoices(currentPage + 1)}
                      className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

