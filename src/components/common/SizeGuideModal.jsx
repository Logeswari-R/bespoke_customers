import React, { useState } from 'react'
import { Ruler, X, Info } from 'lucide-react'

export default function SizeGuideModal({ isOpen, onClose }) {
  const [unit, setUnit] = useState('inches') // 'inches' or 'cm'

  if (!isOpen) return null

  // Chart values in inches
  const chartDataInches = [
    { size: 'XS', bust: '32 - 33', waist: '26 - 27', hip: '35 - 36', length: '42' },
    { size: 'S', bust: '34 - 35', waist: '28 - 29', hip: '37 - 38', length: '43' },
    { size: 'M', bust: '36 - 37', waist: '30 - 31', hip: '39 - 40', length: '44' },
    { size: 'L', bust: '38 - 39', waist: '32 - 33', hip: '41 - 42', length: '45' },
    { size: 'XL', bust: '40 - 41', waist: '34 - 35', hip: '43 - 44', length: '45' },
    { size: 'XXL', bust: '42 - 44', waist: '36 - 38', hip: '45 - 47', length: '46' },
    { size: '3XL', bust: '45 - 47', waist: '39 - 41', hip: '48 - 50', length: '46' },
  ]

  // Convert to cm (approx 1 inch = 2.54 cm)
  const chartDataCm = [
    { size: 'XS', bust: '81 - 84', waist: '66 - 69', hip: '89 - 91', length: '107' },
    { size: 'S', bust: '86 - 89', waist: '71 - 74', hip: '94 - 97', length: '109' },
    { size: 'M', bust: '91 - 94', waist: '76 - 79', hip: '99 - 102', length: '112' },
    { size: 'L', bust: '97 - 99', waist: '81 - 84', hip: '104 - 107', length: '114' },
    { size: 'XL', bust: '102 - 104', waist: '86 - 89', hip: '109 - 112', length: '114' },
    { size: 'XXL', bust: '107 - 112', waist: '91 - 97', hip: '114 - 119', length: '117' },
    { size: '3XL', bust: '114 - 119', waist: '99 - 104', hip: '122 - 127', length: '117' },
  ]

  const activeData = unit === 'inches' ? chartDataInches : chartDataCm

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-neutral-100 my-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[var(--theme-primary)]" />
            <h3 className="text-base font-bold text-neutral-900">
              Bespoke Atelier Size Guide
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inches / CM Toggle */}
        <div className="flex items-center justify-between mb-4 bg-neutral-100 p-1 rounded-xl">
          <span className="text-[11px] font-bold text-neutral-500 pl-2">Measurement Unit:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setUnit('inches')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unit === 'inches' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Inches (in)
            </button>
            <button
              type="button"
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unit === 'cm' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Centimeters (cm)
            </button>
          </div>
        </div>

        {/* Size Chart Table */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Bust / Chest</th>
                <th className="py-2.5 px-3">Waist</th>
                <th className="py-2.5 px-3">Hips</th>
                <th className="py-2.5 px-3">Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {activeData.map((row) => (
                <tr key={row.size} className="hover:bg-pink-50/20 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-[var(--theme-primary)]">
                    {row.size}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-700">{row.bust}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{row.waist}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{row.hip}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tailor Tip */}
        <div className="mt-4 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/70 flex items-start gap-2.5 text-xs text-neutral-600">
          <Info className="w-4 h-4 text-[var(--theme-primary)] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <span className="font-bold text-neutral-900">Between Sizes?</span> If your measurements fall between two sizes, we recommend selecting the larger size, or choosing <span className="font-bold text-[var(--theme-primary)]">Doorstep Alteration</span> during checkout for an artisan tailor fit.
          </p>
        </div>
      </div>
    </div>
  )
}

