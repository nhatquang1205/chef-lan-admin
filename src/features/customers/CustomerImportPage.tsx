import { Download, FileUp, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api/client'
import { createCustomerForImport, invalidateCustomers } from '@/lib/api/customers'
import { messageFor } from '@/lib/api/errors'
import { useUnsavedChangesPrompt } from '@/lib/useUnsavedChangesPrompt'

const MAX_ROWS = 300
const NAME_HEADERS = ['ten', 'tên', 'name']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RowStatus = 'invalid' | 'pending' | 'creating' | 'created' | 'mailFailed' | 'skipped' | 'error' | 'notRun'

interface ImportRow {
  line: number
  email: string
  name: string
  facebook: string
  problems: string[]
  status: RowStatus
  message?: string
}

type Phase = 'idle' | 'preview' | 'running' | 'done'

const normalize = (value: string) => value.replace(/^﻿/, '').trim().normalize('NFC').toLowerCase()

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseCsv(text: string): { rows: ImportRow[] } | { error: string } {
  // Files edited by hand often mix CRLF and LF; Papa guesses the line ending from the first line only, so normalise first.
  const result = Papa.parse<Record<string, string>>(text.replace(/\r\n?/g, '\n'), {
    header: true,
    newline: '\n',
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';'],
    transformHeader: normalize,
  })
  const fields = result.meta.fields ?? []
  const nameKey = fields.find((f) => NAME_HEADERS.includes(f))
  if (!fields.includes('email') || !nameKey) {
    return { error: 'Dòng đầu tiên phải có các cột email và ten (có thể thêm cột facebook). Hãy tải file mẫu để xem định dạng.' }
  }
  if (result.data.length === 0) return { error: 'File không có dòng dữ liệu nào.' }
  if (result.data.length > MAX_ROWS) {
    return { error: `File có ${result.data.length} dòng, vượt quá giới hạn ${MAX_ROWS} dòng mỗi lần. Hãy chia nhỏ file.` }
  }

  const seen = new Map<string, number>()
  const rows = result.data.map((record, index): ImportRow => {
    const line = index + 2
    const email = (record.email ?? '').trim()
    const name = (record[nameKey] ?? '').trim()
    const facebook = (record.facebook ?? '').trim()
    const problems: string[] = []

    if (!email) problems.push('Thiếu email.')
    else if (email.length > 254 || !EMAIL_RE.test(email)) problems.push('Email không hợp lệ.')
    else {
      const key = email.toLowerCase()
      const first = seen.get(key)
      if (first !== undefined) problems.push(`Trùng email với dòng ${first}.`)
      else seen.set(key, line)
    }
    if (!name) problems.push('Thiếu tên.')
    else if (name.length > 200) problems.push('Tên quá dài (tối đa 200 ký tự).')
    if (facebook && (facebook.length > 500 || !isHttpUrl(facebook))) {
      problems.push('Link Facebook phải bắt đầu bằng http:// hoặc https://.')
    }

    return {
      line,
      email,
      name,
      facebook,
      problems,
      status: problems.length > 0 ? 'invalid' : 'pending',
      message: problems.join(' ') || undefined,
    }
  })
  return { rows }
}

const STATUS_LABEL: Record<RowStatus, string> = {
  invalid: 'Bỏ qua',
  pending: 'Chờ',
  creating: 'Đang tạo…',
  created: 'Đã tạo, đã gửi mời',
  mailFailed: 'Đã tạo, chưa gửi được mail',
  skipped: 'Bỏ qua (email đã có)',
  error: 'Lỗi',
  notRun: 'Chưa chạy',
}

const STATUS_VARIANT: Record<RowStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  invalid: 'destructive',
  pending: 'outline',
  creating: 'secondary',
  created: 'default',
  mailFailed: 'secondary',
  skipped: 'outline',
  error: 'destructive',
  notRun: 'outline',
}

export default function CustomerImportPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const stopRef = useRef(false)
  const running = phase === 'running'

  useUnsavedChangesPrompt(running)

  useEffect(() => {
    if (!running) return
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest('a[href]')
      if (!link || link.getAttribute('target') === '_blank') return
      if (!window.confirm('Đang tạo khách hàng. Rời trang sẽ dừng việc nhập. Bạn có chắc muốn rời đi?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [running])

  useEffect(() => {
    return () => {
      stopRef.current = true
    }
  }, [])

  const update = (line: number, changes: Partial<ImportRow>) =>
    setRows((current) => current.map((r) => (r.line === line ? { ...r, ...changes } : r)))

  async function onFile(file: File | undefined) {
    if (!file) return
    setParseError(null)
    const text = await file.text()
    if (text.includes('�')) {
      setParseError('Không đọc được tiếng Việt trong file. Hãy lưu file với định dạng CSV UTF-8 rồi chọn lại.')
      return
    }
    const parsed = parseCsv(text)
    if ('error' in parsed) {
      setParseError(parsed.error)
      return
    }
    setFileName(file.name)
    setRows(parsed.rows)
    setPhase('preview')
  }

  async function start() {
    stopRef.current = false
    setPhase('running')
    const queue = rows.filter((r) => r.status === 'pending')
    for (const row of queue) {
      if (stopRef.current) break
      update(row.line, { status: 'creating' })
      try {
        const saved = await createCustomerForImport({
          fullName: row.name,
          email: row.email,
          phone: null,
          provinceCode: null,
          facebookProfileUrl: row.facebook || null,
          note: null,
          sendInvite: true,
        })
        if (saved.inviteError) update(row.line, { status: 'mailFailed', message: 'Có thể gửi lại lời mời ở trang khách hàng.' })
        else update(row.line, { status: 'created', message: undefined })
      } catch (error) {
        if (error instanceof ApiError && error.code === 'customer.email_already_used') {
          update(row.line, { status: 'skipped', message: 'Email này đã có trong hệ thống.' })
        } else {
          update(row.line, { status: 'error', message: messageFor(error) })
        }
      }
    }
    const stopped = stopRef.current
    if (stopped) {
      setRows((current) => current.map((r) => (r.status === 'pending' ? { ...r, status: 'notRun' } : r)))
    }
    setPhase('done')
    await invalidateCustomers()
  }

  function reset() {
    setPhase('idle')
    setRows([])
    setFileName('')
    setParseError(null)
  }

  const count = (status: RowStatus) => rows.filter((r) => r.status === status).length
  const total = rows.filter((r) => r.problems.length === 0).length
  const finished = rows.filter((r) => ['created', 'mailFailed', 'skipped', 'error'].includes(r.status)).length
  const invalid = count('invalid')

  return (
    <>
      <PageHeader
        title="Nhập khách hàng từ CSV"
        description="Tạo khách hàng hàng loạt và gửi email mời cho từng người."
        breadcrumb={[{ label: 'Khách hàng', to: '/customers' }, { label: 'Nhập từ CSV' }]}
      />

      {phase === 'idle' && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Tải file mẫu và điền mỗi khách một dòng: email, ten, facebook (link, có thể để trống).</li>
              <li>Lưu file ở định dạng CSV UTF-8 (dấu phẩy hoặc chấm phẩy đều được), tối đa {MAX_ROWS} dòng.</li>
              <li>Chọn file, kiểm tra bản xem trước rồi bấm tạo. Mỗi khách sẽ nhận một email mời.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href="/customers-import-template.csv" download="customers-import-template.csv">
                  <Download data-icon="inline-start" />
                  Tải file mẫu
                </a>
              </Button>
              <Button asChild>
                <label className="cursor-pointer">
                  <FileUp data-icon="inline-start" />
                  Chọn file CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      void onFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
              </Button>
            </div>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </CardContent>
        </Card>
      )}

      {phase !== 'idle' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-medium">{fileName}</span> · {rows.length} dòng · {total} hợp lệ
                  {invalid > 0 && <span className="text-destructive"> · {invalid} sẽ bị bỏ qua</span>}
                </p>
                <div className="flex gap-2">
                  {phase === 'preview' && (
                    <>
                      <Button variant="outline" onClick={reset}>
                        Chọn file khác
                      </Button>
                      <Button disabled={total === 0} onClick={() => setConfirmOpen(true)}>
                        Tạo và gửi lời mời
                      </Button>
                    </>
                  )}
                  {running && (
                    <Button variant="outline" onClick={() => (stopRef.current = true)}>
                      Dừng
                    </Button>
                  )}
                  {phase === 'done' && (
                    <>
                      <Button variant="outline" onClick={reset}>
                        Nhập file khác
                      </Button>
                      <Button asChild>
                        <Link to="/customers">Về danh sách khách hàng</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {(running || phase === 'done') && (
                <>
                  <Progress value={total === 0 ? 0 : (finished / total) * 100} className="h-2" />
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    {running && <Loader2 className="size-4 animate-spin" />}
                    {running ? `Đang xử lý ${finished} / ${total}. Đừng đóng trang này.` : `Đã xử lý ${finished} / ${total}.`}
                  </p>
                </>
              )}

              {phase === 'done' && (
                <p className="text-sm">
                  Đã tạo và gửi mời: <b>{count('created')}</b> · Đã tạo nhưng chưa gửi được mail: <b>{count('mailFailed')}</b> · Bỏ qua
                  (email đã có): <b>{count('skipped')}</b> · Lỗi: <b>{count('error')}</b> · Dòng không hợp lệ: <b>{invalid}</b>
                  {count('notRun') > 0 && (
                    <>
                      {' '}
                      · Chưa chạy: <b>{count('notRun')}</b>
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Facebook</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.line}>
                    <TableCell>{row.line}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell>{row.name || '—'}</TableCell>
                    <TableCell className="max-w-48 truncate">{row.facebook || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                        {row.message && <span className="text-xs text-muted-foreground">{row.message}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tạo khách hàng và gửi lời mời?"
        description={`Sẽ tạo ${total} khách hàng và gửi email mời đến từng địa chỉ. Email không thu hồi được.`}
        confirmLabel="Tạo và gửi"
        onConfirm={async () => {
          void start()
        }}
      />
    </>
  )
}
