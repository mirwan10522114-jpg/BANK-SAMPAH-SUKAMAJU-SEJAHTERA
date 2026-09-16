const fs = require('fs');

const src = fs.readFileSync('src/frontend/components/modules/koperasi.tsx', 'utf-8');
const lines = src.split('\n');

const startIdx = lines.findIndex(l => l.includes('// ============================ PENARIKAN SUKARELA TAB ============================'));
const endIdx = lines.findIndex(l => l.includes('// ============================ PENGATURAN KOPERASI TAB ============================'));

const extracted = lines.slice(startIdx, endIdx).join('\n');

const header = [
  "'use client'",
  "import { useCallback, useEffect, useState } from 'react'",
  "import { toast } from 'sonner'",
  "import { api } from '@/lib/api'",
  "import { cn } from '@/lib/utils'",
  "import { formatRupiah, formatDateTime, toNumber } from '@/lib/format'",
  "import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'",
  "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'",
  "import { Button } from '@/components/ui/button'",
  "import { Input } from '@/components/ui/input'",
  "import { Label } from '@/components/ui/label'",
  "import { Textarea } from '@/components/ui/textarea'",
  "import { Badge } from '@/components/ui/badge'",
  "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'",
  "import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'",
  "import { Skeleton } from '@/components/ui/skeleton'",
  "import { Search, Loader2, ArrowUpRight, ArrowDownRight, WalletCards, Wallet, Landmark, HandCoins, History } from 'lucide-react'",
  "",
  "// ===================== Main Component =====================",
  "export function FinansialKoperasi() {",
  "  const [tab, setTab] = useState('penarikan')",
  "",
  "  return (",
  "    <div className=\"space-y-4\">",
  "      <Tabs value={tab} onValueChange={setTab}>",
  "        <TabsList className=\"bg-emerald-100/60 p-1 h-auto flex flex-wrap\">",
  "          <TabsTrigger",
  "            value=\"penarikan\"",
  "            className=\"data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-800 gap-1.5\"",
  "          >",
  "            <HandCoins className=\"size-4\" />",
  "            Penarikan Sukarela",
  "          </TabsTrigger>",
  "          <TabsTrigger",
  "            value=\"kas\"",
  "            className=\"data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-800 gap-1.5\"",
  "          >",
  "            <Landmark className=\"size-4\" />",
  "            Buku Kas Koperasi",
  "          </TabsTrigger>",
  "        </TabsList>",
  "",
  "        <TabsContent value=\"penarikan\">",
  "          <PenarikanTab />",
  "        </TabsContent>",
  "        <TabsContent value=\"kas\">",
  "          <KasTab />",
  "        </TabsContent>",
  "      </Tabs>",
  "    </div>",
  "  )",
  "}",
  ""
].join('\n');

fs.writeFileSync('src/frontend/components/modules/finansial-koperasi.tsx', header + '\n' + extracted, 'utf-8');

const newSrc = [...lines.slice(0, startIdx), ...lines.slice(endIdx)].join('\n');
fs.writeFileSync('src/frontend/components/modules/koperasi.tsx', newSrc, 'utf-8');
console.log('Success!');
