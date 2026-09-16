'use client'

import { useState, useEffect } from 'react'
import { Recycle, Filter, CalendarDays, Printer, BarChart2, PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']


function EmptyState({ icon, text }: { icon?: React.ReactNode, text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-400">
        {icon || <Recycle className="size-6" />}
      </div>
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  )
}

export function LaporanPenyetoran() {
  const [range, setRange] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalWeightAll: 0, totalNabungAll: 0, totalSedekahAll: 0 })

  const fetchReport = async (rangeFilter: string) => {
    setLoading(true)
    let url = '/api/laporan/penyetoran'
    
    // Convert 'range' dropdown to precise start and end dates
    const params = new URLSearchParams()
    
    if (rangeFilter !== 'all') {
      const today = new Date()
      let dariDate = new Date()
      
      switch (rangeFilter) {
        case '1m':
          dariDate.setMonth(today.getMonth() - 1)
          break
        case '3m':
          dariDate.setMonth(today.getMonth() - 3)
          break
        case '6m':
          dariDate.setMonth(today.getMonth() - 6)
          break
        case '1y':
          dariDate.setFullYear(today.getFullYear() - 1)
          break
      }
      params.set('dari', dariDate.toISOString().split('T')[0])
      params.set('sampai', today.toISOString().split('T')[0])
    }

    if (params.toString()) {
      url += '?' + params.toString()
    }

    try {
      const res = await fetch(url)
      const result = await res.json()
      if (res.ok) {
        setData(result.data || [])
        setSummary(result.summary || { totalWeightAll: 0, totalNabungAll: 0, totalSedekahAll: 0 })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport(range)
  }, [range])

  const chartData = data.map(cat => ({
    name: cat.categoryName,
    Nabung: cat.totalNabung,
    Sedekah: cat.totalSedekah,
    Total: cat.totalWeight
  }))

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0 print:space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm print:hidden">
            <Recycle className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Laporan Penyetoran Sampah</h2>
            <p className="text-sm text-muted-foreground print:hidden">
              Laporan rekapitulasi jumlah volume/berat sampah masuk berdasarkan jenisnya.
            </p>
          </div>
        </div>
        
        <Button onClick={handlePrint} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card className="border-emerald-200 shadow-sm">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/30 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-emerald-900">Rekap Volume Sampah</CardTitle>
              <CardDescription className="flex gap-4 items-center">
                <span>Total: <strong className="text-emerald-700">{summary.totalWeightAll.toFixed(2)} kg</strong></span>
                <span className="text-emerald-600 border-l border-emerald-200 pl-4">Nabung: <strong>{summary.totalNabungAll.toFixed(2)} kg</strong></span>
                <span className="text-emerald-600 border-l border-emerald-200 pl-4">Sedekah: <strong>{summary.totalSedekahAll.toFixed(2)} kg</strong></span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <CalendarDays className="size-4 text-emerald-600" />
              <Label className="text-sm font-medium text-emerald-800">Periode</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[180px] bg-white border-emerald-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="1m">1 Bulan Terakhir</SelectItem>
                  <SelectItem value="3m">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="6m">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="1y">1 Tahun Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="hidden print:block text-sm font-bold text-emerald-800">
              Periode: {range === 'all' ? 'Semua Waktu' : range === '1m' ? '1 Bulan Terakhir' : range === '3m' ? '3 Bulan Terakhir' : range === '6m' ? '6 Bulan Terakhir' : '1 Tahun Terakhir'}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Recycle className="size-10 text-emerald-200" />}
              text="Tidak ada data penyetoran pada periode ini"
            />
          ) : (
            <div className="p-4 sm:p-6 space-y-8">
              {/* Visualisasi Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:space-y-8">
                
                {/* Bar Chart */}
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm print:break-inside-avoid">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart2 className="size-5 text-emerald-600" />
                    <h3 className="font-bold text-emerald-900">Perbandingan Nabung & Sedekah</h3>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#047857', fontSize: 12 }} 
                          dy={10} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#047857', fontSize: 12 }}
                          tickFormatter={(value) => `${value}kg`}
                        />
                        <Tooltip 
                          cursor={{ fill: '#ecfdf5' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #a7f3d0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="Nabung" fill="#10b981" radius={[4, 4, 0, 0]} name="Nabung (kg)" />
                        <Bar dataKey="Sedekah" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Sedekah (kg)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm print:break-inside-avoid">
                  <div className="mb-4 flex items-center gap-2">
                    <PieChartIcon className="size-5 text-emerald-600" />
                    <h3 className="font-bold text-emerald-900">Distribusi Total Volume (kg)</h3>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="Total"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${Number(value).toFixed(2)} kg`, 'Total']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #a7f3d0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Tabel Rincian */}
              <div className="print:break-before-page">
                <h3 className="mb-4 font-bold text-emerald-900 flex items-center gap-2 border-b border-emerald-100 pb-2">
                  Rincian Data Tabel
                </h3>
                <Accordion type="multiple" defaultValue={data.map((_, i) => `item-${i}`)} className="w-full space-y-3 print:space-y-4">
                  {data.map((category, i) => (
                  <AccordionItem 
                    key={category.categoryId || category.categoryName || i} 
                    value={`item-${i}`}
                    className="border border-emerald-100 rounded-lg px-4 bg-white data-[state=open]:shadow-sm data-[state=open]:border-emerald-300 transition-all print:border-emerald-200 print:shadow-none print:break-inside-avoid"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <h3 className="text-base font-semibold text-emerald-900">{category.categoryName}</h3>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {category.totalWeight.toFixed(2)} kg
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 print:block">
                      <div className="rounded-md border border-emerald-50 bg-emerald-50/20 overflow-hidden print:bg-white print:border-emerald-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-emerald-800 h-9 text-xs">Jenis Sampah</TableHead>
                              <TableHead className="text-emerald-800 h-9 text-right text-xs">Nabung</TableHead>
                              <TableHead className="text-emerald-800 h-9 text-right text-xs">Sedekah</TableHead>
                              <TableHead className="text-emerald-800 h-9 text-right text-xs">Total Berat</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.items.map((item: any, j: number) => (
                              <TableRow key={item.itemId || item.itemName || j} className="border-emerald-50 hover:bg-emerald-50/50">
                                <TableCell className="py-2 text-sm text-emerald-950 font-medium">
                                  {item.itemName}
                                </TableCell>
                                <TableCell className="py-2 text-sm text-emerald-700 text-right">
                                  {item.totalNabung.toFixed(2)} {item.unit}
                                </TableCell>
                                <TableCell className="py-2 text-sm text-emerald-700 text-right">
                                  {item.totalSedekah.toFixed(2)} {item.unit}
                                </TableCell>
                                <TableCell className="py-2 text-sm text-emerald-700 text-right font-semibold">
                                  {item.totalWeight.toFixed(2)} {item.unit}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                </Accordion>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
